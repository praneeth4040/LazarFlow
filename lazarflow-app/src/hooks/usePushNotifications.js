
import { useState, useEffect, useRef, useContext } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../lib/authService';
import { UserContext } from '../context/UserContext';
import { registerPushToken } from '../lib/dataService';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
    }),
});

export const usePushNotifications = () => {
    const { user } = useContext(UserContext);
    const [expoPushToken, setExpoPushToken] = useState('');
    const [notification, setNotification] = useState(false);
    const tokenRef = useRef('');
    const tokenSentRef = useRef(false); // Track if token was already sent
    const notificationListener = useRef();
    const responseListener = useRef();

    // Only setup listeners (not token fetching) at mount
    useEffect(() => {
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            setNotification(notification);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            // Handle notification response here if needed
        });

        return () => {
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, []);

    // Request permission AND get token AFTER user logs in
    useEffect(() => {
        if (!user?.id) return; // Don't run if no user

        let isMounted = true;

        const setupNotificationsAfterLogin = async () => {
            console.log('📱 usePushNotifications: User logged in, setting up notifications...');

            // Set up notification channel for Android
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('default', {
                    name: 'default',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                });
            }

            if (!Device.isDevice) {
                console.log('📱 usePushNotifications: Must use physical device');
                return;
            }

            // Request permissions
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.log('📱 usePushNotifications: Permission denied');
                return;
            }

            console.log('📱 usePushNotifications: Permission granted, getting token...');

            try {
                // Fetch the Expo Push Token
                // Explicitly provide projectId from app.json/Constants for reliability
                const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
                
                if (!projectId) {
                    console.warn('📱 usePushNotifications: No projectId found in Constants. Ensure app.json has extra.eas.projectId');
                }

                const { data: expoToken } = await Notifications.getExpoPushTokenAsync({
                    projectId: projectId
                });

                if (!isMounted) return;

                tokenRef.current = expoToken;
                setExpoPushToken(expoToken);
                console.log('📱 Expo Push Token:', expoToken);

                // Store token for logout cleanup
                await AsyncStorage.setItem('last_push_token', expoToken);

                // Send to backend
                console.log('📱 usePushNotifications: Saving token to profile...', user.id);
                await saveTokenToProfile(user.id, expoToken);
                tokenSentRef.current = true;

            } catch (e) {
                console.error("❌ Error getting Expo push token:", e);
            }
        };

        setupNotificationsAfterLogin();

        return () => {
            isMounted = false;
        };
    }, [user?.id]);

    const saveTokenToProfile = async (userId, token) => {
        try {
            console.log('📤 Registering push token for user:', userId);
            console.log('📤 Token:', token);
            
            await registerPushToken(userId, token);

            console.log('✅ Push token successfully registered');
        } catch (err) {
            console.error('❌ Failed to save token:', err);
        }
    };

    return {
        expoPushToken,
        notification
    };
};
