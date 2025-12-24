import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import LandingScreen from '../screens/LandingScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import DashboardScreen from '../screens/DashboardScreen';
import LiveTournamentScreen from '../screens/LiveTournamentScreen';
import EditLayoutScreen from '../screens/EditLayoutScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import TermsAndConditionsScreen from '../screens/TermsAndConditionsScreen';
import CreateTournamentScreen from '../screens/CreateTournamentScreen';
import ManageTeamsScreen from '../screens/ManageTeamsScreen';
import CalculateResultsScreen from '../screens/CalculateResultsScreen';
import { Theme } from '../styles/theme';
import { supabase } from '../lib/supabaseClient';

const Stack = createStackNavigator();

export default function AppNavigator() {
    const [isLoading, setIsLoading] = useState(true);
    const [session, setSession] = useState(null);

    useEffect(() => {
        // Check for initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setIsLoading(false);
        });

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Theme.colors.secondary }}>
                <ActivityIndicator size="large" color={Theme.colors.accent} />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator
                initialRouteName={session ? "Dashboard" : "Landing"}
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: Theme.colors.secondary }
                }}
            >
                {!session ? (
                    <>
                        <Stack.Screen name="Landing" component={LandingScreen} />
                        <Stack.Screen name="Login" component={LoginScreen} />
                        <Stack.Screen name="SignUp" component={SignUpScreen} />
                    </>
                ) : (
                    <>
                        <Stack.Screen name="Dashboard" component={DashboardScreen} />
                        <Stack.Screen
                            name="LiveTournament"
                            component={LiveTournamentScreen}
                            options={{ headerShown: true, title: 'Live Standings', headerStyle: { backgroundColor: Theme.colors.primary }, headerTintColor: Theme.colors.textPrimary }}
                        />
                        <Stack.Screen
                            name="EditLayout"
                            component={EditLayoutScreen}
                            options={{ headerShown: true, title: 'Edit Layout', headerStyle: { backgroundColor: Theme.colors.primary }, headerTintColor: Theme.colors.textPrimary }}
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
                            name="CreateTournament"
                            component={CreateTournamentScreen}
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
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
