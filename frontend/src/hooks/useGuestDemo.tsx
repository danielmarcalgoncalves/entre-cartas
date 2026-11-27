"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { Notebook } from "@/lib/journal-storage";

interface GuestDemoContextType {
  guestNotebooks: Notebook[];
  setGuestNotebooks: React.Dispatch<React.SetStateAction<Notebook[]>>;
  guestActiveNotebookId: string;
  setGuestActiveNotebookId: React.Dispatch<React.SetStateAction<string>>;
  guestPinnedTheme: string;
  setGuestPinnedTheme: React.Dispatch<React.SetStateAction<string>>;
  resetGuestDemo: () => void;
}

function createInitialGuestNotebooks(): Notebook[] {
  const nowIso = new Date().toISOString();
  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return [
    {
      id: "guest-preview-journal",
      nome: "Preview Journal",
      corCapa: "marrom",
      criadoEm: nowIso,
      atualizadoEm: nowIso,
      paginas: [
        {
          id: "guest-page-1",
          titulo: "",
          conteudo: "",
          dataFormatada: formattedDate,
          favoritado: false,
          criadoEm: nowIso,
          tipoPapel: "marfim",
          corTinta: "nanquim",
          fonte: "caveat",
        },
      ],
    },
  ];
}

const GuestDemoContext = createContext<GuestDemoContextType | null>(null);

export function GuestDemoProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [guestNotebooks, setGuestNotebooks] = useState<Notebook[]>(createInitialGuestNotebooks);
  const [guestActiveNotebookId, setGuestActiveNotebookId] = useState<string>("guest-preview-journal");
  const [guestPinnedTheme, setGuestPinnedTheme] = useState<string>("");

  const resetGuestDemo = useCallback(() => {
    setGuestNotebooks(createInitialGuestNotebooks());
    setGuestActiveNotebookId("guest-preview-journal");
    setGuestPinnedTheme("");
  }, []);

  // Ensure guest demonstration memory clears cleanly when a real user signs in
  useEffect(() => {
    if (user) {
      resetGuestDemo();
    }
  }, [user, resetGuestDemo]);

  return (
    <GuestDemoContext.Provider
      value={{
        guestNotebooks,
        setGuestNotebooks,
        guestActiveNotebookId,
        setGuestActiveNotebookId,
        guestPinnedTheme,
        setGuestPinnedTheme,
        resetGuestDemo,
      }}
    >
      {children}
    </GuestDemoContext.Provider>
  );
}

export function useGuestDemo() {
  const ctx = useContext(GuestDemoContext);
  if (!ctx) {
    throw new Error("useGuestDemo must be used within a GuestDemoProvider");
  }
  return ctx;
}
