create table public.themes ( 
   id uuid not null default gen_random_uuid (), 
   user_id uuid null, 
   name text not null, 
   url text not null, 
   status text null default 'pending'::text, 
   created_at timestamp with time zone null default now(), 
   updated_at timestamp with time zone null default now(), 
   mapping_config jsonb null default '{}'::jsonb, 
   constraint themes_pkey primary key (id), 
   constraint themes_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE, 
   constraint themes_status_check check ( 
     ( 
       status = any ( 
         array[ 
           'pending'::text, 
           'verified'::text, 
           'rejected'::text 
         ] 
       ) 
     ) 
   ) 
 ) TABLESPACE pg_default;

-- Enable Row Level Security (RLS)
ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to view verified themes (Community Designs)
CREATE POLICY "Public themes are viewable by everyone" 
ON public.themes FOR SELECT 
USING (status = 'verified');

-- Policy: Allow users to view their own themes (regardless of status)
CREATE POLICY "Users can view own themes" 
ON public.themes FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Allow users to upload their own themes
CREATE POLICY "Users can insert own themes" 
ON public.themes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy: Allow users to update their own themes
CREATE POLICY "Users can update own themes" 
ON public.themes FOR UPDATE 
USING (auth.uid() = user_id);

-- Policy: Allow users to delete their own themes
CREATE POLICY "Users can delete own themes" 
ON public.themes FOR DELETE 
USING (auth.uid() = user_id);
