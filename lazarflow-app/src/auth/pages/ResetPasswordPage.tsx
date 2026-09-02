import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lock, Eye, EyeOff, ArrowRight } from 'lucide-react-native';
import { Theme } from '../../styles/theme';
import { authService } from '../../lib/authService';
import { supabase } from '../../lib/supabaseClient';
import apiClient from '../../lib/apiClient';
import { CustomAlert as Alert } from '../../lib/AlertService';
import * as Linking from 'expo-linking';

interface ResetPasswordPageProps {
    navigation: any;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ navigation }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);
    const [sessionError, setSessionError] = useState<string | null>(null);
    const [recoveryTokens, setRecoveryTokens] = useState<{ access_token: string; refresh_token: string } | null>(null);

    useEffect(() => {
        const setupSession = async () => {
            try {
                // Check if Supabase already has a recovery session (set by onAuthStateChange PASSWORD_RECOVERY event)
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.access_token && session?.refresh_token) {
                    setRecoveryTokens({ access_token: session.access_token, refresh_token: session.refresh_token });
                    setSessionReady(true);
                    return;
                }

                // No session yet — try to parse tokens from the deep link URL
                const url = await Linking.getInitialURL();
                if (!url) {
                    setSessionError('No recovery link found. Please request a new password reset.');
                    return;
                }

                // Supabase appends tokens as hash fragment: #access_token=...&refresh_token=...&type=recovery
                const hash = url.includes('#') ? url.split('#')[1] : '';
                const params = Object.fromEntries(new URLSearchParams(hash));
                const { access_token, refresh_token, type } = params;

                if (type !== 'recovery' || !access_token || !refresh_token) {
                    setSessionError('Invalid or expired recovery link. Please request a new password reset.');
                    return;
                }

                // Set the session in Supabase using the tokens from the URL
                const { error } = await supabase.auth.setSession({ access_token, refresh_token });
                if (error) {
                    setSessionError('Recovery link has expired. Please request a new password reset.');
                    return;
                }

                setRecoveryTokens({ access_token, refresh_token });
                setSessionReady(true);
            } catch (e: any) {
                setSessionError('Something went wrong. Please request a new password reset.');
            }
        };

        setupSession();
    }, []);
    
    // Password validation criteria
    const passwordCriteria = [
        { label: '8+ characters', met: password.length >= 8 },
        { label: 'One number', met: /\d/.test(password) },
        { label: 'One special char', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
        { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
    ];

    const isPasswordStrong = passwordCriteria.every(c => c.met);
    const strengthCount = passwordCriteria.filter(c => c.met).length;
    const strengthPercentage = (strengthCount / passwordCriteria.length) * 100;

    const getStrengthColor = () => {
        if (password.length === 0) return Theme.colors.border;
        if (strengthCount <= 1) return Theme.colors.danger;
        if (strengthCount <= 3) return Theme.colors.warning;
        return Theme.colors.success;
    };

    const handleUpdatePassword = async () => {
        if (!password || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        if (!isPasswordStrong) {
            Alert.alert('Error', 'Please meet all password strength requirements');
            return;
        }

        if (!recoveryTokens) {
            Alert.alert('Error', 'Recovery session lost. Please request a new password reset.');
            return;
        }

        setLoading(true);

        try {
            // Send all three fields to backend — tokens + new password
            await apiClient.post('/api/auth/reset-password', {
                new_password: password,
                access_token: recoveryTokens.access_token,
                refresh_token: recoveryTokens.refresh_token,
            });

            // Sign out to ensure a clean session after reset
            await authService.logout();

            Alert.alert(
                'Success',
                'Your password has been updated. Please login with your new password.',
                [{ text: 'OK', onPress: () => navigation.navigate('Login') } as any]
            );
        } catch (error: any) {
            Alert.alert('Update Failed', error.response?.data?.message || error.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    if (!sessionReady && !sessionError) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={Theme.colors.accent} />
                    <Text style={{ color: Theme.colors.textSecondary, marginTop: 16, fontFamily: Theme.fonts.outfit.regular }}>
                        Verifying recovery link...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    if (sessionError) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                    <Text style={{ color: Theme.colors.danger, fontSize: 16, fontFamily: Theme.fonts.outfit.semibold, textAlign: 'center', marginBottom: 24 }}>
                        {sessionError}
                    </Text>
                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => navigation.navigate('ForgotPassword')}
                    >
                        <Text style={styles.buttonText}>Request New Reset Link</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    style={{ backgroundColor: Theme.colors.secondary }}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.header}>
                        <Image
                            source={require('../../../assets/logo.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <Text style={styles.title}>New Password</Text>
                        <Text style={styles.subtitle}>Set a secure password for your account</Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>New Password</Text>
                            <View style={styles.inputWrapper}>
                                <Lock size={20} color={Theme.colors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="••••••••"
                                    placeholderTextColor={Theme.colors.textSecondary}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    {showPassword ? <EyeOff size={20} color={Theme.colors.textSecondary} /> : <Eye size={20} color={Theme.colors.textSecondary} />}
                                </TouchableOpacity>
                            </View>
                            
                            <View style={styles.strengthMeterContainer}>
                                <View 
                                    style={[
                                        styles.strengthMeterFill, 
                                        { 
                                            width: `${strengthPercentage}%`, 
                                            backgroundColor: getStrengthColor() 
                                        }
                                    ]} 
                                />
                            </View>
                            
                            <View style={styles.criteriaContainer}>
                                {passwordCriteria.map((criteria, index) => (
                                    <View key={index} style={styles.criteriaItem}>
                                        <View 
                                            style={[
                                                styles.criteriaDot, 
                                                { backgroundColor: password === '' ? Theme.colors.border : (criteria.met ? Theme.colors.success : Theme.colors.danger) }
                                            ]} 
                                        />
                                        <Text 
                                            style={[
                                                styles.criteriaText, 
                                                { color: password === '' ? Theme.colors.textSecondary : (criteria.met ? Theme.colors.success : Theme.colors.danger) }
                                            ]}
                                        >
                                            {criteria.label}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Confirm Password</Text>
                            <View style={styles.inputWrapper}>
                                <Lock size={20} color={Theme.colors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="••••••••"
                                    placeholderTextColor={Theme.colors.textSecondary}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!showPassword}
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.button, (loading || password === '' || confirmPassword === '') && styles.buttonDisabled]}
                            onPress={handleUpdatePassword}
                            disabled={loading || password === '' || confirmPassword === ''}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Text style={styles.buttonText}>Update Password</Text>
                                    <ArrowRight size={20} color="#fff" />
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Theme.colors.secondary },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: Theme.colors.secondary },
    header: { marginBottom: 40, alignItems: 'center' },
    logo: { width: 80, height: 80, marginBottom: 20 },
    title: { fontSize: 32, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textPrimary, marginBottom: 8 },
    subtitle: { fontSize: 16, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary, textAlign: 'center' },
    form: { backgroundColor: Theme.colors.card, padding: 24, borderRadius: Theme.radius.lg, borderWidth: 1, borderColor: Theme.colors.border, shadowColor: Theme.colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
    inputContainer: { marginBottom: 20 },
    label: { fontSize: 14, fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.textPrimary, marginBottom: 8, marginLeft: 4 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.secondary, borderRadius: 12, paddingHorizontal: 16, height: 56, borderWidth: 1, borderColor: Theme.colors.border },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, color: Theme.colors.textPrimary, fontSize: 16, fontFamily: Theme.fonts.outfit.regular },
    button: { backgroundColor: Theme.colors.accent, height: 56, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, gap: 8, shadowColor: Theme.colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
    buttonDisabled: { opacity: 0.7, backgroundColor: Theme.colors.textSecondary },
    buttonText: { color: '#fff', fontSize: 16, fontFamily: Theme.fonts.outfit.bold },
    strengthMeterContainer: {
        height: 4,
        backgroundColor: Theme.colors.secondary,
        borderRadius: 2,
        marginTop: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    strengthMeterFill: {
        height: '100%',
        borderRadius: 2,
    },
    criteriaContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 12,
        gap: 8,
    },
    criteriaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.secondary,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    criteriaDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    criteriaText: {
        fontSize: 11,
        fontFamily: Theme.fonts.outfit.medium,
    },
});
