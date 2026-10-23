"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/services/api";

const STORAGE_KEY = "entre-cartas:arquivo:v1";
const DEFAULT_FOLDER = "caixa-das-releituras";

type ArchiveValue = {
  savedIds: string[];
  folderById: Record<string, string>;
  isSaved: (id: string) => boolean;
  toggleSaved: (id: string) => void;
  moveToFolder: (id: string, folderId: string) => void;
};

const ArchiveContext = createContext<ArchiveValue | null>(null);

export function ArchiveProvider({ children }: { children: React.ReactNode }) {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [folderById, setFolderById] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const archive = JSON.parse(stored) as { savedIds?: string[]; folderById?: Record<string, string> };
        setSavedIds(Array.isArray(archive.savedIds) ? archive.savedIds : []);
        setFolderById(archive.folderById && typeof archive.folderById === "object" ? archive.folderById : {});
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setReady(true);

    // Sincroniza em background com o backend MariaDB se o usuário estiver autenticado
    api.cartas.guardadas()
      .then((res: any) => {
        if (res && res.cartas_guardadas && Array.isArray(res.cartas_guardadas)) {
          const remoteIds = res.cartas_guardadas.map((c: any) => String(c.id));
          setSavedIds((current) => Array.from(new Set([...current, ...remoteIds])));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ savedIds, folderById }));
  }, [folderById, ready, savedIds]);

  const isSaved = useCallback((id: string) => savedIds.includes(String(id)), [savedIds]);

  const toggleSaved = useCallback((id: string) => {
    const stringId = String(id);
    const wasSaved = savedIds.includes(stringId);

    if (wasSaved) {
      setSavedIds((current) => current.filter((savedId) => savedId !== stringId));
      setFolderById((current) => {
        const next = { ...current };
        delete next[stringId];
        return next;
      });
      api.cartas.descarimbar(stringId).catch(() => {});
      return;
    }

    setSavedIds((current) => current.includes(stringId) ? current : [...current, stringId]);
    setFolderById((current) => ({ ...current, [stringId]: current[stringId] ?? DEFAULT_FOLDER }));
    api.cartas.carimbar(stringId, "GUARDADA").catch((err: any) => {
      if (err?.isLimitReached) {
        alert("Sua caixa atingiu o limite de 5 cartas guardadas do Plano Leitor. Assine o Clube Pro para salvar memórias ilimitadas!");
      }
    });
  }, [savedIds]);

  const moveToFolder = useCallback((id: string, folderId: string) => {
    const stringId = String(id);
    setSavedIds((current) => current.includes(stringId) ? current : [...current, stringId]);
    setFolderById((current) => ({ ...current, [stringId]: folderId }));
  }, []);

  const value = useMemo(
    () => ({ savedIds, folderById, isSaved, toggleSaved, moveToFolder }),
    [folderById, isSaved, moveToFolder, savedIds, toggleSaved]
  );

  return <ArchiveContext.Provider value={value}>{children}</ArchiveContext.Provider>;
}

export function useArchive() {
  const archive = useContext(ArchiveContext);
  if (!archive) throw new Error("useArchive precisa estar dentro de ArchiveProvider");
  return archive;
}
