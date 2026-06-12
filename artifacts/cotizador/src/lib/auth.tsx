import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActiveUser {
  id: number;
  nombre: string;
  correo: string;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

const AUTH_TOKEN_KEY = "cotizador.authToken";
const ACTIVE_USER_KEY = "cotizador.activeUser";

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function getStoredUser(): ActiveUser | null {
  try {
    const raw = localStorage.getItem(ACTIVE_USER_KEY);
    return raw ? (JSON.parse(raw) as ActiveUser) : null;
  } catch {
    return null;
  }
}

export function clearAuth(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(ACTIVE_USER_KEY);
}

// ─── Auth Context ─────────────────────────────────────────────────────────────

interface AuthCtx {
  user: ActiveUser | null;
  login: (user: ActiveUser, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ActiveUser | null>(() => getStoredUser());

  const login = useCallback((u: ActiveUser, token: string) => {
    setAuthToken(token);
    localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(u));
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthCtx {
  return useContext(AuthContext);
}
