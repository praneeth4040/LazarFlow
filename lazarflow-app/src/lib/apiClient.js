import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authEvents } from './authEvents';
import { supabase } from './supabaseClient';

// Dev override: set EXPO_PUBLIC_API_URL in .env (e.g. http://localhost:8080
// for the iOS Simulator — it shares the Mac's localhost; use
// http://10.0.2.2:8080 for the Android emulator) to run against a local
// backend. Unset = production.
// Dev-only override: EXPO_PUBLIC_API_URL is honored solely in __DEV__ builds
// so a local .env can never leak into a production/OTA bundle.
const BASE_URL = (__DEV__ && process.env.EXPO_PUBLIC_API_URL) || 'https://lazarflow-backend-production-904249234907.asia-south1.run.app';

/**
 * Decode a response payload that axios left as raw binary — requests with
 * `responseType: 'arraybuffer'` (e.g. image renders) keep their ERROR
 * bodies as ArrayBuffers instead of parsed JSON.
 */
const decodeBinaryBody = (data) => {
    if (typeof ArrayBuffer === 'undefined') return null;
    const isBinary = data instanceof ArrayBuffer || ArrayBuffer.isView(data);
    if (!isBinary) return data;
    try {
        const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        let text;
        if (typeof TextDecoder !== 'undefined') {
            text = new TextDecoder('utf-8').decode(bytes);
        } else {
            // Fallback: byte-wise decode (multibyte UTF-8 punctuation may be
            // mangled, but the message stays readable).
            text = '';
            for (let i = 0; i < bytes.length; i++) text += String.fromCharCode(bytes[i]);
        }
        try { return JSON.parse(text); } catch { return text; }
    } catch {
        return null;
    }
};

/**
 * Extract a human-readable message from a backend/axios error.
 * Backend error bodies are `{"detail": ...}` where detail is either
 * `{message, code}` (our standard), a plain string (legacy), or a Pydantic
 * validation array (422s).
 */
export const extractApiErrorMessage = (err, fallback = 'Something went wrong. Please try again.') => {
    const payload = decodeBinaryBody(err?.response?.data);
    const detail = payload?.detail !== undefined ? payload.detail : (typeof payload === 'string' ? payload : err?.response?.data?.detail);
    if (typeof detail === 'string' && detail.trim()) return detail;
    if (detail && typeof detail === 'object') {
        if (typeof detail.message === 'string' && detail.message.trim()) return detail.message;
        if (Array.isArray(detail)) {
            const first = detail[0];
            if (first?.msg) return `${first.msg}${first.loc ? ` (${first.loc.join('.')})` : ''}`;
        }
    }
    if (typeof err?.message === 'string' && err.message.trim()) return err.message;
    return fallback;
};
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

            // Attach session token for device-session enforcement
            const sessionToken = await AsyncStorage.getItem('session_token');
            if (sessionToken) {
                config.headers['X-Session-Token'] = sessionToken;
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

        // ── SESSION_INVALIDATED — force logout immediately ─────────────────────
        if (error.response?.status === 401 && errorCode === 'SESSION_INVALIDATED') {
            console.error('🔒 SESSION_INVALIDATED — logging out.');
            authEvents.emit('SESSION_INVALIDATED');
            authEvents.emit('SIGNED_OUT');
            return Promise.reject(error);
        }

        // ── 402 Payment Required — emit event for UI to react ─────────────────
        if (error.response?.status === 402) {
            console.warn('💳 402 Payment Required — out of credits.');
            authEvents.emit('PAYMENT_REQUIRED', { url: originalRequest?.url });
            return Promise.reject(error);
        }

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
