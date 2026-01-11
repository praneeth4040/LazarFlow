
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
                const { data: { user } } = await supabase.auth.getUser();
                if (user && isMounted) {
                    await saveTokenToSupabase(user.id, token);
                }
            }
        };

        setupNotifications();

        // Listen for auth state changes to save token when user logs in
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            const currentToken = tokenRef.current;
            if (event === 'SIGNED_IN' && session?.user && currentToken) {
                console.log('👤 User signed in, saving push token...');
                await saveTokenToSupabase(session.user.id, currentToken);
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
            if (subscription) {
                subscription.unsubscribe();
            }
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, []);

    const saveTokenToSupabase = async (userId, token) => {
        try {
            console.log('🔄 Attempting to save push token for user:', userId);
            
            // Use upsert to ensure the profile exists and the token is updated
            const { data, error } = await supabase
                .from('profiles')
                .upsert({ 
                    id: userId, 
                    expo_push_token: token,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id' });

            if (error) {
                console.error('❌ Error saving push token to Supabase:', error.message);
                throw error;
            } else {
                console.log('✅ Push token successfully saved to Supabase');
            }
        } catch (err) {
            console.error('❌ Failed to save token:', err);
        }
    };

    return {
        expoPushToken,
        notification
    };
};
