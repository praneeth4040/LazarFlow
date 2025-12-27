import { supabase } from './supabaseClient';

export const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user || null;
};

export const getUserThemes = async () => {
    const user = await getCurrentUser();
    if (!user) return [];

    const { data: themes, error } = await supabase
        .from('themes')
        .select('*, mapping_config')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching themes:', error);
        return [];
    }

    return themes || [];
};
