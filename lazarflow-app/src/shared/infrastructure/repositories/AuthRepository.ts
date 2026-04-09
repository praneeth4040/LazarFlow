import { BaseRepository } from './BaseRepository';
import { AuthResponse, LoginCredentials, RegisterCredentials } from '../../domain/models/Auth';
import { User } from '../../domain/models/User';
import { supabase } from '../../../lib/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authEvents } from '../../../lib/authEvents';

export class AuthRepository extends BaseRepository {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.post<AuthResponse>('/api/auth/login', credentials);
    if (response.session?.access_token) {
      await this.syncSession(response.session);
    }
    return response;
  }

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const response = await this.post<AuthResponse>('/api/auth/register', credentials);
    if (response.session?.access_token) {
      await this.syncSession(response.session);
    }
    return response;
  }

  async getMe(): Promise<User> {
    return this.get<User>('/api/auth/me');
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
