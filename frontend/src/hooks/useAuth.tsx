"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, setSession, clearSession } from "@/services/api";

export interface User {
  id: number;
  nome: string;
  email: string;
  papel: string;
  role?: string;
  auth_provider?: string;
  foto_url?: string | null;
  bio?: string | null;
  onboarding_concluido?: boolean | number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isPro: boolean;
  isAdmin: boolean;
  login: (email: string, senha: string, rememberMe?: boolean) => Promise<any>;
  register: (nome: string, email: string, senha: string) => Promise<any>;
  applyTokenSession: (token: string, persist?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isPro: false,
  isAdmin: false,
  login: async () => {},
  register: async () => {},
  applyTokenSession: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const data = await api.auth.me();
      if (data && data.usuario) {
        setUser(data.usuario);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, senha: string, rememberMe = true) => {
    const res = await api.auth.login(email, senha, rememberMe);
    if (res.token) {
      setSession(res.token, rememberMe);
    }
    if (res.usuario) {
      setUser(res.usuario);
    }
    await refreshUser();
    return res;
  };

  const register = async (nome: string, email: string, senha: string) => {
    const res = await api.auth.register(nome, email, senha);
    if (res.token && !res.requireVerification) {
      setSession(res.token, true);
      if (res.usuario) {
        setUser(res.usuario);
      }
      await refreshUser();
    }
    return res;
  };

  const applyTokenSession = async (token: string, persist = true) => {
    setSession(token, persist);
    await refreshUser();
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch {}
    clearSession();
    setUser(null);
    // Smooth client navigation to landing page preserving personal data
    router.push("/");
  };

  const isPro = user?.papel === "premium" || user?.papel === "admin";
  const isAdmin = user?.papel === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isPro,
        isAdmin,
        login,
        register,
        applyTokenSession,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
