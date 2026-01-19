import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export const useSubscription = () => {
    const [user, setUser] = useState(null);
    const [tier, setTier] = useState('free');
    const [status, setStatus] = useState('active');
    const [expiresAt, setExpiresAt] = useState(null);
    const [lobbiesCreated, setLobbiesCreated] = useState(0);
    const [loading, setLoading] = useState(true);

    // Feature Flags & Limits
    const [maxLayouts, setMaxLayouts] = useState(1);
    const [maxAILobbies, setMaxAILobbies] = useState(2);
    const [canUseAI, setCanUseAI] = useState(true);
    const [canCustomSocial, setCanCustomSocial] = useState(false);
    const [isCasual, setIsCasual] = useState(true);

    useEffect(() => {
        const initUser = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            setUser(authUser);
            if (!authUser) setLoading(false);
        };
        initUser();
    }, []);

    useEffect(() => {
        if (!user) {
            return;
        }

        const fetchSubscription = async () => {
            try {
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('subscription_tier, subscription_status, subscription_expires_at, lobbies_created_count')
                    .eq('id', user.id)
                    .single();

                if (error) throw error;

                const currentTier = profile?.subscription_tier?.toLowerCase() || 'free';
                const currentStatus = profile?.subscription_status || 'active';
                const currentExpiresAt = profile?.subscription_expires_at;
                const count = profile?.lobbies_created_count || 0;

                setTier(currentTier);
                setStatus(currentStatus);
                setExpiresAt(currentExpiresAt);
                setLobbiesCreated(count);

                // Define Limits based on Tier
                let aiLimit = 2; // Default for Free
                let layoutLimit = 1;
                let customSocial = false;

                switch (currentTier) {
                    case 'masters':
                    case 'developer':
                        aiLimit = Infinity;
                        layoutLimit = Infinity;
                        customSocial = true;
                        break;
                    case 'premier':
                        aiLimit = 150;
                        layoutLimit = 5;
                        customSocial = true;
                        break;
                    case 'competitive':
                        aiLimit = 100;
                        layoutLimit = 5;
                        customSocial = true;
                        break;
                    case 'ranked':
                        aiLimit = 60;
                        layoutLimit = 3;
                        customSocial = true;
                        break;
                    case 'free':
                    default:
                        aiLimit = 2;
                        // Always 1 layout for casual/free
                        layoutLimit = 1;
                        customSocial = false;
                        break;
                }

                setMaxAILobbies(aiLimit);
                setCanUseAI(count < aiLimit);
                setIsCasual(currentTier === 'free' && count >= aiLimit);
                setMaxLayouts(layoutLimit);
                setCanCustomSocial(customSocial);

            } catch (err) {
                console.error('Error fetching subscription:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchSubscription();

        // Realtime subscription for profile updates
        const channel = supabase
            .channel(`profile-${user.id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles',
                filter: `id=eq.${user.id}`
            }, () => {
                fetchSubscription();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    return {
        user,
        tier,
        status,
        expiresAt,
        lobbiesCreated,
        loading,
        limits: {
            maxAILobbies,
            maxLayouts,
        },
        features: {
            canUseAI,
            canCustomSocial,
            isCasual
        }
    };
};
