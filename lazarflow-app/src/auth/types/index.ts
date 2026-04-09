export interface User {
  id: string;
  email: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  subscription_tier?: string;
  subscription_status?: string;
  subscription_expires_at?: string;
  is_admin: boolean;
  feature_flags: Record<string, any>;
  phone?: string;
  created_at: string;
  last_sign_in_at?: string;
  lobbies_created_count: number;
  themes_count: number;
  flux_balance: number;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  user: User;
  expires_in?: number;
  expires_at?: number;
}

export interface AuthResponse {
  session?: AuthSession;
  user?: User;
  message?: string;
  error?: string;
}

export interface LoginCredentials {
  email: string;
  password?: string;
}

export interface RegisterCredentials extends LoginCredentials {
  data?: {
    username?: string;
    full_name?: string;
    [key: string]: any;
  };
}
