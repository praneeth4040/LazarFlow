import { useState, useCallback } from 'react';
import { extractApiErrorMessage } from '../../lib/apiClient';
import { authRepository } from '../services/AuthRepository';
import { LoginCredentials, RegisterCredentials } from '../types';
import { CustomAlert as Alert } from '../../lib/AlertService';

export const useAuth = () => {
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (credentials: LoginCredentials) => {
    if (!credentials.email || !credentials.password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const data = await authRepository.login(credentials);
      if (data.user || data.session) {
        console.log('✅ Login successful, session established');
        return data;
      }
    } catch (error: any) {
      console.error('Login Error:', error);
      if (error.code === 'DEVICE_LIMIT_EXCEEDED' || error.response?.data?.detail?.code === 'DEVICE_LIMIT_EXCEEDED') {
        Alert.alert(
          'Device Limit Reached',
          "You've reached the 10-device switch limit for this month. Please use your registered device or wait until next month."
        );
      } else {
        Alert.alert('Login Failed', extractApiErrorMessage(error, 'Login failed. Please check your email and password.'));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const signUp = useCallback(async (credentials: RegisterCredentials) => {
    if (!credentials.email || !credentials.password) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const data = await authRepository.register(credentials);
      if ((data as any).requires_email_confirmation) {
        // Email confirmation is enabled in Supabase — registration succeeded
        // but no session is issued until the user confirms their email.
        Alert.alert(
          'Check Your Email 📧',
          'Account created! Please check your email and click the confirmation link before signing in.'
        );
        return data;
      }
      if (data.user || data.session) {
        console.log('✅ Registration successful');
        return data;
      }
    } catch (error: any) {
      console.error('Sign Up Error:', error);
      Alert.alert('Registration Failed', extractApiErrorMessage(error, 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    setLoading(true);
    try {
      await authRepository.resetPassword(email);
      Alert.alert('Success', 'Password reset instructions sent to your email');
    } catch (error: any) {
      console.error('Reset Password Error:', error);
      Alert.alert('Error', extractApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    login,
    signUp,
    resetPassword,
  };
};
