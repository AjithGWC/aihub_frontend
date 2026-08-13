import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { API_BASE_URL } from '@/lib/apiBase';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
  department: string;
  isSystemAdmin: boolean;
  canAccessAdminPortal: boolean;
}

export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface SessionState {
  user: SessionUser | null;
  status: SessionStatus;
  login: (email: string, password: string) => Promise<SessionUser>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionState>({
  user: null,
  status: 'loading',
  login: async () => {
    throw new Error('SessionProvider is missing from the component tree');
  },
  logout: async () => {},
});

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}/api${path}`, {
    ...init,
    credentials: 'include',
    headers: init.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [status, setStatus] = useState<SessionStatus>('loading');

  useEffect(() => {
    request<{ user: SessionUser }>('/auth/me')
      .then(({ user }) => {
        setUser(user);
        setStatus('authenticated');
      })
      .catch(() => {
        setUser(null);
        setStatus('unauthenticated');
      });
  }, []);

  const login = async (email: string, password: string) => {
    const { user } = await request<{ user: SessionUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setUser(user);
    setStatus('authenticated');
    return user;
  };

  const logout = async () => {
    await request('/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
    setStatus('unauthenticated');
  };

  return (
    <SessionContext.Provider value={{ user, status, login, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);
