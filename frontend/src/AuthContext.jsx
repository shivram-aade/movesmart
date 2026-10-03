import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = still checking
  useEffect(() => { api('/api/auth/me').then(setUser).catch(() => setUser(null)); }, []);

  const login = async (body) => setUser(await api('/api/auth/login', { method: 'POST', body }));
  const signup = async (body) => setUser(await api('/api/auth/signup', { method: 'POST', body }));
  const logout = async () => { await api('/api/auth/logout', { method: 'POST' }).catch(() => {}); setUser(null); };

  return <Ctx.Provider value={{ user, login, signup, logout }}>{children}</Ctx.Provider>;
}
