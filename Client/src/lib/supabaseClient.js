import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://xsxwzwcfaflzynsyryzq.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzeHd6d2NmYWZsenluc3lyeXpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMDQyMzcsImV4cCI6MjA3ODY4MDIzN30.gVrqiCAlqHNH9MnQj59qkW1afaEehwCEiSN7vSjrL3U'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
