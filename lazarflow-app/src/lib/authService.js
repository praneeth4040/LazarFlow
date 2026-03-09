import apiClient from './apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authEvents } from './authEvents';
import { unregisterPushToken } from './dataService';
import axios from 'axios';
import { supabase } from './supabaseClient';


export const authService = {
    async register(email, password, data = null) {
        const payload = { email, password };
        if (data) {
            payload.data = data;
        }
        const response = await apiClient.post('/api/auth/register', payload);
        
        // Use Supabase to handle the session session if provided
        if (response.data?.session?.access_token && response.data?.session?.refresh_token) {
            console.log('💾 Syncing register session with Supabase...');
            const { error } = await supabase.auth.setSession({
                access_token: response.data.session.access_token,
                refresh_token: response.data.session.refresh_token
            });
            
            if (error) console.error('Supabase setSession error:', error);

            // Keep local backups if still needed for interceptors, but Supabase is primary now
            await AsyncStorage.setItem('access_token', response.data.session.access_token);
            await AsyncStorage.setItem('refresh_token', response.data.session.refresh_token);
            
            if (response.data.session.expires_in) {
                const expiryTime = Date.now() + (response.data.session.expires_in * 1000);
                await AsyncStorage.setItem('token_expiry', String(expiryTime));
            }
            authEvents.emit('SIGNED_IN', response.data);
        }
        return response.data;
    },

    async login(email, password) {
        const response = await apiClient.post('/api/auth/login', { email, password });
        if (response.data?.session?.access_token && response.data?.session?.refresh_token) {
            const { access_token, refresh_token, expires_in } = response.data.session;
            
            console.log('💾 Syncing login session with Supabase...');
            const { error } = await supabase.auth.setSession({
                access_token,
                refresh_token
            });

            if (error) console.error('Supabase setSession error:', error);
            
            await AsyncStorage.setItem('access_token', access_token);
            await AsyncStorage.setItem('refresh_token', refresh_token);
            
            if (expires_in) {
                const expiryTime = Date.now() + (expires_in * 1000);
                await AsyncStorage.setItem('token_expiry', String(expiryTime));
            }
            authEvents.emit('SIGNED_IN', response.data);
        }
        return response.data;
    },

    async refreshToken() {
        try {
            console.log('🔄 Attempting to refresh token via Supabase...');
            
            const { data, error } = await supabase.auth.refreshSession();
            
            if (error) {
                console.warn('Supabase refresh failed, falling back to manual refresh...');
                // Fallback to manual if supabase fails for some reason
                const refreshToken = await AsyncStorage.getItem('refresh_token');
                if (!refreshToken) throw new Error('No refresh token available');

                const refreshApiClient = axios.create({
                    baseURL: apiClient.defaults.baseURL,
                    timeout: apiClient.defaults.timeout,
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                });

                const response = await refreshApiClient.post('/api/auth/refresh', {
                    refresh_token: refreshToken
                });

                if (response.data?.session?.access_token) {
                    const session = response.data.session;
                    await supabase.auth.setSession({
                        access_token: session.access_token,
                        refresh_token: session.refresh_token
                    });
                    
                    await AsyncStorage.setItem('access_token', session.access_token);
                    await AsyncStorage.setItem('refresh_token', session.refresh_token);
                    if (session.expires_in) {
                        const expiryTime = Date.now() + (session.expires_in * 1000);
                        await AsyncStorage.setItem('token_expiry', String(expiryTime));
                    }
                    return response.data;
                }
                throw error;
            }

            if (data?.session) {
                console.log('✅ Token refreshed successfully via Supabase');
                const { access_token, refresh_token, expires_in } = data.session;
                
                await AsyncStorage.setItem('access_token', access_token);
                await AsyncStorage.setItem('refresh_token', refresh_token);
                if (expires_in) {
                    const expiryTime = Date.now() + (expires_in * 1000);
                    await AsyncStorage.setItem('token_expiry', String(expiryTime));
                }
                
                return data;
            }
            throw new Error('No session after refresh');
        } catch (error) {
            console.error('❌ Token refresh failed:', error.message);
            throw error;
        }
    },

    async logout() {
        try {
            console.log('🧹 authService: Logging out...');
            await unregisterPushToken().catch(e => console.warn('Push unregistration failed'));
            
            // Logout from Supabase
            await supabase.auth.signOut();
            
            await apiClient.post('/api/auth/logout').catch(e => console.warn('Backend logout call failed'));
        } catch (error) {
            console.error('Logout process error:', error);
        } finally {
            const keysToRemove = [
                'access_token', 
                'refresh_token', 
                'token_expiry', 
                'expires_in', 
                'last_push_token'
            ];
            await Promise.all(keysToRemove.map(key => AsyncStorage.removeItem(key)));
            authEvents.emit('SIGNED_OUT');
        }
    },

    async getMe() {
        try {
            const { data: { user: sbUser } } = await supabase.auth.getUser();
            
            const response = await apiClient.get('/api/auth/me');
            if (response.data?.user && Object.keys(response.data.user).length > 0) {
                return response.data.user;
            }
            return sbUser;
        } catch (error) {
            console.error('👤 getMe failed:', error.message);
            throw error;
        }
    },

    async refreshSession() {
        const { data, error } = await supabase.auth.refreshSession();
        if (error) throw error;
        
        if (data?.session) {
            await AsyncStorage.setItem('access_token', data.session.access_token);
            await AsyncStorage.setItem('refresh_token', data.session.refresh_token);
        }
        return data;
    },
    
    async getSession() {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            return { data: { session } };
        }
        
        const token = await AsyncStorage.getItem('access_token');
        if (!token) return { data: { session: null } };
        return { data: { session: { access_token: token } } };
    },

    async resetPasswordForEmail(email) {
        console.log('🔄 authService: Requesting password reset for:', email);
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: 'lazarflow://reset-password',
        });
        if (error) throw error;
        return data;
    },

    async updatePassword(newPassword) {
        console.log('🔄 authService: Updating user password...');
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword
        });
        if (error) throw error;
        return data;
    }
};
