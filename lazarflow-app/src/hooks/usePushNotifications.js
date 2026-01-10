
import { useState, useEffect, useRef } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabaseClient';

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

        // Learn more about projectId:
        // https://docs.expo.dev/push-notifications/push-notifications-setup/#configure-projectid
        try {
            const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
            if (!projectId) {
                console.error('Project ID not found in Constants');
            }
            token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
            console.log("Expo Push Token:", token);
        } catch (e) {
            console.error("Error getting push token:", e);
        }

    } else {
        console.log('Must use physical device for Push Notifications');
    }

    return token;
}

export const usePushNotifications = () => {
    const [expoPushToken, setExpoPushToken] = useState('');
    const [notification, setNotification] = useState(false);
    const notificationListener = useRef();
    const responseListener = useRef();

    useEffect(() => {
        let isMounted = true;

        const setupNotifications = async () => {
            const token = await registerForPushNotificationsAsync();
            if (!isMounted) return;
            
            setExpoPushToken(token);

            if (token) {
                // Initial check for user
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await saveTokenToSupabase(user.id, token);
                }
            }
        };

        setupNotifications();

        // Listen for auth state changes to save token when user logs in
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user && expoPushToken) {
                console.log('👤 User signed in, saving push token...');
                await saveTokenToSupabase(session.user.id, expoPushToken);
            }
        });

        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            setNotification(notification);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            console.log("Notification Response:", response);
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
            if (notificationListener.current) {
                Notifications.removeNotificationSubscription(notificationListener.current);
            }
            if (responseListener.current) {
                Notifications.removeNotificationSubscription(responseListener.current);
            }
        };
    }, [expoPushToken]);

    const saveTokenToSupabase = async (userId, token) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ expo_push_token: token })
                .eq('id', userId);

            if (error) {
                console.error('Error saving push token to Supabase:', error);
            } else {
                console.log('✅ Push token successfully saved to Supabase');
            }
        } catch (err) {
            console.error('Failed to save token:', err);
        }
    };

    return {
        expoPushToken,
        notification
    };
};
