import React, { createContext, useState, useEffect } from 'react';
import { authService } from '../lib/authService';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const initUser = async () => {
            try {
                console.log('🔐 UserContext: Initializing user from getMe()...');
                const userData = await authService.getMe();
                console.log('✅ UserContext: User loaded:', userData?.id);
                setUser(userData);
                setError(null);
            } catch (err) {
                console.error('❌ UserContext: Failed to load user:', err.message);
                setError(err);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        initUser();
    }, []);

    // Helper function to update user after profile changes
    const refreshUser = async () => {
        try {
            console.log('🔄 UserContext: Refreshing user data...');
            const userData = await authService.getMe();
            setUser(userData);
        } catch (err) {
            console.error('❌ UserContext: Failed to refresh user:', err);
        }
    };

    return (
        <UserContext.Provider value={{ user, setUser, loading, error, refreshUser }}>
            {children}
        </UserContext.Provider>
    );
};
