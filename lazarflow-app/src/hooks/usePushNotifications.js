
import { useState, useEffect, useRef } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { authService } from '../lib/authService';
import { getCurrentUser, updateUserProfile } from '../lib/dataService';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
    }),
});

async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for push notification!');
            return;
        }

        try {
            // Fetch the native device token (FCM for Android, APNs for iOS)
            // for the Direct Push method.
            token = (await Notifications.getDevicePushTokenAsync()).data;
            console.log('📱 Native Device Push Token:', token);
        } catch (e) {
            console.error("❌ Error getting native push token:", e);
        }

    } else {
        console.log('Must use physical device for Push Notifications');
    }

    return token;
}

export const usePushNotifications = () => {
    const [expoPushToken, setExpoPushToken] = useState('');
    const [notification, setNotification] = useState(false);
    const tokenRef = useRef('');
    const notificationListener = useRef();
    const responseListener = useRef();

    useEffect(() => {
        let isMounted = true;

        const setupNotifications = async () => {
            const token = await registerForPushNotificationsAsync();
            if (!isMounted) return;
            
            setExpoPushToken(token);
            tokenRef.current = token;

            if (token) {
                // Initial check for user
                try {
                    const user = await authService.getMe();
                    if (user && isMounted) {
                        await saveTokenToProfile(user.id, token);
                    }
                } catch (e) {
                    console.log('User not logged in or error checking auth for push token');
                }
            }
        };

        setupNotifications();

        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            setNotification(notification);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            // Handle notification response here if needed
        });

        return () => {
            isMounted = false;
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, []);

    const saveTokenToProfile = async (userId, token) => {
        try {
            console.log('🔄 Checking if push token needs update for user:', userId);
            
            // 1. First, fetch the current token from the profile
            const profile = await getCurrentUser();

            // 2. Only update if the token is different or doesn't exist
            if (profile?.expo_push_token === token) {
                console.log('✅ Push token is already up to date. Skipping update.');
                return;
            }

            console.log('📤 Token is new or changed. Updating Profile...');
            
            // Send only expo_push_token as per API spec
            await updateUserProfile({ 
                expo_push_token: token
            });

            console.log('✅ Push token successfully updated in Profile');
        } catch (err) {
            console.error('❌ Failed to save token:', err);
        }
    };

    return {
        expoPushToken,
        notification
    };
};
