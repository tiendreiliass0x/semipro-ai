/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';

interface AuthContextType {
  isAuthenticated: boolean;
  isVerifying: boolean;
  error: string | null;
  user: { id: string; email: string; name: string } | null;
  account: { id: string; name: string; slug: string } | null;
  memberships: Array<{ accountId: string; accountName: string; accountSlug: string; accountPlan: string; role: string }>;
  login: (payload: { email: string; password: string; accountSlug?: string }) => Promise<boolean>;
  register: (payload: { email: string; password: string; accountName?: string }) => Promise<boolean>;
  loginWithGoogle: (payload: { idToken: string; accountName?: string; accountSlug?: string }) => Promise<boolean>;
  switchWorkspace: (payload: { accountId?: string; accountSlug?: string }) => Promise<boolean>;
  updateAccountProfile: (payload: { name: string; slug?: string }) => Promise<boolean>;
  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null);
  const [account, setAccount] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [memberships, setMemberships] = useState<Array<{ accountId: string; accountName: string; accountSlug: string; accountPlan: string; role: string }>>([]);

  const refreshAuth = useCallback(async () => {
    setIsVerifying(true);
    setError(null);

    try {
      const me = await api.getCurrentUser();
      setIsAuthenticated(true);
      setUser(me.user);
      setAccount(me.account);
      setMemberships(me.memberships || []);
    } catch {
      setIsAuthenticated(false);
      setUser(null);
      setAccount(null);
      setMemberships([]);
      setError(null);
    } finally {
      setIsVerifying(false);
    }
  }, []);

  const login = useCallback(async (payload: { email: string; password: string; accountSlug?: string }): Promise<boolean> => {
    setIsVerifying(true);
    setError(null);
    try {
      const response = await api.login(payload);
      api.setAuthToken(response.token);
      setIsAuthenticated(true);
      setUser(response.user);
      setAccount({ id: response.account.id, name: response.account.name, slug: response.account.slug });
      setMemberships(response.memberships || []);
      return true;
    } catch (err) {
      setIsAuthenticated(false);
      setUser(null);
      setAccount(null);
      setMemberships([]);
      setError(err instanceof Error ? err.message : 'Login failed');
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, []);

  const register = useCallback(async (payload: { email: string; password: string; accountName?: string }): Promise<boolean> => {
    setIsVerifying(true);
    setError(null);
    try {
      const response = await api.register(payload);
      api.setAuthToken(response.token);
      setIsAuthenticated(true);
      setUser(response.user);
      setAccount({ id: response.account.id, name: response.account.name, slug: response.account.slug });
      setMemberships(response.memberships || []);
      return true;
    } catch (err) {
      setIsAuthenticated(false);
      setUser(null);
      setAccount(null);
      setMemberships([]);
      setError(err instanceof Error ? err.message : 'Registration failed');
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, []);

  const loginWithGoogle = useCallback(async (payload: { idToken: string; accountName?: string; accountSlug?: string }): Promise<boolean> => {
    setIsVerifying(true);
    setError(null);
    try {
      const response = await api.loginWithGoogle(payload);
      api.setAuthToken(response.token);
      setIsAuthenticated(true);
      setUser(response.user);
      setAccount({ id: response.account.id, name: response.account.name, slug: response.account.slug });
      setMemberships(response.memberships || []);
      return true;
    } catch (err) {
      setIsAuthenticated(false);
      setUser(null);
      setAccount(null);
      setMemberships([]);
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, []);

  const switchWorkspace = useCallback(async (payload: { accountId?: string; accountSlug?: string }): Promise<boolean> => {
    setIsVerifying(true);
    setError(null);
    try {
      const response = await api.switchAccount(payload);
      api.setAuthToken(response.token);
      setAccount({ id: response.account.id, name: response.account.name, slug: response.account.slug });
      setMemberships(response.memberships || []);
      await refreshAuth();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch workspace');
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, [refreshAuth]);

  const updateAccountProfile = useCallback(async (payload: { name: string; slug?: string }): Promise<boolean> => {
    setIsVerifying(true);
    setError(null);
    try {
      const response = await api.updateAccount(payload);
      setAccount({ id: response.account.id, name: response.account.name, slug: response.account.slug });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update account');
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // ignore logout transport failures
    }
    api.setAuthToken(null);
    setIsAuthenticated(false);
    setUser(null);
    setAccount(null);
    setMemberships([]);
    setError(null);
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isVerifying,
        error,
        user,
        account,
        memberships,
        login,
        register,
        loginWithGoogle,
        switchWorkspace,
        updateAccountProfile,
        refreshAuth,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
