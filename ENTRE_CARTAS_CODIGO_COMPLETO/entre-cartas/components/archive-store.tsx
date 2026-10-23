"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

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
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ savedIds, folderById }));
  }, [folderById, ready, savedIds]);

  const isSaved = useCallback((id: string) => savedIds.includes(id), [savedIds]);

  const toggleSaved = useCallback((id: string) => {
    if (savedIds.includes(id)) {
      setSavedIds((current) => current.filter((savedId) => savedId !== id));
      setFolderById((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      return;
    }
    setSavedIds((current) => current.includes(id) ? current : [...current, id]);
    setFolderById((current) => ({ ...current, [id]: current[id] ?? DEFAULT_FOLDER }));
  }, [savedIds]);

  const moveToFolder = useCallback((id: string, folderId: string) => {
    setSavedIds((current) => current.includes(id) ? current : [...current, id]);
    setFolderById((current) => ({ ...current, [id]: folderId }));
  }, []);

  const value = useMemo(() => ({ savedIds, folderById, isSaved, toggleSaved, moveToFolder }), [folderById, isSaved, moveToFolder, savedIds, toggleSaved]);

  return <ArchiveContext.Provider value={value}>{children}</ArchiveContext.Provider>;
}

export function useArchive() {
  const archive = useContext(ArchiveContext);
  if (!archive) throw new Error("useArchive precisa estar dentro de ArchiveProvider");
  return archive;
}
