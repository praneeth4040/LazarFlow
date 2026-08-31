import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authEvents } from './authEvents';
import { supabase } from './supabaseClient';

const BASE_URL = 'https://www.api.lazarflow.app';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: 300000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// ── In-memory token cache ────────────────────────────────────────────────────
// cachedExpiry is always kept in sync with Supabase's own session so the
// proactive refresh check never fires against a stale manual timestamp.
let cachedToken = null;
let cachedExpiry = null;

// ── Single refresh-in-flight flag (shared across request + response interceptors)
// This is the ONLY gate — authService has its own refreshPromise that
// deduplicates the Supabase call itself, so two layers of locking no longer
// race against each other.
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
        if (error) prom.reject(error);
        else prom.resolve(token);
    });
    failedQueue = [];
};

// ── Keep cache in sync with Supabase's own session (covers auto-refresh) ──────
// This is the single source of truth for cachedToken / cachedExpiry.
// By reading expires_at from Supabase's session we avoid the "stale manual
// token_expiry" problem that was causing spurious proactive refreshes.
supabase.auth.onAuthStateChange((event, session) => {
    if ((event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') && session?.access_token) {
        cachedToken = session.access_token;
        // expires_at is a Unix epoch in seconds from Supabase
        cachedExpiry = session.expires_at ? String(session.expires_at * 1000) : cachedExpiry;
    }
    if (event === 'SIGNED_OUT') {
        cachedToken = null;
        cachedExpiry = null;
    }
});

// Also sync on manual SIGNED_IN (login / register flow)
authEvents.on('SIGNED_IN', (data) => {
    if (data?.session?.access_token) {
        cachedToken = data.session.access_token;
        if (data.session.expires_at) {
            cachedExpiry = String(data.session.expires_at * 1000);
        } else if (data.session.expires_in) {
            cachedExpiry = String(Date.now() + (data.session.expires_in * 1000));
        }
    }
});

authEvents.on('SIGNED_OUT', () => {
    cachedToken = null;
    cachedExpiry = null;
});

// ── Request interceptor ───────────────────────────────────────────────────────
apiClient.interceptors.request.use(
    async (config) => {
        config.metadata = { _requestStart: Date.now() };

        try {
            // Bootstrap from AsyncStorage on first request only
            if (!cachedToken) {
                // Prefer Supabase's own session — it's always fresh
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.access_token) {
                    cachedToken = session.access_token;
                    cachedExpiry = session.expires_at ? String(session.expires_at * 1000) : null;
                } else {
                    // Last-resort fallback to manual AsyncStorage key
                    cachedToken = await AsyncStorage.getItem('access_token');
                    cachedExpiry = await AsyncStorage.getItem('token_expiry');
                }
            }

            // Proactive refresh: only trigger when < 60 s to expiry AND we're not
            // already refreshing AND this isn't a refresh/auth request itself.
            if (
                cachedToken &&
                cachedExpiry &&
                !isRefreshing &&
                !config.url?.includes('/api/auth/')
            ) {
                const timeToExpiry = parseInt(cachedExpiry) - Date.now();
                if (timeToExpiry < 60_000) {
                    console.log(`🕒 Token ${timeToExpiry < 0 ? 'expired' : 'expiring soon'}, proactive refresh…`);
                    isRefreshing = true;
                    try {
                        const { authService } = require('./authService');
                        const result = await authService.refreshToken();
                        const newToken =
                            result?.session?.access_token ||
                            result?.data?.session?.access_token;
                        if (newToken) {
                            // cachedToken / cachedExpiry already updated by onAuthStateChange above
                            config.headers.Authorization = `Bearer ${newToken}`;
                            processQueue(null, newToken);
                            return config;
                        }
                    } catch (e) {
                        // Proactive refresh failed — let the response interceptor handle it
                        console.warn('🕒 Proactive refresh failed:', e.message);
                        processQueue(e, null);
                    } finally {
                        isRefreshing = false;
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

// ── Response interceptor ──────────────────────────────────────────────────────
apiClient.interceptors.response.use(
    (response) => {
        const ms = response.config?.metadata?._requestStart
            ? Date.now() - response.config.metadata._requestStart
            : null;
        const timing = ms != null ? ` (${ms}ms)` : '';
        const icon = response.status < 300 ? '✅' : '⚠️';
        console.log(`${icon} [CLIENT] ${response.config?.method?.toUpperCase()} ${response.config?.url} → ${response.status}${timing}`);
        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        const detailRaw = error.response?.data?.detail;
        let detail = detailRaw;

        // Backend occasionally returns Python-style string dicts
        if (
            typeof detailRaw === 'string' &&
            (detailRaw.includes('JWT expired') || detailRaw.includes('PGRST303'))
        ) {
            detail = { code: 'PGRST303', message: 'JWT expired' };
        }

        const errorCode = typeof detail === 'object' ? detail?.code : null;

        const isAuthExpired =
            (error.response?.status === 401 && errorCode === 'AUTH_TOKEN_EXPIRED') ||
            (error.response?.status === 500 && errorCode === 'PGRST303') ||
            (error.response?.status === 401 && detail?.message === 'JWT expired') ||
            // Plain 401 with no special code — also treat as expired, not invalid
            (error.response?.status === 401 && !errorCode &&
                errorCode !== 'AUTH_INVALID_TOKEN' && errorCode !== 'AUTH_REFRESH_FAILED');

        // ── Silent token refresh on 401 / PGRST303 ────────────────────────────
        if (isAuthExpired && !originalRequest._retry) {
            if (isRefreshing) {
                // Queue this request until the in-flight refresh settles
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
                console.log('🔄 Token expired, attempting silent refresh…');
                const result = await authService.refreshToken();
                const newToken =
                    result?.session?.access_token ||
                    result?.data?.session?.access_token;

                if (!newToken) throw new Error('No new token received after refresh');

                apiClient.defaults.headers.common.Authorization = `Bearer ${newToken}`;
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                processQueue(null, newToken);
                return apiClient(originalRequest);
            } catch (refreshError) {
                console.error('❌ Silent refresh failed:', refreshError.message);
                processQueue(refreshError, null);
                // Only sign out when the refresh itself explicitly says the session
                // is dead (400 / invalid token) — not for network errors.
                const status = refreshError.response?.status;
                const msg = refreshError.message?.toLowerCase() ?? '';
                const isHardFailure =
                    status === 400 ||
                    msg.includes('invalid refresh token') ||
                    msg.includes('token expired') ||
                    msg.includes('no refresh token');
                if (isHardFailure) {
                    console.log('🚪 Hard auth failure — signing out.');
                    authEvents.emit('SIGNED_OUT');
                }
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        // ── Hard auth errors — sign out immediately ────────────────────────────
        if (errorCode === 'AUTH_INVALID_TOKEN' || errorCode === 'AUTH_REFRESH_FAILED') {
            console.error(`🚨 Critical auth error: ${errorCode} — signing out.`);
            authEvents.emit('SIGNED_OUT');
            return Promise.reject(error);
        }

        // ── Logging ────────────────────────────────────────────────────────────
        if (error.response) {
            const ms = originalRequest?.metadata?._requestStart
                ? Date.now() - originalRequest.metadata._requestStart
                : null;
            const timing = ms != null ? ` (${ms}ms)` : '';
            console.error(`❌ [CLIENT] ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url} → ${error.response.status}${timing}`);
            console.error('   Response Error:', error.response.data);
        } else if (!error.response) {
            const ms = originalRequest?.metadata?._requestStart
                ? Date.now() - originalRequest.metadata._requestStart
                : null;
            const timing = ms != null ? ` (${ms}ms)` : '';
            console.error(`❌ [CLIENT] ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url} → NETWORK ERROR${timing}`);
        }

        // ── Retry transient failures on GET requests ───────────────────────────
        const isNetworkError = !error.response && error.code !== 'ECONNABORTED';
        const isRetryableStatus = error.response?.status >= 500;
        const isGetRequest = originalRequest?.method?.toLowerCase() === 'get';

        if (
            (isNetworkError || isRetryableStatus) &&
            isGetRequest &&
            errorCode !== 'PGRST303'
        ) {
            originalRequest._retryCount = originalRequest._retryCount || 0;
            if (originalRequest._retryCount < MAX_RETRIES) {
                originalRequest._retryCount += 1;
                console.log(`🔄 Retrying (${originalRequest._retryCount}/${MAX_RETRIES}): ${originalRequest.url}`);
                await new Promise(resolve =>
                    setTimeout(resolve, RETRY_DELAY * originalRequest._retryCount)
                );
                return apiClient(originalRequest);
            }
        }

        return Promise.reject(error);
    }
);

export { BASE_URL };
export default apiClient;
