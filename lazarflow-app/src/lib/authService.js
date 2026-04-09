import apiClient from './apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authEvents } from './authEvents';
import { unregisterPushToken } from './dataService';
import axios from 'axios';
import { supabase } from './supabaseClient';

// Shared promise to prevent multiple parallel refresh attempts (refresh collision)
let refreshPromise = null;

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
        // Use a shared promise to prevent "refresh collision"
        if (refreshPromise) {
            console.log('🔄 Token refresh already in progress, joining queue...');
            return refreshPromise;
        }

        refreshPromise = (async () => {
            try {
                console.log('🔄 Attempting to refresh token via Supabase...');
                
                const { data, error } = await supabase.auth.refreshSession();
                
                if (error) {
                    console.warn('Supabase refresh failed, falling back to manual refresh...');
                    const refreshToken = await AsyncStorage.getItem('refresh_token');
                    if (!refreshToken) throw new Error('No refresh token available');

                    const refreshApiClient = axios.create({
                        baseURL: apiClient.defaults.baseURL,
                        timeout: 15000, // Shorter timeout for refresh
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
                // If refresh token is invalid (often after 10 days), emit sign out
                if (error.response?.status === 400 || error.message?.includes('invalid refresh token') || error.message?.includes('Invalid Refresh Token')) {
                    console.log('🚪 Session unusable, triggering sign out.');
                    authEvents.emit('SIGNED_OUT');
                }
                throw error;
            } finally {
                refreshPromise = null;
            }
        })();

        return refreshPromise;
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
            // If we're refreshing, wait for it
            if (refreshPromise) await refreshPromise;

            const response = await apiClient.get('/api/auth/me');
            if (response.data?.user && Object.keys(response.data.user).length > 0) {
                return response.data.user;
            }
            
            const { data: { user: sbUser } } = await supabase.auth.getUser();
            return sbUser;
        } catch (error) {
            console.error('👤 getMe failed:', error.message);
            
            // If it failed with 401, it's likely apiClient is already handling a refresh
            // We can try one more time if a new token was just obtained
            if (error.response?.status === 401) {
                console.log('👤 getMe: Retrying after 401...');
                try {
                    const response = await apiClient.get('/api/auth/me');
                    return response.data?.user;
                } catch (retryError) {
                    console.error('👤 getMe retry failed:', retryError.message);
                }
            }
            throw error;
        }
    },

    async refreshSession() {
        return this.refreshToken();
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
