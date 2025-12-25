import { supabase } from './supabaseClient';

export const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user || null;
};

export const getUserThemes = async () => {
    const user = await getCurrentUser();
    if (!user) return [];

    // In our mobile schema, we might have a different way of storing themes or it might strictly follow web.
    // Fetching from profiles table like web:
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('theme_config')
        .eq('id', user.id)
        .single();

    if (error) return [];

    const tc = profile?.theme_config;
    if (Array.isArray(tc)) return tc;
    if (tc && typeof tc === 'object') return [tc];
    return [];
};
