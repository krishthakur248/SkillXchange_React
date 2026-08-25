import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(() => localStorage.getItem('sx_token'));
  const [loading, setLoading] = useState(true); // true while verifying stored token

  // ── On mount: verify stored token ──
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    authApi.me()
      .then(({ user }) => setUser(user))
      .catch(() => {
        // Token invalid or expired — clear it
        localStorage.removeItem('sx_token');
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (email, password) => {
    const { token: newToken, user: newUser } = await authApi.login({ email, password });
    localStorage.setItem('sx_token', newToken);
    setToken(newToken);
    setUser(newUser);
    return newUser;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const { token: newToken, user: newUser } = await authApi.register({ name, email, password });
    localStorage.setItem('sx_token', newToken);
    setToken(newToken);
    setUser(newUser);
    return newUser;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('sx_token');
    setToken(null);
    setUser(null);
  }, []);

  // Expose a way for pages to refresh user data after updates
  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const { user: updated } = await authApi.me();
      setUser(updated);
    } catch (_) {
      logout();
    }
  }, [token, logout]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
