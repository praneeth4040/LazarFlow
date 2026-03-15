import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import DashboardScreen from '../screens/DashboardScreen';
import LiveLobbyScreen from '../screens/LiveLobbyScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import TermsAndConditionsScreen from '../screens/TermsAndConditionsScreen';
import CreateLobbyScreen from '../screens/CreateLobbyScreen';
import ManageTeamsScreen from '../screens/ManageTeamsScreen';
import CalculateResultsScreen from '../screens/CalculateResultsScreen';
import EditLobbyScreen from '../screens/EditLobbyScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import DesignDetailsScreen from '../screens/DesignDetailsScreen';
import SubscriptionPlansScreen from '../screens/SubscriptionPlansScreen';
import PaymentStatusScreen from '../screens/PaymentStatusScreen';
import GenericErrorScreen from '../screens/GenericErrorScreen';
import * as Linking from 'expo-linking';
import { Theme } from '../styles/theme';
import { authService } from '../lib/authService';
import { authEvents } from '../lib/authEvents';
import { supabase } from '../lib/supabaseClient';

const Stack = createStackNavigator();

export default function AppNavigator() {
    const [isLoading, setIsLoading] = useState(true);
    const [session, setSession] = useState(null);
    const [isRecovering, setIsRecovering] = useState(false);

    useEffect(() => {
        // Check for initial session
        const checkSession = async () => {
            try {
                const { data: { session } } = await authService.getSession();
                setSession(session);
            } catch (e) {
                console.error('Session check failed', e);
            } finally {
                setIsLoading(false);
            }
        };
        checkSession();

        // Listen for Supabase auth state changes (Crucial for Forgot Password)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔔 Supabase Auth Event:', event);
            
            if (event === 'PASSWORD_RECOVERY') {
                console.log('🔑 Password recovery mode detected!');
                setIsRecovering(true);
                setSession(session);
            } else if (event === 'SIGNED_IN') {
                console.log('✅ Supabase SIGNED_IN Event');
                setSession(session);
                // DO NOT reset isRecovering here, as it might override recovery mode
            } else if (event === 'SIGNED_OUT') {
                console.log('🚪 Supabase SIGNED_OUT Event');
                setSession(null);
                setIsRecovering(false);
            }
        });

        // Listen for internal auth events
        const unsubscribeSignIn = authEvents.on('SIGNED_IN', (data) => {
             console.log('👤 Internal SIGNED_IN Event');
             setSession(data.session || { access_token: 'valid' });
             // Only reset if we're not in a recovery flow
             setIsRecovering(prev => prev ? prev : false);
        });

        const unsubscribeSignOut = authEvents.on('SIGNED_OUT', () => {
             console.log('🚪 User signed out');
             setSession(null);
             setIsRecovering(false);
        });

        return () => {
            subscription.unsubscribe();
            unsubscribeSignIn();
            unsubscribeSignOut();
        };
    }, [isRecovering]);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Theme.colors.secondary }}>
                <ActivityIndicator size="large" color={Theme.colors.accent} />
            </View>
        );
    }

    const prefix = Linking.createURL('/');

    const linking = {
        prefixes: [prefix, 'lazarflow://', 'https://lazarflow.app', 'https://pg-router.dev.razorpay.in'],
        config: {
            screens: {
                ResetPassword: 'reset-password',
                Login: 'login',
            }
        }
    };

    return (
        <NavigationContainer linking={linking}>
            <Stack.Navigator
                screenOptions={{
                    headerShown: false,
                    cardStyle: { backgroundColor: Theme.colors.secondary }
                }}
            >
                {isRecovering ? (
                    <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
                ) : !session ? (
                    <>
                        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                        <Stack.Screen name="Login" component={LoginScreen} />
                        <Stack.Screen name="SignUp" component={SignUpScreen} />
                        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
                    </>
                ) : (
                    <>
                        <Stack.Screen name="Dashboard" component={DashboardScreen} />
                        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
                        <Stack.Screen
                            name="LiveLobby"
                            component={LiveLobbyScreen}
                            options={{ headerShown: true, title: 'Live Standings', headerStyle: { backgroundColor: Theme.colors.primary }, headerTintColor: Theme.colors.textPrimary }}
                        />
                        <Stack.Screen
                            name="PrivacyPolicy"
                            component={PrivacyPolicyScreen}
                            options={{ headerShown: true, title: 'Privacy Policy', headerStyle: { backgroundColor: Theme.colors.primary }, headerTintColor: Theme.colors.textPrimary }}
                        />
                        <Stack.Screen
                            name="TermsAndConditions"
                            component={TermsAndConditionsScreen}
                            options={{ headerShown: true, title: 'Terms & Conditions', headerStyle: { backgroundColor: Theme.colors.primary }, headerTintColor: Theme.colors.textPrimary }}
                        />
                        <Stack.Screen
                            name="CreateLobby"
                            component={CreateLobbyScreen}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="ManageTeams"
                            component={ManageTeamsScreen}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="CalculateResults"
                            component={CalculateResultsScreen}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="EditLobby"
                            component={EditLobbyScreen}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="DesignDetails"
                            component={DesignDetailsScreen}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="SubscriptionPlans"
                            component={SubscriptionPlansScreen}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="PaymentStatus"
                            component={PaymentStatusScreen}
                            options={{ headerShown: false }}
                        />
                         <Stack.Screen
                            name="GenericError"
                            component={GenericErrorScreen}
                            options={{ headerShown: false }}
                        />

                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
