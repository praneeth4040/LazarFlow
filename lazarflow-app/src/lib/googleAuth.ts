import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { supabase } from './supabaseClient';
import { authEvents } from './authEvents';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Client IDs ───────────────────────────────────────────────────────────────
// Web Client ID — used by Supabase signInWithIdToken and GoogleSignin.configure
const WEB_CLIENT_ID = '790454978494-4g33c1rqgjk16alv3ohl6ubjc01s6op1.apps.googleusercontent.com';

let configured = false;

export const configureGoogleSignIn = () => {
    if (configured) return;
    GoogleSignin.configure({
        webClientId: WEB_CLIENT_ID,
        scopes: ['profile', 'email'],
        offlineAccess: false,
    });
    configured = true;
};

export const signInWithGoogle = async (): Promise<void> => {
    configureGoogleSignIn();

    try {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const userInfo = await GoogleSignin.signIn();
        const idToken = userInfo.data?.idToken ?? (userInfo as any).idToken;

        if (!idToken) throw new Error('No ID token returned from Google Sign-In');

        console.log('🔑 Google ID token obtained, signing in with Supabase...');

        const { data, error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: idToken,
        });

        if (error) throw error;
        if (!data?.session) throw new Error('No session from Supabase after Google Sign-In');

        const { access_token, refresh_token, expires_at, expires_in } = data.session;

        // Persist tokens for apiClient interceptor
        await AsyncStorage.setItem('access_token', access_token);
        await AsyncStorage.setItem('refresh_token', refresh_token);
        const expiry = expires_at
            ? String(expires_at * 1000)
            : String(Date.now() + (expires_in ?? 3600) * 1000);
        await AsyncStorage.setItem('token_expiry', expiry);

        console.log('✅ Google Sign-In successful');
        authEvents.emit('SIGNED_IN', data);
    } catch (error: any) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) {
            console.log('👤 Google Sign-In cancelled by user');
            throw new Error('CANCELLED');
        } else if (error.code === statusCodes.IN_PROGRESS) {
            throw new Error('Sign-in already in progress');
        } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
            throw new Error('Google Play Services not available on this device');
        } else {
            console.error('❌ Google Sign-In error:', error.message);
            throw error;
        }
    }
};

export const signOutGoogle = async (): Promise<void> => {
    try {
        const isSignedIn = await GoogleSignin.getCurrentUser();
        if (isSignedIn) await GoogleSignin.signOut();
    } catch (e) {
        // Non-critical — Supabase session is the source of truth
        console.warn('Google sign-out warning:', e);
    }
};
