import React, { createContext, useState, useEffect } from 'react';
import { authService } from '../lib/authService';

import { authEvents } from '../lib/authEvents';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const initUser = async () => {
        try {
            console.log('🔐 UserContext: Initializing user from getMe()...');
            const userData = await authService.getMe();
            
            if (userData) {
                // Store only essential data in context
                const safeUser = {
                    id: userData.id,
                    email: userData.email || userData.emails,
                    username: userData.username,
                    display_name: userData.display_name,
                    subscription_tier: userData.subscription_tier ? String(userData.subscription_tier).trim() : userData.subscription_tier,
                    phone: userData.phone,
                    created_at: userData.created_at,
                    last_sign_in_at: userData.last_sign_in_at,
                    lobbies_created_count: userData.lobbies_created_count
                };
                console.log('✅ UserContext: User loaded:', safeUser.id);
                setUser(safeUser);
            } else {
                setUser(null);
            }
            setError(null);
        } catch (err) {
            console.error('❌ UserContext: Failed to load user:', err.message);
            setError(err);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        initUser();

        // Listen for auth events
        const unsubscribeSignIn = authEvents.on('SIGNED_IN', async (data) => {
            console.log('🔐 UserContext: SIGNED_IN event received. Fetching fresh user data...');
            // Always fetch fresh data from /auth/me to ensure consistency
            await initUser();
        });

        const unsubscribeSignOut = authEvents.on('SIGNED_OUT', () => {
            console.log('👋 UserContext: SIGNED_OUT event received. Clearing user data.');
            setUser(null);
        });

        return () => {
            unsubscribeSignIn();
            unsubscribeSignOut();
        };
    }, []);

    // Helper function to update user after profile changes
    const refreshUser = async () => {
        console.log('🔄 UserContext: Refreshing user data via initUser...');
        await initUser();
    };

    return (
        <UserContext.Provider value={{ user, setUser, loading, error, refreshUser }}>
            {children}
        </UserContext.Provider>
    );
};
