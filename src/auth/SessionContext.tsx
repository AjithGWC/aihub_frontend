import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { type PortalUser, portalLogin, portalLogout, portalMe } from '@/api/portal';

export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface SessionUser {
  id: string;
  username: string;
  department: string | null;
  roles: string[];
  isAdmin: boolean;
  /** Kept for pages that only need a display name (e.g. Chatbot's greeting). */
  name: string;
  /** Primary role for display/gating — 'admin' when isAdmin, else the first assigned role. */
  role: string;
  /** Title-cased `role`, for headers. */
  roleLabel: string;
}

function toSessionUser(portalUser: PortalUser): SessionUser {
  const isAdmin = portalUser.roles.includes('admin');
  const role = isAdmin ? 'admin' : portalUser.roles[0] ?? 'user';
  return {
    id: portalUser.user_id,
    username: portalUser.username,
    department: portalUser.department,
    roles: portalUser.roles,
    isAdmin,
    name: portalUser.username,
    role,
    roleLabel: role.charAt(0).toUpperCase() + role.slice(1),
  };
}

interface SessionState {
  user: SessionUser | null;
  status: SessionStatus;
  login: (username: string, password: string) => Promise<SessionUser>;
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
    portalMe()
      .then((portalUser) => {
        setUser(toSessionUser(portalUser));
        setStatus('authenticated');
      })
      .catch(() => {
        setUser(null);
        setStatus('unauthenticated');
      });
  }, []);

  const login = async (username: string, password: string) => {
    const portalUser = await portalLogin(username, password);
    const sessionUser = toSessionUser(portalUser);
    setUser(sessionUser);
    setStatus('authenticated');
    return sessionUser;
  };

  const logout = async () => {
    await portalLogout().catch(() => {});
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
