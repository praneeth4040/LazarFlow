import React, { useEffect, useCallback, useRef, useContext } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Outfit_300Light, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import AppNavigator from './src/shared/navigation/AppNavigator';
import { usePushNotifications } from './src/hooks/usePushNotifications';
import { UserProvider, UserContext } from './src/context/UserContext';
import { Theme } from './src/styles/theme';
import { AlertTriangle } from 'lucide-react-native';
import GlobalAlert from './src/components/GlobalAlert';
import { globalAlertRef, CustomAlert as Alert } from './src/lib/AlertService';
import { getOcrJobStatus } from './src/lib/dataService';
import { OcrJobProvider } from './src/context/OcrJobContext';

const queryClient = new QueryClient();

import { navigationRef } from './src/shared/navigation/navigationRef';

/** Shared navigation reference (defined in src/shared/navigation/navigationRef.js)
 * so notification handlers can navigate outside the React tree. */
export { navigationRef };

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('❌ APP ERROR CAUGHT:', error);
    console.error('❌ ERROR INFO:', errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
            <View style={styles.content}>
                <View style={[styles.iconContainer, { backgroundColor: Theme.colors.danger + '20' }]}>
                    <AlertTriangle size={64} color={Theme.colors.danger} />
                </View>
                <Text style={styles.title}>Application Error</Text>
                <Text style={styles.message}>
                    A critical error occurred and the application has to stop.
                    Please restart the app.
                </Text>
                {this.state.error && (
                    <Text style={styles.errorText}>{this.state.error.toString()}</Text>
                )}
            </View>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  console.log('🚀 App.js: Starting LazarFlow Mobile App...');

  const [fontsLoaded, fontError] = useFonts({
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // ── Initialize Google Mobile Ads SDK once at app startup ────────────────────
  useEffect(() => {
    // react-native-google-mobile-ads requires a custom native build.
    // This call is a no-op in Expo Go — the module simply won't be found.
    try {
      const { default: mobileAds } = require('react-native-google-mobile-ads');
      mobileAds()
        .initialize()
        .then(() => console.log('📢 Mobile Ads SDK initialized'))
        .catch((e) => console.warn('📢 Mobile Ads SDK init failed:', e));
    } catch (_) {
      console.log('📢 Mobile Ads SDK not available (Expo Go)');
    }
  }, []);
  // ────────────────────────────────────────────────────────────────────────────

  // ── OCR Job push notification handlers ──────────────────────────────────────
  useEffect(() => {
    // Foreground notifications — job finished while app is open
    const foregroundSub = Notifications.addNotificationReceivedListener(async (notification) => {
      const data = notification.request.content.data;

      if (data?.type === 'ocr_job_complete' && data?.job_id) {
        try {
          const job = await getOcrJobStatus(data.job_id);
          console.log('📲 OCR job complete (foreground):', data.job_id, '| result teams:', job?.result?.teams?.length ?? 0);
          // The polling loop in useAIExtractionAsync will pick this up automatically.
          // No manual state update needed here.
        } catch (e) {
          console.warn('📲 Failed to fetch completed OCR job from push:', e);
        }
      }

      if (data?.type === 'ocr_job_failed' && data?.job_id) {
        console.warn('📲 OCR job failed (foreground):', data.job_id);
        // The polling loop will detect the 'failed' status and surface the error alert.
      }
    });

    // Background / killed tap — navigate user to the relevant lobby screen
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;

      if (data?.type === 'ocr_job_complete' && data?.lobby_id) {
        console.log('📲 User tapped OCR complete notification. Navigating to CalculateResults...');
        // navigationRef may not be ready immediately on cold start; delay slightly
        setTimeout(() => {
          if (navigationRef.current?.isReady()) {
            navigationRef.current.navigate('CalculateResults', {
              lobby: { id: data.lobby_id },
            });
          }
        }, 500);
      }
    });

    return () => {
      foregroundSub.remove();
      responseSub.remove();
    };
  }, []);
  // ────────────────────────────────────────────────────────────────────────────

  if (!fontsLoaded && !fontError) {
    return null;
  }

  try {
    return (
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider onLayout={onLayoutRootView}>
            <OcrJobProvider>
              <UserProvider>
                <AppNavigator />
                <PushNotificationHandler />
                <DesFileOpener />
              </UserProvider>
            </OcrJobProvider>
            <GlobalAlert ref={globalAlertRef} />
            <StatusBar style="auto" />
          </SafeAreaProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    );
    
  } catch (error) {
    console.error('❌ App.js: Fatal error in App component:', error);
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.title}>Fatal Error</Text>
        <Text style={styles.message}>{error.toString()}</Text>
      </View>
    );
  }
}

