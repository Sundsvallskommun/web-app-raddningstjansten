import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchMe, sessionKeepAlive, type Me } from '@/api/api-service';

interface AuthState {
  user: Me | null;
  loading: boolean;
  /** When the current session expires (ISO), or null if unknown/not logged in. */
  sessionExpiresAt: string | null;
  refresh: () => Promise<void>;
  /** Renew the session ("stanna kvar") and update the expiry. */
  keepAlive: () => Promise<void>;
  clear: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const me = await fetchMe();
      setUser(me);
      setSessionExpiresAt(me.sessionExpiresAt ?? null);
    } catch {
      setUser(null);
      setSessionExpiresAt(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const keepAlive = useCallback(async () => {
    const { sessionExpiresAt: next } = await sessionKeepAlive();
    if (next) setSessionExpiresAt(next);
  }, []);

  const clear = useCallback(() => {
    setUser(null);
    setSessionExpiresAt(null);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ user, loading, sessionExpiresAt, refresh, keepAlive, clear }),
    [user, loading, sessionExpiresAt, refresh, keepAlive, clear],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
