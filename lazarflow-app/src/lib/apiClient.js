import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authEvents } from './authEvents';

// Use 10.0.2.2 for Android Emulator, localhost for iOS Simulator
const BASE_URL ='https://www.api.lazarflow.app'; 

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: 300000, // 30 seconds - much more reasonable than 5 minutes
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'ngrok-skip-browser-warning': 'true',
    },
});

// Cache tokens in memory to avoid constant AsyncStorage reads
let cachedToken = null;
let cachedExpiry = null;

// Variables for managing token refresh queue
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
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
            // Only read from storage if memory cache is empty
            if (!cachedToken) {
                cachedToken = await AsyncStorage.getItem('access_token');
                cachedExpiry = await AsyncStorage.getItem('token_expiry');
            }
            
            // 1. Proactive Refresh Logic
            if (cachedToken && cachedExpiry) {
                const now = Date.now();
                const timeToExpiry = parseInt(cachedExpiry) - now;
                
                // If the token expires in less than 60 seconds (or is already expired)
                if (timeToExpiry < 60000 && !config.url.includes('/api/auth/refresh')) {
                    console.log(`🕒 Token status: ${timeToExpiry < 0 ? 'Expired' : 'Expiring soon'}. Proactively refreshing...`);
                    try {
                        const { authService } = require('./authService');
                        // Use the shared refresh queue in refreshToken
                        const result = await authService.refreshToken();
                        const newToken = result?.session?.access_token || result?.data?.session?.access_token;
                        if (newToken) {
                            cachedToken = newToken;
                            cachedExpiry = await AsyncStorage.getItem('token_expiry');
                            config.headers.Authorization = `Bearer ${newToken}`;
                            return config;
                        }
                    } catch (e) {
                        console.warn('🕒 Proactive refresh failed, proceeding to let response interceptor handle it');
                    }
                }
            }

            if (cachedToken) {
                let cleanToken = cachedToken.trim().replace(/^"|"$/g, '');
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

// Clear cache on SIGNED_OUT
authEvents.on('SIGNED_OUT', () => {
    cachedToken = null;
    cachedExpiry = null;
});

// Update cache on SIGNED_IN
authEvents.on('SIGNED_IN', (data) => {
    if (data?.session?.access_token) {
        cachedToken = data.session.access_token;
        if (data.session.expires_in) {
            cachedExpiry = String(Date.now() + (data.session.expires_in * 1000));
        }
    }
});

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
                const newToken = result?.session?.access_token || result?.data?.session?.access_token;

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

        // 3. Automatic Retry for Transient Failures (GET requests only)
        const isNetworkError = !error.response && error.code !== 'ECONNABORTED';
        const isRetryableStatus = error.response?.status >= 500;
        const isGetRequest = originalRequest?.method?.toLowerCase() === 'get';

        if ((isNetworkError || isRetryableStatus) && isGetRequest) {
            originalRequest._retryCount = originalRequest._retryCount || 0;

            if (originalRequest._retryCount < MAX_RETRIES) {
                originalRequest._retryCount += 1;
                console.log(`🔄 Retrying request (${originalRequest._retryCount}/${MAX_RETRIES}): ${originalRequest.url}`);
                
                // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * originalRequest._retryCount));
                return apiClient(originalRequest);
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;
