import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { api, setToken, getToken } from '../lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'CUSTOMER' | 'ADMIN';
  status: string;
  kycStatus?: 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  mainCurrency: string;
  wallets?: any[];
  createdAt: string;
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, pin: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; pin: string; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) { setLoading(false); return; }
    try {
      const u = await api.get<User>('/auth/me');
      setUser(u);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (email: string, password: string, pin: string) => {
    const res = await api.post<User & { token?: string }>('/auth/login', { email, password, pin });
    if (res.token) setToken(res.token);
    const { token: _, ...u } = res as any;
    setUser(u);
  };

  const register = async (data: { name: string; email: string; password: string; pin: string; phone?: string }) => {
    const res = await api.post<User & { token?: string }>('/auth/register', data);
    if (res.token) setToken(res.token);
    const { token: _, ...u } = res as any;
    setUser(u);
  };

  const logout = async () => {
    await api.post('/auth/logout').catch(() => {});
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
