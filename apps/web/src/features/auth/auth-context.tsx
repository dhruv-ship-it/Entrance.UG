import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, ApiError } from '../../lib/api';

export type Role = 'STUDENT' | 'PARENT' | 'MENTOR' | 'ADMIN';
export type AuthUser = { id: string; name: string; email: string; role: Role; profileImage: string | null; adminRole: string | null };

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (input: { role: Role; email: string; password: string }) => Promise<AuthUser>;
  signup: (input: Record<string, unknown>) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const dashboardPath = (user: AuthUser) => user.role === 'STUDENT' ? '/student/dashboard' : '/access/pending';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    try {
      const result = await api<{ user: AuthUser }>('/api/v1/auth/me');
      setUser(result.user);
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) console.error(error);
      setUser(null);
    } finally { setIsLoading(false); }
  };

  useEffect(() => { void refresh(); }, []);

  const login = async (input: { role: Role; email: string; password: string }) => {
    const result = await api<{ user: AuthUser }>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify(input) });
    setUser(result.user);
    return result.user;
  };

  const signup = async (input: Record<string, unknown>) => {
    const result = await api<{ user: AuthUser }>('/api/v1/auth/student/signup', { method: 'POST', body: JSON.stringify(input) });
    setUser(result.user);
    return result.user;
  };

  const logout = async () => { await api('/api/v1/auth/logout', { method: 'POST' }); setUser(null); };

  return <AuthContext.Provider value={{ user, isLoading, login, signup, logout, refresh }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
};

