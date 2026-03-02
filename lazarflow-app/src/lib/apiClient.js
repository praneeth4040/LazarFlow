import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authEvents } from './authEvents';

const BASE_URL = 'https://www.api.lazarflow.app';

const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: 300000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// --- Start of Refresh Logic ---

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

apiClient.interceptors.request.use(
    async (config) => {
        try {
            const token = await AsyncStorage.getItem('access_token');
            
            if (token) {
                let cleanToken = token.trim().replace(/^"|"$/g, '');
                if (cleanToken.toLowerCase().startsWith('bearer ')) {
                    cleanToken = cleanToken.substring(7).trim();
                }
                config.headers.Authorization = `Bearer ${cleanToken}`;
                
                console.log(`🔐 [${config.method.toUpperCase()}] ${config.url}`);
            } else {
                console.log(`⚠️ [${config.method.toUpperCase()}] ${config.url} - No token`);
            }
            
        } catch (error) {
            console.error('❌ Interceptor error:', error.message);
        }
        
        return config;
    },
    (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                // If a refresh is already in progress, queue this request
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return apiClient(originalRequest); // Retry the original request
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Use require here to avoid circular dependencies
                const { authService } = require('./authService');
                
                console.log('🔄 Token expired. Attempting refresh...');
                const result = await authService.refreshToken();
                
                const newToken = result.session?.access_token;

                if (!newToken) {
                    throw new Error('No new token received from refresh endpoint');
                }

                // Update the default headers and the original request
                apiClient.defaults.headers.common.Authorization = `Bearer ${newToken}`;
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                
                // Process the queue with the new token
                processQueue(null, newToken);

                // Retry the original request that initiated the refresh
                return apiClient(originalRequest);

            } catch (refreshError) {
                console.error('❌ Token refresh failed:', refreshError.message);
                processQueue(refreshError, null);
                
                // If refresh fails, emit a global sign-out event
                authEvents.emit('SIGNED_OUT');
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        // Log other errors
        if (error.response) {
            console.error(`❌ [${error.response.status}] ${originalRequest.method.toUpperCase()} ${originalRequest.url}`);
            console.error(`   Response Error:`, error.response.data);
        } else if (error.request) {
            console.error(`❌ No response received:`, error.message);
        } else {
            console.error(`❌ Error setting up request:`, error.message);
        }

        return Promise.reject(error);
    }
);

export default apiClient;
