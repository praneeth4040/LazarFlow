import { Context } from 'react';

interface User {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  subscription_tier: string | null;
  subscription_status: string | null;
  subscription_expires_at: string | null;
  is_admin: boolean;
  feature_flags: Record<string, any>;
  phone: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  lobbies_created_count: number;
  themes_count: number;
  flux_balance: number;
}

interface UserContextValue {
  user: User | null;
  loading: boolean;
  error: any;
  setUser: (user: User | null) => void;
  refreshUser: () => Promise<void>;
}

export const UserContext: Context<UserContextValue>;
export const UserProvider: React.FC<{ children: React.ReactNode }>;
