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
