import apiClient from './apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authEvents } from './authEvents';

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
            console.log('💾 Storing access token...');
            await AsyncStorage.setItem('access_token', response.data.session.access_token);
            if (response.data.session.refresh_token) {
                console.log('💾 Storing refresh token...');
                await AsyncStorage.setItem('refresh_token', response.data.session.refresh_token);
            }
            if (response.data.session.expires_in) {
                console.log('💾 Storing expiry...');
                await AsyncStorage.setItem('expires_in', String(response.data.session.expires_in));
            }
            authEvents.emit('SIGNED_IN', response.data);
        } else {
            console.warn('⚠️ No access token found in login response');
        }
        return response.data;
    },

    async logout() {
        try {
            await apiClient.post('/api/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            await AsyncStorage.removeItem('access_token');
            await AsyncStorage.removeItem('refresh_token');
            await AsyncStorage.removeItem('expires_in');
            authEvents.emit('SIGNED_OUT');
        }
    },

    async getMe() {
        try {
            const response = await apiClient.get('/api/auth/me');
            console.log('👤 /api/auth/me response:', JSON.stringify(response.data, null, 2));
            
            if (response.data?.user) {
                return response.data.user;
            }
            console.log('👤 getMe: No user in response data');
            return null;
        } catch (error) {
            console.error('👤 getMe: Error fetching user:', error.message);
            return null;
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
