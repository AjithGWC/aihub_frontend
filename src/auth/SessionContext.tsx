import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { type SessionUser, getSession, sessionLogin, sessionLogout } from '@/api';

export type { SessionUser };

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

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [status, setStatus] = useState<SessionStatus>('loading');

  useEffect(() => {
    getSession()
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
    const { user } = await sessionLogin(email, password);
    setUser(user);
    setStatus('authenticated');
    return user;
  };

  const logout = async () => {
    await sessionLogout().catch(() => {});
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
