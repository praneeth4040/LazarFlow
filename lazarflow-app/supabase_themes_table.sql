-- SQL to create the 'themes' table for Design Verification Flow
-- Run this in your Supabase SQL Editor

-- 1. Create the themes table
CREATE TABLE IF NOT EXISTS public.themes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
    mapping_config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies

-- Policy: Users can view their own themes
CREATE POLICY "Users can view their own themes" 
ON public.themes FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Users can insert their own themes
CREATE POLICY "Users can insert their own themes" 
ON public.themes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can do everything (optional/example)
-- CREATE POLICY "Admins have full access" ON public.themes 
-- FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 4. Enable Realtime (optional but recommended for syncing)
ALTER PUBLICATION supabase_realtime ADD TABLE themes;
