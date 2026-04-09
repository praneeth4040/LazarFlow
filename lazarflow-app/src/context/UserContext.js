import React, { createContext, useEffect, useReducer } from 'react';
import { authService } from '../lib/authService';
import { authEvents } from '../lib/authEvents';
import { userReducer, initialState, USER_ACTIONS } from './userReducer';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [state, dispatch] = useReducer(userReducer, initialState);

    const initUser = async () => {
        try {
            console.log('🔐 UserContext: Initializing user from getMe()...');
            dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
            const userData = await authService.getMe();
            
            if (userData) {
                // Store only essential data in context
                const safeUser = {
                    id: userData.id,
                    email: userData.emails || userData.email,
                    username: userData.username,
                    display_name: userData.display_name,
                    avatar_url: userData.avatar_url,
                    subscription_tier: userData.subscription_tier ? String(userData.subscription_tier).trim() : userData.subscription_tier,
                    subscription_status: userData.subscription_status,
                    subscription_expires_at: userData.subscription_expires_at,
                    is_admin: userData.is_admin || false,
                    feature_flags: userData.feature_flags || {},
                    phone: userData.phone,
                    created_at: userData.created_at,
                    last_sign_in_at: userData.last_sign_in_at,
                    lobbies_created_count: userData.lobbies_created_count || 0,
                    themes_count: userData.themes_count || userData.themes?.length || 0,
                    flux_balance: userData.flux_balance || 0
                };
                console.log('✅ UserContext: User loaded:', safeUser.id);
                dispatch({ type: USER_ACTIONS.SET_USER, payload: safeUser });
            } else {
                dispatch({ type: USER_ACTIONS.CLEAR_USER });
            }
        } catch (err) {
            console.error('❌ UserContext: Failed to initialize user session:', err.message);
            dispatch({ type: USER_ACTIONS.SET_ERROR, payload: err });
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
            dispatch({ type: USER_ACTIONS.CLEAR_USER });
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

    const setUser = (user) => dispatch({ type: USER_ACTIONS.SET_USER, payload: user });

    return (
        <UserContext.Provider value={{ 
            user: state.user, 
            loading: state.loading, 
            error: state.error, 
            setUser, 
            refreshUser 
        }}>
            {children}
        </UserContext.Provider>
    );
};
