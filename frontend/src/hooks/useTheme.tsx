"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "entre-cartas:theme";
export const THEME_CHANGED_EVENT = "entre-cartas:theme-changed";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (nextTheme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";

  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    if (saved === "light" || saved === "dark") {
      return saved;
    }
  } catch {
    // localStorage may be inaccessible
  }

  // Fallback to OS preference
  if (typeof window !== "undefined" && window.matchMedia) {
    if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      return "light";
    }
  }

  return "dark";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  const applyTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", nextTheme);
    }
  }, []);

  useEffect(() => {
    // Read actual theme initialized by inline head script or storage
    const initial = (document.documentElement.getAttribute("data-theme") as Theme) || getInitialTheme();
    applyTheme(initial);
    setMounted(true);

    const handleStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY && event.newValue) {
        const nextTheme = event.newValue as Theme;
        if (nextTheme === "light" || nextTheme === "dark") {
          applyTheme(nextTheme);
        }
      }
    };

    const handleCustomChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ theme: Theme }>;
      if (customEvent.detail?.theme) {
        applyTheme(customEvent.detail.theme);
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(THEME_CHANGED_EVENT, handleCustomChange);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(THEME_CHANGED_EVENT, handleCustomChange);
    };
  }, [applyTheme]);

  const setTheme = useCallback(
    (nextTheme: Theme) => {
      applyTheme(nextTheme);
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        window.dispatchEvent(
          new CustomEvent(THEME_CHANGED_EVENT, { detail: { theme: nextTheme } })
        );
      } catch {
        // Handle storage quota or private browsing exceptions
      }
    },
    [applyTheme]
  );

  const toggleTheme = useCallback(() => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme: mounted ? theme : "dark", toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
