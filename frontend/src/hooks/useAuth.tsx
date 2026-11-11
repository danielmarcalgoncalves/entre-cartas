"use client";

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, setSession, clearSession } from "@/services/api";
import {
  clearAllPrivateBrowserData,
  hydrateUserDataFromBackend,
} from "@/lib/journal-storage";

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

const LAST_USER_MARKER_KEY = "entre-cartas:last-uid";

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const logoutInFlightRef = useRef(false);

  const syncUserAccountScope = async (authenticatedUser: User) => {
    if (typeof window !== "undefined") {
      try {
        const previousUid = window.sessionStorage.getItem(LAST_USER_MARKER_KEY);
        if (previousUid && previousUid !== String(authenticatedUser.id)) {
          // Different account authenticated on this browser — wipe prior user's local data completely
          await clearAllPrivateBrowserData();
        }
        window.sessionStorage.setItem(LAST_USER_MARKER_KEY, String(authenticatedUser.id));
      } catch {}
    }
    await hydrateUserDataFromBackend(authenticatedUser.id);
  };

  const refreshUser = async () => {
    try {
      const data = await api.auth.me();
      if (data && data.usuario) {
        await syncUserAccountScope(data.usuario);
        setUser(data.usuario);
      } else {
        setUser(null);
      }
    } catch {
      clearSession();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, senha: string, rememberMe = true) => {
    setLoading(true);
    try {
      // Ensure clean slate before hydrating newly signed-in account
      await clearAllPrivateBrowserData();
      const res = await api.auth.login(email, senha, rememberMe);
      if (res.token) {
        setSession(res.token, rememberMe);
      }
      if (res.usuario) {
        await syncUserAccountScope(res.usuario);
        setUser(res.usuario);
      } else {
        await refreshUser();
      }
      return res;
    } finally {
      setLoading(false);
    }
  };

  const register = async (nome: string, email: string, senha: string) => {
    const res = await api.auth.register(nome, email, senha);
    if (res.token && !res.requireVerification) {
      await clearAllPrivateBrowserData();
      setSession(res.token, true);
      if (res.usuario) {
        await syncUserAccountScope(res.usuario);
        setUser(res.usuario);
      } else {
        await refreshUser();
      }
    }
    return res;
  };

  const applyTokenSession = async (token: string, persist = true) => {
    setLoading(true);
    try {
      await clearAllPrivateBrowserData();
      setSession(token, persist);
      await refreshUser();
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (logoutInFlightRef.current) return;
    logoutInFlightRef.current = true;
    let serverLogoutError: Error | null = null;

    try {
      await api.auth.logout();
    } catch (err: any) {
      serverLogoutError = err instanceof Error ? err : new Error("Server logout failed.");
    } finally {
      // Fail closed: always purge local auth tokens, private caches, and user state
      clearSession();
      await clearAllPrivateBrowserData();
      setUser(null);
      logoutInFlightRef.current = false;
      router.replace("/");
    }

    if (serverLogoutError) {
      throw serverLogoutError;
    }
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
