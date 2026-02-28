import apiClient from './apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authEvents } from './authEvents';
import { unregisterPushToken } from './dataService';

export const authService = {
    async register(email, password, data = null) {
        const payload = { email, password };
        if (data) {
            payload.data = data;
        }
        const response = await apiClient.post('/api/auth/register', payload);
        // Auto login after register if backend returns session, else user needs to login
        if (response.data?.session?.access_token) {
            console.log('💾 Storing access token from register...');
            await AsyncStorage.setItem('access_token', response.data.session.access_token);
            if (response.data.session.refresh_token) {
                console.log('💾 Storing refresh token from register...');
                await AsyncStorage.setItem('refresh_token', response.data.session.refresh_token);
            }
            if (response.data.session.expires_in) {
                console.log('💾 Storing expiry from register...');
                await AsyncStorage.setItem('expires_in', String(response.data.session.expires_in));
            }
            authEvents.emit('SIGNED_IN', response.data);
        }
        return response.data;
    },

    async login(email, password) {
        const response = await apiClient.post('/api/auth/login', { email, password });
        if (response.data?.session?.access_token) {
            const token = response.data.session.access_token;
            
            console.log('💾 LOGIN RESPONSE:');
            console.log('   Full Token:', token);
            console.log('   Token Length:', token.length);
            console.log('   Token Parts:', token.split('.').length);
            console.log('   Token Preview:', token.substring(0, 50));
            console.log('   Token End:', token.substring(token.length - 30));
            
            await AsyncStorage.setItem('access_token', token);
            
            const savedToken = await AsyncStorage.getItem('access_token');
            console.log('💾 STORED TOKEN VERIFICATION:');
            console.log('   Stored:', savedToken?.substring(0, 50));
            console.log('   Match:', token === savedToken ? 'YES ✅' : 'NO ❌');
            
            if (response.data.session.refresh_token) {
                console.log('💾 Storing refresh token...');
                await AsyncStorage.setItem('refresh_token', response.data.session.refresh_token);
            }
            if (response.data.session.expires_in) {
                console.log('💾 Storing expiry:', response.data.session.expires_in);
                await AsyncStorage.setItem('expires_in', String(response.data.session.expires_in));
            }
            authEvents.emit('SIGNED_IN', response.data);
        } else {
            console.warn('⚠️ No access token found in login response');
            console.warn('   Response data:', response.data);
        }
        return response.data;
    },

    async refreshToken() {
        try {
            console.log('🔄 Attempting to refresh token...');
            const refreshToken = await AsyncStorage.getItem('refresh_token');
            
            if (!refreshToken) {
                console.error('❌ No refresh token available');
                throw new Error('No refresh token available');
            }

            const response = await apiClient.post('/api/auth/refresh', {
                refresh_token: refreshToken
            });

            if (response.data?.session?.access_token) {
                console.log('✅ Token refreshed successfully');
                await AsyncStorage.setItem('access_token', response.data.session.access_token);
                
                if (response.data.session.refresh_token) {
                    await AsyncStorage.setItem('refresh_token', response.data.session.refresh_token);
                }
                
                if (response.data.session.expires_in) {
                    await AsyncStorage.setItem('expires_in', String(response.data.session.expires_in));
                }
                
                return response.data;
            } else {
                throw new Error('No access token in refresh response');
            }
        } catch (error) {
            console.error('❌ Token refresh failed:', error.message);
            // If refresh fails, logout the user
            await this.logout();
            throw error;
        }
    },

    async logout() {
        try {
            // Unregister push token before logout (identifies user via access_token)
            console.log('🧹 authService: Unregistering push token before logout...');
            await unregisterPushToken();
            
            await apiClient.post('/api/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            await AsyncStorage.removeItem('access_token');
            await AsyncStorage.removeItem('refresh_token');
            await AsyncStorage.removeItem('expires_in');
            await AsyncStorage.removeItem('last_push_token');
            authEvents.emit('SIGNED_OUT');
        }
    },

    async getMe() {
        try {
            const response = await apiClient.get('/api/auth/me');
            console.log('👤 User response:', JSON.stringify(response.data, null, 2));
            
            // Handle empty response
            if (response.data?.user && Object.keys(response.data.user).length > 0) {
                return response.data.user;
            }
            
            // If empty, return null
            console.log('👤 Empty response from /api/auth/me');
            return null;
        } catch (error) {
            console.error('👤 getMe failed:', error.message);
            throw error;
        }
    },

    async refreshSession() {
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        if (!refreshToken) throw new Error('No refresh token');
        
        const response = await apiClient.post('/api/auth/refresh', { refresh_token: refreshToken });
        if (response.data?.session?.access_token) {
            await AsyncStorage.setItem('access_token', response.data.session.access_token);
            if (response.data.session.refresh_token) {
                await AsyncStorage.setItem('refresh_token', response.data.session.refresh_token);
            }
            if (response.data.session.expires_in) {
                await AsyncStorage.setItem('expires_in', String(response.data.session.expires_in));
            }
        }
        return response.data;
    },
    
    async getSession() {
        const token = await AsyncStorage.getItem('access_token');
        if (!token) {
            console.log('🔍 getSession: No token found');
            return { data: { session: null } };
        }
        console.log('🔍 getSession: Token retrieved successfully');
        return { data: { session: { access_token: token } } };
    }
};
