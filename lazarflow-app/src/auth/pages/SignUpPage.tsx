import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle, Circle } from 'lucide-react-native';
import { Theme } from '../../styles/theme';
import { useAuth } from '../hooks/useAuth';
import { AuthInput } from '../components/AuthInput';

interface SignUpPageProps {
  navigation: any;
}

export const SignUpPage: React.FC<SignUpPageProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [subscribeEmail, setSubscribeEmail] = useState(true);
  const { loading, signUp } = useAuth();

  const handleSignUp = async () => {
    if (!agreeTerms) {
      return;
    }
    await signUp({ 
      email, 
      password, 
      data: { marketing_opt_in: subscribeEmail } 
    });
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
            <Text style={styles.topBadge}>SIGN UP</Text>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Get Started</Text>
            <Text style={styles.subtitle}>Join thousands of lobby organizers</Text>
          </View>

          <View style={styles.form}>
            <AuthInput
              label="Email Address"
              placeholder="name@company.com"
              value={email}
              onChangeText={setEmail}
              icon={<Mail size={20} color={Theme.colors.textSecondary} />}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <View style={styles.inputContainer}>
              <AuthInput
                label="Password"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                icon={<Lock size={20} color={Theme.colors.textSecondary} />}
                secureTextEntry={!showPassword}
                rightIcon={
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={20} color={Theme.colors.textSecondary} /> : <Eye size={20} color={Theme.colors.textSecondary} />}
                  </TouchableOpacity>
                }
              />
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
  hint: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    marginTop: 4,
    marginLeft: 4,
  },
  checkboxContainer: {
    marginBottom: 24,
    gap: 16,
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
    fontFamily: Theme.fonts.outfit.regular,
    color: Theme.colors.textPrimary,
    lineHeight: 20,
  },
  link: {
    color: Theme.colors.accent,
    fontFamily: Theme.fonts.outfit.bold,
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
});
