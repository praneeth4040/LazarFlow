import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react-native';
import { Theme } from '../../styles/theme';
import { useAuth } from '../hooks/useAuth';
import { AuthInput } from '../components/AuthInput';

interface LoginPageProps {
  navigation: any;
}

export const LoginPage: React.FC<LoginPageProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { loading, login } = useAuth();

  const handleLogin = async () => {
    await login({ email, password });
  };

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
            <Text style={styles.topBadge}>LOGIN</Text>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue to LazarFlow</Text>
          </View>

          <View style={styles.form}>
            <AuthInput
              label="Email Address"
              placeholder="your@email.com"
              value={email}
              onChangeText={setEmail}
              icon={<Mail size={20} color={Theme.colors.textSecondary} />}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <View style={styles.passwordContainer}>
              <View style={styles.labelRow}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('ForgotPassword')}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>
              <AuthInput
                label="Password"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                icon={<Lock size={20} color={Theme.colors.textSecondary} />}
                secureTextEntry={!showPassword}
                rightIcon={
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                      <EyeOff size={20} color={Theme.colors.textSecondary} />
                    ) : (
                      <Eye size={20} color={Theme.colors.textSecondary} />
                    )}
                  </TouchableOpacity>
                }
              />
            </View>

            <TouchableOpacity
              style={[styles.button, (loading || email === '' || password === '') && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading || email === '' || password === ''}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Login</Text>
                  <ArrowRight size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                <Text style={styles.footerLink}>Sign up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    fontWeight: '800',
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
    fontWeight: 'bold',
    color: Theme.colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
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
  passwordContainer: {
    position: 'relative',
  },
  labelRow: {
    position: 'absolute',
    top: 0,
    right: 4,
    zIndex: 1,
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
  forgotPasswordText: {
    color: Theme.colors.accent,
    fontSize: 14,
    fontFamily: Theme.fonts.outfit.semibold,
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
});
