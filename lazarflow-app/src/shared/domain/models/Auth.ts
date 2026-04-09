export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  expires_at?: number;
  user: {
    id: string;
    email?: string;
    [key: string]: any;
  };
}

export interface AuthResponse {
  session: AuthSession;
  user: any;
  message?: string;
  error?: string;
}

export interface LoginCredentials {
  email: string;
  password?: string;
  otp?: string;
}

export interface RegisterCredentials extends LoginCredentials {
  data?: Record<string, any>;
}