// Separate component to use the hook inside the context if needed,
// though here we just need it to run once at mount.
// Integrating directly into App or a child component is fine.
const PushNotificationHandler = () => {
  usePushNotifications();
  return null;
};

// ── .des design file opens ("Open with" from a file manager) ─────────────────
// The Android intent filter (app.json android.intentFilters, mimeType
// octet-stream/* with pathPattern .des) lands here as a content:// or file://
// URL. Routed into the dashboard's import sheet via a pendingDesUri param.
const isDesFileUrl = (url) => {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (!lower.startsWith('content://') && !lower.startsWith('file://')) return false;
  const path = url.split('?')[0].split('#')[0];
  try {
    return /\.des$/i.test(decodeURIComponent(path));
  } catch {
    return /\.des$/i.test(path);
  }
};

const DesFileOpener = () => {
  const { user } = useContext(UserContext);
  const userRef = useRef(user);
  userRef.current = user;
  // .des URLs that arrived before the session hydrated — flushed on login
  const pendingRef = useRef(null);

  const navigateWithFile = useCallback((url) => {
    const go = () => {
      if (navigationRef.current?.isReady()) {
        navigationRef.current.navigate('DesImport', {
          pendingDesUri: url,
        });
        return true;
      }
      return false;
    };
    // Cold start: the navigator may not be mounted yet
    if (!go()) setTimeout(() => go(), 800);
  }, []);

  useEffect(() => {
    const handleUrl = (url) => {
      if (!isDesFileUrl(url)) return;
      console.log('📎 Opened .des design file:', url);
      if (userRef.current) {
        navigateWithFile(url);
      } else {
        // Session may still be hydrating — hold the file and wait for login
        console.log('📎 No session yet — holding design file until login');
        pendingRef.current = url;
        setTimeout(() => {
          if (pendingRef.current === url && !userRef.current) {
            pendingRef.current = null;
            Alert.alert(
              'Log in required',
              'Please log in first, then open the design file again to import it.'
            );
          }
        }, 10000);
      }
    };

    Linking.getInitialURL().then((url) => url && handleUrl(url));
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, [navigateWithFile]);

  // Session just hydrated while a .des file was pending → route it now.
  // Small delay: the auth gate needs a beat to mount the app screens before
  // navigate('Dashboard') can resolve.
  useEffect(() => {
    if (user && pendingRef.current) {
      const url = pendingRef.current;
      pendingRef.current = null;
      setTimeout(() => navigateWithFile(url), 600);
    }
  }, [user, navigateWithFile]);
  // ────────────────────────────────────────────────────────────────────────────

  return null;
};

const styles = StyleSheet.create({
    errorContainer: {
        flex: 1,
        backgroundColor: Theme.colors.secondary,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    content: {
        alignItems: 'center',
        marginBottom: 40,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
    },
    title: {
        fontSize: 28,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textPrimary,
        textAlign: 'center',
        marginBottom: 12,
    },
    message: {
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.regular,
        color: Theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        maxWidth: '90%',
    },
    errorText: {
        marginTop: 20,
        fontSize: 12,
        fontFamily: Theme.fonts.mono,
        color: Theme.colors.danger,
        textAlign: 'center',
        padding: 10,
        backgroundColor: Theme.colors.danger + '10',
        borderRadius: Theme.radius.md,
    },
});
