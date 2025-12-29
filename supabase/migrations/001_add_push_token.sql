-- Migration: Add expo_push_token to profiles table

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS expo_push_token text;

-- Optional: Create an index strictly for searching by token if needed (unlikely for typical user-centric queries but good for cleanup)
-- CREATE INDEX IF NOT EXISTS idx_profiles_expo_push_token ON public.profiles(expo_push_token);
