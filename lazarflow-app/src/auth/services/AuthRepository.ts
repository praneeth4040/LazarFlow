import { BaseRepository } from '../../shared/infrastructure/repositories/BaseRepository';
import { AuthResponse, LoginCredentials, RegisterCredentials } from '../types';
import { supabase } from '../../lib/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authEvents } from '../../lib/authEvents';

export class AuthRepository extends BaseRepository {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.post<AuthResponse>('/api/auth/login', credentials);
    if (response.session) {
      await this.syncSession(response.session);
    }
    return response;
  }

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const response = await this.post<AuthResponse>('/api/auth/register', credentials);
    if (response.session) {
      await this.syncSession(response.session);
    }
    return response;
  }

  async getMe(): Promise<any> {
    return this.get<any>('/api/auth/me');
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    return this.post<AuthResponse>('/api/auth/refresh', { refresh_token: refreshToken });
  }

  async resetPassword(email: string): Promise<any> {
    return this.post<any>('/api/auth/reset-password', { email });
  }

  async updatePassword(password: string): Promise<any> {
    return this.post<any>('/api/auth/update-password', { password });
  }

  async logout(): Promise<void> {
    try {
      await this.post('/api/auth/logout');
    } finally {
      await supabase.auth.signOut();
      await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'token_expiry']);
      authEvents.emit('SIGNED_OUT');
    }
  }

  private async syncSession(session: any): Promise<void> {
    const { access_token, refresh_token, expires_in } = session;
    
    await supabase.auth.setSession({
      access_token,
      refresh_token
    });

    await AsyncStorage.setItem('access_token', access_token);
    await AsyncStorage.setItem('refresh_token', refresh_token);
    
    if (expires_in) {
      const expiryTime = Date.now() + (expires_in * 1000);
      await AsyncStorage.setItem('token_expiry', String(expiryTime));
    }
    
    authEvents.emit('SIGNED_IN', { session });
  }
}

export const authRepository = new AuthRepository();
