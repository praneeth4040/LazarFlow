import { useState, useCallback } from 'react';
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
      Alert.alert('Login Failed', error.response?.data?.error || error.response?.data?.message || error.message || 'An error occurred');
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
      if (data.user || data.session) {
        console.log('✅ Registration successful');
        return data;
      }
    } catch (error: any) {
      console.error('Sign Up Error:', error);
      Alert.alert('Registration Failed', error.response?.data?.error || error.response?.data?.message || error.message || 'An error occurred');
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
      Alert.alert('Error', error.response?.data?.error || error.response?.data?.message || error.message || 'An error occurred');
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
