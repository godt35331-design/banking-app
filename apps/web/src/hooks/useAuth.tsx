import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError, setToken, getToken } from '../lib/api';

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
  login: (email: string, password: string, pin: string, captchaToken?: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; pin: string; phone?: string; captchaToken?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  const refresh = useCallback(async () => {
    // Retry while the server wakes up; only a 401 from the server means the sign-in is really gone.
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const u = await api.get<User>('/auth/me');
        setUser(u);
        setLoading(false);
        return;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          setToken(null);
          setUser(null);
          setLoading(false);
          return;
        }
        if (!getToken()) break;
        await new Promise(r => setTimeout(r, 3000));
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (email: string, password: string, pin: string, captchaToken?: string) => {
    const res = await api.post<User & { token?: string }>('/auth/login', { email, password, pin, captchaToken });
    qc.clear();
    if (res.token) setToken(res.token);
    const { token: _, ...u } = res as any;
    setUser(u);
  };

  const register = async (data: { name: string; email: string; password: string; pin: string; phone?: string; captchaToken?: string }) => {
    const res = await api.post<User & { token?: string }>('/auth/register', data);
    qc.clear();
    if (res.token) setToken(res.token);
    const { token: _, ...u } = res as any;
    setUser(u);
  };

  const logout = async () => {
    await api.post('/auth/logout').catch(() => {});
    setToken(null);
    setUser(null);
    qc.clear();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
