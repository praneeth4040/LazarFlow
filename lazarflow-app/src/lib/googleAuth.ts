import type { SignInResponse, User } from '@react-native-google-signin/google-signin';
import { supabase } from './supabaseClient';
import { authEvents } from './authEvents';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Alert } from 'react-native';

type GoogleSigninModule = {
  GoogleSignin: typeof import('@react-native-google-signin/google-signin').GoogleSignin;
  isErrorWithCode: typeof import('@react-native-google-signin/google-signin').isErrorWithCode;
  statusCodes: typeof import('@react-native-google-signin/google-signin').statusCodes;
};

const WEB_CLIENT_ID = '790454978494-4g33c1rqgjk16alv3ohl6ubjc01s6op1.apps.googleusercontent.com';

let configured = false;
let cachedModule: GoogleSigninModule | null = null;
let moduleLoadAttempted = false;

const isExpoGo = Constants.appOwnership === 'expo';

function loadGoogleModule(): GoogleSigninModule | null {
  if (cachedModule) return cachedModule;
  if (moduleLoadAttempted) return null;
  moduleLoadAttempted = true;

  if (isExpoGo) {
    console.warn('[googleAuth] Expo Go detected — Google Sign-In native module is not available.');
    return null;
  }

  try {
    const mod = require('@react-native-google-signin/google-signin');
    cachedModule = {
      GoogleSignin: mod.GoogleSignin,
      isErrorWithCode: mod.isErrorWithCode,
      statusCodes: mod.statusCodes,
    };
    console.log('[googleAuth] Google Sign-In native module loaded successfully.');
    return cachedModule;
  } catch (e: any) {
    console.warn('[googleAuth] Failed to load Google Sign-In native module:', e?.message ?? String(e));
    return null;
  }
}

export const isGoogleSignInAvailable = (): boolean => {
  const mod = loadGoogleModule();
  if (!mod) return false;
  try {
    return !!mod.GoogleSignin;
  } catch (e) {
    return false;
  }
};

export const configureGoogleSignIn = (): void => {
  if (configured) return;
  const mod = loadGoogleModule();
  if (!mod) {
    console.warn('[googleAuth] configureGoogleSignIn skipped — native module unavailable.');
    return;
  }

  try {
    mod.GoogleSignin.configure({
      webClientId: WEB_CLIENT_ID,
      scopes: ['profile', 'email'],
      offlineAccess: false,
    });
    configured = true;
  } catch (e: any) {
    console.warn('[googleAuth] configure warning:', e?.message);
  }
};

const resolveIdToken = async (signInData: User | null | undefined): Promise<string> => {
  const mod = loadGoogleModule();
  if (!mod) throw new Error('Google Sign-In native module is not available. Use a development or production build.');

  if (signInData?.idToken) return signInData.idToken;

  try {
    const tokens = await mod.GoogleSignin.getTokens();
    if (tokens?.idToken) return tokens.idToken;
    if (tokens?.accessToken) {
      throw new Error(
        'Google returned an access token but no id token. ' +
        'Re-authenticate or check the OAuth client configuration.',
      );
    }
  } catch (e: any) {
    if (e?.message?.startsWith('Google returned')) throw e;
    console.warn('[googleAuth] getTokens fallback failed:', e?.message);
  }

  throw new Error('No ID token returned from Google Sign-In');
};

export const signInWithGoogle = async (): Promise<void> => {
  const mod = loadGoogleModule();
  if (!mod || isExpoGo) {
    Alert.alert(
      'Not Supported in Expo Go',
      'Google Sign-In requires a development build or the production app. It is not available in the standard Expo Go app.',
      [{ text: 'OK' }]
    );
    return;
  }

  configureGoogleSignIn();

  try {
    try {
      await mod.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    } catch (playErr: any) {
      if (mod.isErrorWithCode(playErr) && playErr.code === mod.statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play Services not available on this device');
      }
      console.warn('[googleAuth] hasPlayServices non-fatal:', playErr?.message);
    }

    const response: SignInResponse = await mod.GoogleSignin.signIn();

    if (response.type === 'cancelled') {
      console.log('👤 Google Sign-In cancelled by user');
      throw new Error('CANCELLED');
    }

    const signInUser: User = response.data;
    const idToken = await resolveIdToken(signInUser);

    console.log('🔑 Google ID token obtained, signing in with Supabase...');

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) throw error;
    if (!data?.session) throw new Error('No session from Supabase after Google Sign-In');

    const { access_token, refresh_token, expires_at, expires_in } = data.session;

    await AsyncStorage.setItem('access_token', access_token);
    await AsyncStorage.setItem('refresh_token', refresh_token);
    const expiry = expires_at
      ? String(expires_at * 1000)
      : String(Date.now() + (expires_in ?? 3600) * 1000);
    await AsyncStorage.setItem('token_expiry', expiry);

    console.log('✅ Google Sign-In successful');
    authEvents.emit('SIGNED_IN', data);
  } catch (error: any) {
    const msg: string = error?.message || 'Sign-in failed';

    if (msg === 'CANCELLED') throw error;

    if (mod && mod.isErrorWithCode(error)) {
      switch (error.code) {
        case mod.statusCodes.SIGN_IN_CANCELLED:
          console.log('👤 Google Sign-In cancelled by user');
          throw new Error('CANCELLED');
        case mod.statusCodes.IN_PROGRESS:
          throw new Error('Sign-in already in progress');
        case mod.statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          throw new Error('Google Play Services not available on this device');
        default:
          console.error('❌ Google Sign-In code error:', error.code, error.message);
      }
    } else {
      console.error('❌ Google Sign-In error:', msg);
    }

    throw error;
  }
};

export const signOutGoogle = async (): Promise<void> => {
  const mod = loadGoogleModule();
  if (!mod) return;
  try {
    const current = await mod.GoogleSignin.getCurrentUser();
    if (current) await mod.GoogleSignin.signOut();
  } catch (e) {
    console.warn('Google sign-out warning:', e);
  }
};
