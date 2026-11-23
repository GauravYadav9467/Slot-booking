import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getLogin, getProfile, logoutRequest, type User } from "../lib/api";

const tokenKey = "nexusArenaToken";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  sessionError: string | null;
  login: (email: string, password: string) => Promise<User>;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function storedToken() {
  try { return localStorage.getItem(tokenKey); } catch { return null; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(storedToken);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const clearSession = useCallback(() => {
    localStorage.removeItem(tokenKey);
    setToken(null);
    setUser(null);
    setSessionError(null);
    setLoading(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    const currentToken = token || storedToken();
    if (!currentToken) {
      setUser(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setSessionError(null);
    try {
      const result = await getProfile(currentToken);
      setUser(result.user);
      setToken(currentToken);
    } catch (error) {
      const apiError = error as { status?: number; message?: string };
      if (apiError.status === 401 || apiError.status === 403) clearSession();
      else setSessionError(apiError.message || "Could not verify your NEXUS ARENA session.");
    } finally {
      setLoading(false);
    }
  }, [clearSession, token]);

  useEffect(() => { void refreshProfile(); }, [refreshProfile]);
  useEffect(() => {
    const onExpired = () => clearSession();
    window.addEventListener("nexus-auth-expired", onExpired);
    return () => window.removeEventListener("nexus-auth-expired", onExpired);
  }, [clearSession]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await getLogin(email, password);
    localStorage.setItem(tokenKey, result.token);
    setToken(result.token);
    setUser(result.user);
    setSessionError(null);
    setLoading(false);
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    const currentToken = token;
    try { if (currentToken) await logoutRequest(currentToken); } catch { /* Local logout still succeeds if the API is unreachable. */ }
    clearSession();
  }, [clearSession, token]);

  const value = useMemo(() => ({ user, token, loading, sessionError, login, refreshProfile, logout }), [
    user, token, loading, sessionError, login, refreshProfile, logout,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}
