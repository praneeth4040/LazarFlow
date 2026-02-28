import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authEvents } from './authEvents';

const BASE_URL = 'https://6817-2401-4900-1cb2-fecc-681a-3d8e-6a49-ec5f.ngrok-free.app';

const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: 300000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'ngrok-skip-browser-warning': 'true',
    },
});

// Flag to prevent multiple simultaneous refresh attempts
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
                // Clean token
                let cleanToken = token.trim();
                if (cleanToken.startsWith('"') && cleanToken.endsWith('"')) {
                    cleanToken = cleanToken.substring(1, cleanToken.length - 1);
                }
                
                // Strip 'Bearer ' prefix if present to avoid duplication
                if (cleanToken.toLowerCase().startsWith('bearer ')) {
                    cleanToken = cleanToken.substring(7).trim();
                }
                
                // Send EXACTLY as backend expects: Authorization: Bearer <token>
                config.headers.Authorization = `Bearer ${cleanToken}`;
                
                console.log(`🔐 [${config.method.toUpperCase()}] ${config.url}`);
                console.log(`   Token sent: Bearer ${cleanToken.substring(0, 30)}...`);
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
    (response) => {
        console.log(`✅ [${response.status}] ${response.config.method.toUpperCase()} ${response.config.url}`);
        console.log(`   Response data:`, JSON.stringify(response.data).substring(0, 100));
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // Log error details with request headers
        if (error.response) {
            console.error(`❌ [${error.response.status}] ${originalRequest.method.toUpperCase()} ${originalRequest.url}`);
            console.error(`   Request Headers Sent:`, JSON.stringify({
                Authorization: originalRequest.headers.Authorization?.substring(0, 50),
                'Content-Type': originalRequest.headers['Content-Type'],
                'X-Token': originalRequest.headers['X-Token']
            }));
            console.error(`   Response Error:`, error.response.data);

            // Handle 401 Unauthorized - attempt token refresh
            if (error.response.status === 401 && !originalRequest._retry) {
                if (isRefreshing) {
                    // Queue this request to retry after refresh completes
                    return new Promise((resolve, reject) => {
                        failedQueue.push({ resolve, reject });
                    }).then(token => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return apiClient(originalRequest);
                    }).catch(err => {
                        return Promise.reject(err);
                    });
                }

                // Mark as retry attempt
                originalRequest._retry = true;
                isRefreshing = true;

                try {
                    // Import authService here to avoid circular dependency
                    const { authService } = require('./authService');
                    
                    console.log('🔄 Token expired. Attempting refresh...');
                    const result = await authService.refreshToken();
                    
                    const newToken = result.session?.access_token;
                    if (newToken) {
                        apiClient.defaults.headers.common.Authorization = `Bearer ${newToken}`;
                        originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        processQueue(null, newToken);
                        isRefreshing = false;
                        
                        console.log('🔄 Retrying original request with new token...');
                        return apiClient(originalRequest);
                    } else {
                        throw new Error('No token in refresh response');
                    }
                } catch (refreshError) {
                    console.error('❌ Token refresh failed:', refreshError.message);
                    processQueue(refreshError, null);
                    isRefreshing = false;
                    
                    // Emit logout event to trigger app navigation to login
                    authEvents.emit('SIGNED_OUT');
                    return Promise.reject(refreshError);
                }
            }
        } else if (error.request) {
            console.error(`❌ No response received:`, error.message);
        } else {
            console.error(`❌ Error:`, error.message);
        }

        return Promise.reject(error);
    }
);

export default apiClient;
