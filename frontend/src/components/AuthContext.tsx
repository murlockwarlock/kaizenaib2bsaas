'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
    email: string;
    is_superuser: boolean;
    is_verified: boolean;
    balance?: number;
    display_name?: string | null;
    avatar_url?: string | null;
    moderation_notice?: string | null;
    moderation_required?: boolean;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (token: string, redirectTo?: string) => Promise<void>;
    setSession: (token: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoading: true,
    login: async () => { },
    setSession: async () => { },
    logout: async () => { },
    refreshUser: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const lastRefreshRef = useRef(0);
    const REFRESH_COOLDOWN_MS = 60000;

    const fetchUser = useCallback(async () => {
        try {
            const response = await fetch('/api/v1/auth/me', {
                credentials: 'same-origin',
            });

            if (!response.ok) {
                throw new Error('Failed to load user');
            }

            const userData = await response.json();
            setUser(userData as User);
        } catch {
            setUser(null);
        }
    }, []);

    useEffect(() => {
        fetchUser().finally(() => setIsLoading(false));
    }, [fetchUser]);

    const setSession = useCallback(async (token: string) => {
        const response = await fetch('/api/auth/session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token }),
            credentials: 'same-origin',
        });

        if (!response.ok) {
            throw new Error('Failed to establish session');
        }

        await fetchUser();
    }, [fetchUser]);

    const login = useCallback(async (token: string, redirectTo: string = '/dashboard') => {
        await setSession(token);
        router.push(redirectTo);
        router.refresh();
    }, [router, setSession]);

    const logout = useCallback(async () => {
        const response = await fetch('/api/auth/session', {
            method: 'DELETE',
            credentials: 'same-origin',
        });

        if (!response.ok) {
            throw new Error('Failed to clear session');
        }

        setUser(null);
        router.push('/login');
        router.refresh();
    }, [router]);

    const refreshUser = useCallback(async () => {
        lastRefreshRef.current = Date.now();
        await fetchUser();
    }, [fetchUser]);

    useEffect(() => {
        if (!user) {
            return;
        }

        const maybeRefreshUser = () => {
            if (document.visibilityState === 'hidden') return;
            const now = Date.now();
            if (now - lastRefreshRef.current < REFRESH_COOLDOWN_MS) return;
            void refreshUser();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                maybeRefreshUser();
            }
        };

        window.addEventListener('focus', maybeRefreshUser);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('globus:user-refresh', maybeRefreshUser as EventListener);

        return () => {
            window.removeEventListener('focus', maybeRefreshUser);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('globus:user-refresh', maybeRefreshUser as EventListener);
        };
    }, [refreshUser, user]);

    return (
        <AuthContext.Provider value={{ user, isLoading, login, setSession, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
