"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, setSession, clearSession } from "@/services/api";

export interface User {
  id: number;
  nome: string;
  email: string;
  papel: string;
  role?: string;
  foto_url?: string | null;
  bio?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isPro: boolean;
  isAdmin: boolean;
  login: (email: string, senha: string) => Promise<any>;
  register: (nome: string, email: string, senha: string) => Promise<any>;
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
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
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

  const login = async (email: string, senha: string) => {
    const res = await api.auth.login(email, senha);
    if (res.token) {
      setSession(res.token);
    }
    if (res.usuario) {
      setUser(res.usuario);
    } else {
      await refreshUser();
    }
    return res;
  };

  const register = async (nome: string, email: string, senha: string) => {
    return await api.auth.register(nome, email, senha);
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch {}
    clearSession();
    setUser(null);
  };

  const isPro = user?.papel === "premium" || user?.papel === "admin";
  const isAdmin = user?.papel === "admin";

  return (
    <AuthContext.Provider value={{ user, loading, isPro, isAdmin, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
