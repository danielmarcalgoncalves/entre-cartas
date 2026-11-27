"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { SESSION_CLEARED_EVENT } from "@/lib/journal-storage";

const FAVORITES_KEY = "entre-cartas:favorites";
const SAVED_KEY = "entre-cartas:saved";
const EVENT_NAME = "entre-cartas:archive-updated";

export type ArchiveKind = "favorites" | "saved";

function keyFor(kind: ArchiveKind, userId?: string | number | null) {
  const base = kind === "favorites" ? FAVORITES_KEY : SAVED_KEY;
  return userId ? `${base}:${String(userId)}` : null;
}

export function getArchive(kind: ArchiveKind, userId?: string | number | null): string[] {
  if (typeof window === "undefined") return [];
  const key = keyFor(kind, userId);
  if (!key) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

export async function toggleArchivedLetter(
  kind: ArchiveKind,
  id: string,
  userId?: string | number | null
) {
  const key = keyFor(kind, userId);
  if (!key || !userId) return [];

  const current = getArchive(kind, userId);
  const isRemoving = current.includes(id);
  const updated = isRemoving ? current.filter((item) => item !== id) : [...current, id];
  window.localStorage.setItem(key, JSON.stringify(updated));
  window.dispatchEvent(new Event(EVENT_NAME));

  return updated;
}

export function useArchive(kind: ArchiveKind) {
  const { user, loading } = useAuth();
  const userId = user?.id ? String(user.id) : null;
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const clearMemory = () => setIds([]);
    window.addEventListener(SESSION_CLEARED_EVENT, clearMemory);
    return () => {
      window.removeEventListener(SESSION_CLEARED_EVENT, clearMemory);
    };
  }, []);

  useEffect(() => {
    if (loading) return;

    if (!userId) {
      setIds([]);
      return;
    }

    const update = () => setIds(getArchive(kind, userId));
    update();
    window.addEventListener(EVENT_NAME, update);
    window.addEventListener("storage", update);

    return () => {
      window.removeEventListener(EVENT_NAME, update);
      window.removeEventListener("storage", update);
    };
  }, [kind, loading, userId]);

  const toggle = useCallback(
    (id: string) => toggleArchivedLetter(kind, id, userId),
    [kind, userId]
  );

  return { ids, has: (id: string) => ids.includes(id), toggle };
}
