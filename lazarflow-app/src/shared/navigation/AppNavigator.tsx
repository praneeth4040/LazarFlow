import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';

// Theme & Services (adjust paths to root/shared)
import { Theme } from '../../styles/theme';
import { authService } from '../../lib/authService';
import { authEvents } from '../../lib/authEvents';
import { supabase } from '../../lib/supabaseClient';

// Modules: Onboarding & Auth
import { OnboardingPage } from '../../onboarding/pages/OnboardingPage';
import { LoginPage } from '../../auth/pages/LoginPage';
import { SignUpPage } from '../../auth/pages/SignUpPage';
import { ForgotPasswordPage } from '../../auth/pages/ForgotPasswordPage';

// Modules: Dashboard (New mapped path)
import DashboardPage from '../../dashboard/pages/DashboardPage';

// Modules: Lobby
import { LiveLobbyPage } from '../../lobby/pages/LiveLobbyPage';
import { CreateLobbyPage } from '../../lobby/pages/CreateLobbyPage';
import { ManageTeamsPage } from '../../lobby/pages/ManageTeamsPage';
import { EditLobbyPage } from '../../lobby/pages/EditLobbyPage';

import { PrivacyPolicyPage } from '../../settings/pages/PrivacyPolicyPage';
import { TermsAndConditionsPage } from '../../settings/pages/TermsAndConditionsPage';
import { CalculateResultsPage } from '../../results/pages/CalculateResultsPage';
import { ResetPasswordPage } from '../../auth/pages/ResetPasswordPage';
import { DesignDetailsPage } from '../../dashboard/pages/DesignDetailsPage';
import { SubscriptionPlansPage } from '../../subscription/pages/SubscriptionPlansPage';
import { PaymentStatusPage } from '../../subscription/pages/PaymentStatusPage';
import { GenericErrorPage } from '../../shared/pages/GenericErrorPage';

export type RootStackParamList = {
    Onboarding: undefined;
    Login: undefined;
    SignUp: undefined;
    ForgotPassword: undefined;
    ResetPassword: { access_token?: string; refresh_token?: string } | undefined;
    Dashboard: { tab?: string } | undefined;
    LiveLobby: { id: string };
    PrivacyPolicy: undefined;
    TermsAndConditions: undefined;
    CreateLobby: undefined;
    ManageTeams: { lobbyId: string; lobbyName: string };
    CalculateResults: { lobby: any };
    EditLobby: { lobbyId: string };
    DesignDetails: undefined;
    SubscriptionPlans: undefined;
    PaymentStatus: undefined;
    GenericError: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
    const [isLoading, setIsLoading] = useState(true);
    const [session, setSession] = useState<any>(null);
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
        const unsubscribeSignIn = authEvents.on('SIGNED_IN', (data: any) => {
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
    }, []);

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
                DesignDetails: 'design/:themeId',
            }
        }
    };

    return (
        <NavigationContainer linking={linking as any}>
            <Stack.Navigator
                id="RootStack"
                screenOptions={{
                    headerShown: false,
                    cardStyle: { backgroundColor: Theme.colors.secondary }
                }}
            >
                {isRecovering ? (
                    <Stack.Screen name="ResetPassword" component={ResetPasswordPage} />
                ) : !session ? (
                    <>
                        <Stack.Screen name="Onboarding" component={OnboardingPage} />
                        <Stack.Screen name="Login" component={LoginPage} />
                        <Stack.Screen name="SignUp" component={SignUpPage} />
                        <Stack.Screen name="ForgotPassword" component={ForgotPasswordPage} />
                        <Stack.Screen name="ResetPassword" component={ResetPasswordPage} />
                    </>
                ) : (
                    <>
                        <Stack.Screen name="Dashboard" component={DashboardPage} />
                        <Stack.Screen name="ResetPassword" component={ResetPasswordPage} />
                        <Stack.Screen
                            name="LiveLobby"
                            component={LiveLobbyPage}
                            options={{ headerShown: true, title: 'Live Standings', headerStyle: { backgroundColor: Theme.colors.primary }, headerTintColor: Theme.colors.textPrimary }}
                        />
                        <Stack.Screen
                            name="PrivacyPolicy"
                            component={PrivacyPolicyPage}
                            options={{ headerShown: true, title: 'Privacy Policy', headerStyle: { backgroundColor: Theme.colors.primary }, headerTintColor: Theme.colors.textPrimary }}
                        />
                        <Stack.Screen
                            name="TermsAndConditions"
                            component={TermsAndConditionsPage}
                            options={{ headerShown: true, title: 'Terms & Conditions', headerStyle: { backgroundColor: Theme.colors.primary }, headerTintColor: Theme.colors.textPrimary }}
                        />
                        <Stack.Screen
                            name="CreateLobby"
                            component={CreateLobbyPage}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="ManageTeams"
                            component={ManageTeamsPage}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="CalculateResults"
                            component={CalculateResultsPage}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="EditLobby"
                            component={EditLobbyPage}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="DesignDetails"
                            component={DesignDetailsPage}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="SubscriptionPlans"
                            component={SubscriptionPlansPage}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="PaymentStatus"
                            component={PaymentStatusPage}
                            options={{ headerShown: false }}
                        />
                         <Stack.Screen
                            name="GenericError"
                            component={GenericErrorPage}
                            options={{ headerShown: false }}
                        />

                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
