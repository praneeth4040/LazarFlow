import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Image, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Linking } from 'react-native';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, CheckCircle, Circle } from 'lucide-react-native';
import { supabase } from '../lib/supabaseClient';
import { Theme } from '../styles/theme';

const SignUpScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [agreeTerms, setAgreeTerms] = useState(false);
    const [subscribeEmail, setSubscribeEmail] = useState(true);

    const handleSignUp = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (!agreeTerms) {
            Alert.alert('Terms & Conditions', 'Please agree to the Terms and Privacy Policy to continue.');
            return;
        }

        setLoading(true);

        try {
            // Check if email already exists in profiles table
            const { data: existingUser, error: checkError } = await supabase
                .from('profiles')
                .select('emails')
                .eq('emails', email.toLowerCase())
                .single();

            if (existingUser) {
                setLoading(false);
                Alert.alert('Sign Up Failed', 'An account with this email already exists. Please sign in instead.');
                return;
            }

            const { data, error } = await supabase.auth.signUp({
                email: email.toLowerCase(),
                password,
                options: {
                    data: {
                        username: email.toLowerCase().split('@')[0] + '_' + Math.floor(Math.random() * 1000),
                        display_name: email.toLowerCase().split('@')[0],
                        marketing_opt_in: subscribeEmail
                    }
                }
            });

            if (error) throw error;

            Alert.alert('Success', 'Account created! Please check your email to confirm.', [
                { text: 'OK', onPress: () => navigation.navigate('Login') }
            ]);

        } catch (error) {
            let errorMessage = error.message || 'An error occurred';
            
            // Handle specific Supabase Auth errors
            if (errorMessage.includes('User already registered') || errorMessage.includes('Email already in use')) {
                errorMessage = 'An account with this email already exists. Please sign in instead.';
            }
            
            Alert.alert('Sign Up Failed', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : null}
            style={styles.container}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                style={{ backgroundColor: Theme.colors.secondary }}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.header}>
                    <Text style={styles.topBadge}>SIGN UP</Text>
                    <Image
                        source={require('../../assets/logo.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <Text style={styles.title}>Get Started</Text>
                    <Text style={styles.subtitle}>Join thousands of lobby organizers</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Email Address</Text>
                        <View style={styles.inputWrapper}>
                            <Mail size={20} color={Theme.colors.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="name@company.com"
                                placeholderTextColor={Theme.colors.textSecondary}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Password</Text>
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
                        <Text style={styles.hint}>Must be at least 6 characters</Text>
                    </View>

                    <View style={styles.checkboxContainer}>
                        <TouchableOpacity 
                            style={styles.checkboxWrapper} 
                            onPress={() => setAgreeTerms(!agreeTerms)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.checkbox}>
                                {agreeTerms ? (
                                    <CheckCircle size={20} color={Theme.colors.accent} fill={Theme.colors.accent + '20'} />
                                ) : (
                                    <Circle size={20} color={Theme.colors.border} />
                                )}
                            </View>
                            <Text style={styles.checkboxLabel}>
                                I agree to the <Text style={styles.link} onPress={() => Linking.openURL('https://lazarflow.app/terms')}>Terms</Text> and <Text style={styles.link} onPress={() => Linking.openURL('https://lazarflow.app/privacy')}>Privacy Policy</Text>
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.checkboxWrapper} 
                            onPress={() => setSubscribeEmail(!subscribeEmail)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.checkbox}>
                                {subscribeEmail ? (
                                    <CheckCircle size={20} color={Theme.colors.accent} fill={Theme.colors.accent + '20'} />
                                ) : (
                                    <Circle size={20} color={Theme.colors.border} />
                                )}
                            </View>
                            <Text style={styles.checkboxLabel}>Subscribe to receive updates and news</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.button, (loading || email === '' || password === '' || !agreeTerms) && styles.buttonDisabled]}
                        onPress={handleSignUp}
                        disabled={loading || email === '' || password === '' || !agreeTerms}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Text style={styles.buttonText}>Get Started</Text>
                                <ArrowRight size={20} color="#fff" />
                            </>
                        )}
                    </TouchableOpacity>



                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Already have an account?</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.footerLink}>Sign in</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.secondary,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
        backgroundColor: Theme.colors.secondary,
    },
    header: {
        marginBottom: 30,
        alignItems: 'center',
    },
    topBadge: {
        backgroundColor: Theme.colors.accent + '20',
        color: Theme.colors.accent,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        fontSize: 12,
        fontFamily: Theme.fonts.outfit.bold,
        letterSpacing: 1,
        marginBottom: 16,
        overflow: 'hidden',    
    },
    logo: {
        width: 80,
        height: 80,
        marginBottom: 20,
    },
    title: {
        fontSize: 32,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textPrimary,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.regular,
        color: Theme.colors.textSecondary,
    },
    form: {
        backgroundColor: Theme.colors.card,
        padding: 24,
        borderRadius: Theme.radius.lg,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        shadowColor: Theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.semibold,
        color: Theme.colors.textPrimary,
        marginBottom: 8,
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.secondary,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 56,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: Theme.colors.textPrimary,
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.regular,
    },
    hint: {
        fontSize: 12,
        color: Theme.colors.textSecondary,
        marginTop: 4,
        marginLeft: 4,
    },
    button: {
        backgroundColor: Theme.colors.accent,
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        gap: 8,
        shadowColor: Theme.colors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    buttonDisabled: {
        opacity: 0.7,
        backgroundColor: Theme.colors.textSecondary,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.bold,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 40,
        gap: 4,
    },
    footerText: {
        color: Theme.colors.textSecondary,
        fontSize: 15,
        fontFamily: Theme.fonts.outfit.regular,
    },
    footerLink: {
        color: Theme.colors.accent,
        fontSize: 15,
        fontFamily: Theme.fonts.outfit.bold,
    },
    checkboxContainer: {
        marginTop: 10,
        marginBottom: 20,
        gap: 12,
    },
    checkboxWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    checkbox: {
        marginTop: 2,
    },
    checkboxLabel: {
        flex: 1,
        fontSize: 14,
        color: Theme.colors.textSecondary,
        lineHeight: 20,
    },
    link: {
        color: Theme.colors.accent,
        fontWeight: '600',
    },
});

export default SignUpScreen;
