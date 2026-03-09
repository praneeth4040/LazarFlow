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
        'ngrok-skip-browser-warning': 'true',
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
            const expiry = await AsyncStorage.getItem('token_expiry');
            
            // 1. Proactive Refresh Logic
            // If the token expires in less than 60 seconds, refresh it now
            if (token && expiry) {
                const now = Date.now();
                const timeToExpiry = parseInt(expiry) - now;
                
                if (timeToExpiry < 60000 && !config.url.includes('/api/auth/refresh')) {
                    console.log('🕒 Token expiring soon. Proactively refreshing...');
                    try {
                        const { authService } = require('./authService');
                        const result = await authService.refreshToken();
                        const newToken = result.session?.access_token;
                        if (newToken) {
                            config.headers.Authorization = `Bearer ${newToken}`;
                            return config;
                        }
                    } catch (e) {
                        console.warn('🕒 Proactive refresh failed, proceeding to let response interceptor handle it');
                    }
                }
            }

            if (token) {
                let cleanToken = token.trim().replace(/^"|"$/g, '');
                if (cleanToken.toLowerCase().startsWith('bearer ')) {
                    cleanToken = cleanToken.substring(7).trim();
                }
                config.headers.Authorization = `Bearer ${cleanToken}`;
            }
            
        } catch (error) {
            console.error('❌ Request interceptor error:', error.message);
        }
        
        return config;
    },
    (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const detail = error.response?.data?.detail;
        const errorCode = typeof detail === 'object' ? detail?.code : null;

        // 1. Handle EXPIRED token with Silent Refresh
        if (error.response?.status === 401 && errorCode === 'AUTH_TOKEN_EXPIRED' && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return apiClient(originalRequest);
                }).catch(err => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const { authService } = require('./authService');
                console.log('🔄 Token expired (401). Attempting silent refresh...');
                const result = await authService.refreshToken();
                const newToken = result.session?.access_token;

                if (!newToken) throw new Error('No new token received');

                apiClient.defaults.headers.common.Authorization = `Bearer ${newToken}`;
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                
                processQueue(null, newToken);
                return apiClient(originalRequest);

            } catch (refreshError) {
                console.error('❌ Silent refresh failed:', refreshError.message);
                processQueue(refreshError, null);
                authEvents.emit('SIGNED_OUT');
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        // 2. Handle INVALID or FAILED refresh by logging out immediately
        if (errorCode === 'AUTH_INVALID_TOKEN' || errorCode === 'AUTH_REFRESH_FAILED') {
            console.error(`🚨 Critical Auth Failure: ${errorCode}. Logging out.`);
            authEvents.emit('SIGNED_OUT');
            return Promise.reject(error);
        }

        // Log other errors
        if (error.response) {
            console.error(`❌ [${error.response.status}] ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`);
            console.error(`   Response Error:`, error.response.data);
        }

        return Promise.reject(error);
    }
);

export default apiClient;
