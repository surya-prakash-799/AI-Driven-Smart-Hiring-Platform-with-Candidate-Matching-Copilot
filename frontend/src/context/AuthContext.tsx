import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  clearStoredToken,
  fetchCurrentUser,
  getStoredToken,
  loginRequest,
  registerRequest,
  storeToken,
} from '../services/api';
import type { AuthUser } from '../types/api';

interface AuthContextValue {
  user: AuthUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_KEY = 'rc_auth_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const token = getStoredToken();
      if (!token) {
        localStorage.removeItem(SESSION_KEY);
        setUser(null);
        setReady(true);
        return;
      }
      try {
        const currentUser = await fetchCurrentUser();
        if (cancelled) return;
        localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
        setUser(currentUser);
      } catch {
        clearStoredToken();
        if (!cancelled) {
          localStorage.removeItem(SESSION_KEY);
          setUser(null);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await loginRequest(email.trim().toLowerCase(), password);
    storeToken(response.access_token);
    localStorage.setItem(SESSION_KEY, JSON.stringify(response.user));
    setUser(response.user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const response = await registerRequest(name.trim(), email.trim().toLowerCase(), password);
    storeToken(response.access_token);
    localStorage.setItem(SESSION_KEY, JSON.stringify(response.user));
    setUser(response.user);
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, ready, login, register, logout }), [user, ready, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
