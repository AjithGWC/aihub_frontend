import { createContext, useContext, useState, ReactNode } from 'react';
import { User, login as apiLogin, storeSession, clearSession, getStoredUser } from '../api/client';

interface AuthState {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  /** Re-read the stored user (e.g. after a password change clears the flag). */
  refreshUser: () => void;
}

const AuthContext = createContext<AuthState>({
  user: null,
  login: async () => {},
  logout: () => {},
  refreshUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(getStoredUser());

  const login = async (username: string, password: string) => {
    const { token, user } = await apiLogin(username, password);
    storeSession(token, user);
    setUser(user);
  };

  const logout = () => {
    clearSession();
    setUser(null);
  };

  const refreshUser = () => setUser(getStoredUser());

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
