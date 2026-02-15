import React, { useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Outfit_300Light, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import AppNavigator from './src/navigation/AppNavigator';
import { usePushNotifications } from './src/hooks/usePushNotifications';
import { UserProvider } from './src/context/UserContext';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('❌ APP ERROR CAUGHT:', error);
    console.error('❌ ERROR INFO:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong!</Text>
          <Text style={styles.errorText}>{this.state.error?.toString()}</Text>
          <Text style={styles.errorHint}>Check the terminal for detailed logs</Text>
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

  if (!fontsLoaded && !fontError) {
    return null;
  }

  try {
    return (
      <ErrorBoundary>
        <SafeAreaProvider onLayout={onLayoutRootView}>
          <UserProvider>
            <AppNavigator />
            <PushNotificationHandler />
          </UserProvider>
          <StatusBar style="auto" />
        </SafeAreaProvider>
      </ErrorBoundary>
    );
    
  } catch (error) {
    console.error('❌ App.js: Fatal error in App component:', error);
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Fatal Error</Text>
        <Text style={styles.errorText}>{error.toString()}</Text>
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

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ff0000',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorHint: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});
