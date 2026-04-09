import { useState, useEffect, useContext } from 'react';
import { UserContext } from '../context/UserContext';

export const useSubscription = () => {
    const { user, loading: userLoading } = useContext(UserContext);
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
        if (!user) {
            return;
        }

        const fetchSubscription = async () => {
            try {
                // Use the user data directly from context (already fetched)
                const currentTier = user?.subscription_tier?.toLowerCase() || 'free';
                const count = user?.lobbies_created_count || 0;
                const balance = user?.flux_balance || 0;

                setTier(currentTier);
                setLobbiesCreated(count);

                // With the new Credit System:
                // 1 Credit = 1 AI Lobby Automation
                // All other features (Custom Social, Multiple Layouts) are now unlocked for everyone
                setMaxAILobbies(balance);
                setCanUseAI(balance > 0);
                setIsCasual(balance === 0);
                setMaxLayouts(Infinity);
                setCanCustomSocial(true);

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
        loading: userLoading || loading,
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
