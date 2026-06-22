import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { login as apiLogin, logout as apiLogout } from "../api";
import type { AuthUser } from "../types";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadUserFromStorage(): AuthUser | null {
  try {
    const raw = localStorage.getItem("jp_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadUserFromStorage);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiLogin(email, password);
    localStorage.setItem("jp_user", JSON.stringify(result.user));
    setUser(result.user);
  }, []);

  const logout = useCallback(() => {
    apiLogout();
    localStorage.removeItem("jp_user");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
