import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authEvents } from './authEvents';

// Use production API
// const BASE_URL = 'https://api.lazarflow.app';
const BASE_URL = 'https://4a1447cb531c.ngrok-free.app';

const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: 300000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

apiClient.interceptors.request.use(
    async (config) => {
        try {
            const token = await AsyncStorage.getItem('access_token');
            if (token) {
                console.log('🔑 Token found in storage, adding to header');
                config.headers.Authorization = `Bearer ${token}`;
            } else {
                console.log('🔑 No token found in storage');
            }
        } catch (error) {
            console.error('Error getting session for API request:', error);
        }
        
        console.log(` Sending Request: ${config.method.toUpperCase()} ${config.baseURL}${config.url}`);
        return config;
    },
    (error) => {
        console.error('❌ Request Failed to send:', error);
        return Promise.reject(error);
    }
);

apiClient.interceptors.response.use(
    (response) => {
        console.log(`✅ Request Successful: ${response.config.method.toUpperCase()} ${response.config.url} (${response.status})`);
        // Log full response data for debugging as requested
        console.log(`📥 Full Response Data for ${response.config.url}:`, JSON.stringify(response.data, null, 2));
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        if (error.response) {
            console.error(`❌ Server Error (${error.response.status}) on ${originalRequest.method.toUpperCase()} ${originalRequest.url}:`, {
                data: error.response.data,
                status: error.response.status,
                headers: error.response.headers
            });
            // Log the full error response body as requested
            console.error(`📥 Error Response Body for ${originalRequest.url}:`, JSON.stringify(error.response.data, null, 2));

            // If 401 Unauthorized and not already retrying
            if (error.response.status === 401 && !originalRequest._retry) {
                originalRequest._retry = true;

                try {
                    console.log('🔄 Token expired, attempting to refresh...');
                    const refreshToken = await AsyncStorage.getItem('refresh_token');
                    
                    if (refreshToken) {
                        // Use a clean axios instance to avoid interceptor loop for refresh call
                        const response = await axios.post(`${BASE_URL}/api/auth/refresh`, { 
                            refresh_token: refreshToken 
                        });

                        if (response.data?.session?.access_token) {
                            const newToken = response.data.session.access_token;
                            console.log('✅ Token refreshed successfully');
                            
                            await AsyncStorage.setItem('access_token', newToken);
                            if (response.data.session.refresh_token) {
                                await AsyncStorage.setItem('refresh_token', response.data.session.refresh_token);
                            }
                            if (response.data.session.expires_in) {
                                await AsyncStorage.setItem('expires_in', String(response.data.session.expires_in));
                            }

                            // Update header and retry original request
                            originalRequest.headers.Authorization = `Bearer ${newToken}`;
                            return apiClient(originalRequest);
                        }
                    }
                } catch (refreshError) {
                    console.error('❌ Token refresh failed:', refreshError.message);
                    // Clear tokens and notify the app
                    await AsyncStorage.removeItem('access_token');
                    await AsyncStorage.removeItem('refresh_token');
                    authEvents.emit('SIGNED_OUT');
                }
            }
        } else {
            console.error('❌ Client/Network Error:', error.message);
        }
        return Promise.reject(error);
    }
);

export default apiClient;
