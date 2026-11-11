"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { LetterFolder, LetterTheme, Notebook } from "@/lib/journal-storage";

export interface GuestDraftLetterState {
  titulo: string;
  destinatario: string;
  conteudo: string;
  assinatura: string;
  favoritado: boolean;
  letterTheme: LetterTheme;
  sheetBgId: string;
  sheetBgColor: string;
  fontFamilyId: string;
}

interface GuestDemoContextType {
  guestNotebooks: Notebook[];
  setGuestNotebooks: React.Dispatch<React.SetStateAction<Notebook[]>>;
  guestActiveNotebookId: string;
  setGuestActiveNotebookId: React.Dispatch<React.SetStateAction<string>>;
  guestPinnedTheme: string;
  setGuestPinnedTheme: React.Dispatch<React.SetStateAction<string>>;
  guestLetterFolders: LetterFolder[];
  setGuestLetterFolders: React.Dispatch<React.SetStateAction<LetterFolder[]>>;
  guestSelectedFolderId: string;
  setGuestSelectedFolderId: React.Dispatch<React.SetStateAction<string>>;
  guestDraftLetter: GuestDraftLetterState;
  setGuestDraftLetter: React.Dispatch<React.SetStateAction<GuestDraftLetterState>>;
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

function createInitialGuestFolders(): LetterFolder[] {
  return [
    {
      id: "guest-folder-1",
      nome: "Personal Notes",
      cor: "marrom",
      criadoEm: new Date().toISOString(),
    },
  ];
}

const INITIAL_GUEST_LETTER: GuestDraftLetterState = {
  titulo: "",
  destinatario: "",
  conteudo: "",
  assinatura: "",
  favoritado: false,
  letterTheme: "Love",
  sheetBgId: "ivory",
  sheetBgColor: "#FCFBF7",
  fontFamilyId: "caveat",
};

const GuestDemoContext = createContext<GuestDemoContextType | null>(null);

export function GuestDemoProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [guestNotebooks, setGuestNotebooks] = useState<Notebook[]>(createInitialGuestNotebooks);
  const [guestActiveNotebookId, setGuestActiveNotebookId] = useState<string>("guest-preview-journal");
  const [guestPinnedTheme, setGuestPinnedTheme] = useState<string>("");
  const [guestLetterFolders, setGuestLetterFolders] = useState<LetterFolder[]>(
    createInitialGuestFolders
  );
  const [guestSelectedFolderId, setGuestSelectedFolderId] = useState<string>("guest-folder-1");
  const [guestDraftLetter, setGuestDraftLetter] =
    useState<GuestDraftLetterState>(INITIAL_GUEST_LETTER);

  const resetGuestDemo = useCallback(() => {
    setGuestNotebooks(createInitialGuestNotebooks());
    setGuestActiveNotebookId("guest-preview-journal");
    setGuestPinnedTheme("");
    setGuestLetterFolders(createInitialGuestFolders());
    setGuestSelectedFolderId("guest-folder-1");
    setGuestDraftLetter(INITIAL_GUEST_LETTER);
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
        guestLetterFolders,
        setGuestLetterFolders,
        guestSelectedFolderId,
        setGuestSelectedFolderId,
        guestDraftLetter,
        setGuestDraftLetter,
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
