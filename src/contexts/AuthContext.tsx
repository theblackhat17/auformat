'use client';

import { createContext, useContext, useCallback, type ReactNode } from 'react';
import { authClient } from '@/lib/auth-client';
import type { Profile } from '@/lib/types';

interface AuthContextType {
  isAuthenticated: boolean;
  profile: Profile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: { email: string; password: string; fullName?: string; companyName?: string; phone?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function mapUserToProfile(user: Record<string, unknown>): Profile {
  return {
    id: user.id as string,
    email: user.email as string,
    fullName: (user.fullName as string) || (user.name as string) || null,
    companyName: (user.companyName as string) || null,
    phone: (user.phone as string) || null,
    address: (user.address as string) || null,
    role: ((user.role as string) || 'client') as 'client' | 'admin',
    avatarUrl: (user.avatarUrl as string) || (user.image as string) || null,
    discountRate: (user.discountRate as number) || 0,
    createdAt: String(user.createdAt || ''),
    updatedAt: String(user.updatedAt || ''),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();

  const profile: Profile | null = session?.user
    ? mapUserToProfile(session.user as unknown as Record<string, unknown>)
    : null;

  const login = useCallback(async (email: string, password: string) => {
    try {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        return { success: false, error: result.error.message || 'Erreur de connexion' };
      }
      return { success: true };
    } catch {
      return { success: false, error: 'Erreur de connexion au serveur' };
    }
  }, []);

  const register = useCallback(async (formData: { email: string; password: string; fullName?: string; companyName?: string; phone?: string }) => {
    try {
      const result = await authClient.signUp.email({
        email: formData.email,
        password: formData.password,
        name: formData.fullName || formData.email.split('@')[0],
        companyName: formData.companyName || undefined,
        phone: formData.phone || undefined,
      } as Parameters<typeof authClient.signUp.email>[0]);
      if (result.error) {
        return { success: false, error: result.error.message || "Erreur lors de l'inscription" };
      }
      return { success: true };
    } catch {
      return { success: false, error: 'Erreur de connexion au serveur' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authClient.signOut();
    } catch {
      // ignore
    }
    window.location.href = '/';
  }, []);

  const refreshProfile = useCallback(async () => {
    // Better Auth handles session refresh automatically via useSession
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!profile,
        profile,
        isLoading: isPending,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
