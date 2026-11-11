"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { SESSION_CLEARED_EVENT } from "@/lib/journal-storage";

const STORAGE_KEY_PREFIX = "entre-cartas:arquivo:v1";
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
  const { user, loading } = useAuth();
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [folderById, setFolderById] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);

  const userId = user?.id ? String(user.id) : null;
  const storageKey = userId ? `${STORAGE_KEY_PREFIX}:${userId}` : null;

  useEffect(() => {
    const resetMemory = () => {
      setSavedIds([]);
      setFolderById({});
      setReady(false);
    };

    window.addEventListener(SESSION_CLEARED_EVENT, resetMemory);
    return () => {
      window.removeEventListener(SESSION_CLEARED_EVENT, resetMemory);
    };
  }, []);

  useEffect(() => {
    if (loading) return;

    if (!storageKey || !userId) {
      setSavedIds([]);
      setFolderById({});
      setReady(false);
      return;
    }

    let cancelled = false;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const archive = JSON.parse(stored) as { savedIds?: string[]; folderById?: Record<string, string> };
        setSavedIds(Array.isArray(archive.savedIds) ? archive.savedIds : []);
        setFolderById(archive.folderById && typeof archive.folderById === "object" ? archive.folderById : {});
      } else {
        setSavedIds([]);
        setFolderById({});
      }
    } catch {
      window.localStorage.removeItem(storageKey);
      setSavedIds([]);
      setFolderById({});
    }
    setReady(true);

    // Sync with MariaDB strictly for authenticated account
    api.cartas.guardadas()
      .then((res: any) => {
        if (cancelled) return;
        if (res && res.cartas_guardadas && Array.isArray(res.cartas_guardadas)) {
          const remoteIds = res.cartas_guardadas.map((c: any) => String(c.id));
          setSavedIds((current) => Array.from(new Set([...current, ...remoteIds])));
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [loading, storageKey, userId]);

  useEffect(() => {
    if (!ready || !storageKey || !userId) return;
    window.localStorage.setItem(storageKey, JSON.stringify({ savedIds, folderById }));
  }, [folderById, ready, savedIds, storageKey, userId]);

  const isSaved = useCallback((id: string) => savedIds.includes(String(id)), [savedIds]);

  const toggleSaved = useCallback((id: string) => {
    if (!userId) return;
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
        alert("Your box has reached the limit of 5 saved letters on the Standard Plan. Join Pro Club to save unlimited memories!");
      }
    });
  }, [savedIds, userId]);

  const moveToFolder = useCallback((id: string, folderId: string) => {
    if (!userId) return;
    const stringId = String(id);
    setSavedIds((current) => current.includes(stringId) ? current : [...current, stringId]);
    setFolderById((current) => ({ ...current, [stringId]: folderId }));
  }, [userId]);

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
