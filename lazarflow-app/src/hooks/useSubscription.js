import { useState, useEffect } from 'react';
import { authService } from '../lib/authService';

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
            const authUser = await authService.getMe();
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
                // Use the user data directly from the state which was fetched via getMe()
                const currentTier = user?.subscription_tier?.toLowerCase() || 'free';
                const currentStatus = user?.subscription_status || 'active';
                const currentExpiresAt = user?.subscription_expires_at;
                const count = user?.lobbies_created_count || 0;

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

        // Realtime subscription removed as part of migration
        return () => {
            
        };
    }, [user]);

    return {
        user,
        tier,
        status,
        expiresAt,
        lobbiesCreated,
        loading,
        maxAILobbies,
        maxLayouts,
        canUseAI,
        canCustomSocial,
        isCasual,
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
