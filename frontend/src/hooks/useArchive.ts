"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";

const FAVORITES_KEY = "entre-cartas:favorites";
const SAVED_KEY = "entre-cartas:saved";
const EVENT_NAME = "entre-cartas:archive-updated";

export type ArchiveKind = "favorites" | "saved";

function keyFor(kind: ArchiveKind) {
  return kind === "favorites" ? FAVORITES_KEY : SAVED_KEY;
}

export function getArchive(kind: ArchiveKind): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(keyFor(kind)) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

export async function toggleArchivedLetter(kind: ArchiveKind, id: string) {
  const current = getArchive(kind);
  const isRemoving = current.includes(id);
  const updated = isRemoving ? current.filter((item) => item !== id) : [...current, id];
  window.localStorage.setItem(keyFor(kind), JSON.stringify(updated));
  window.dispatchEvent(new Event(EVENT_NAME));

  // Sincronização em background com o backend quando aplicável
  try {
    if (kind === "favorites") {
      if (isRemoving) {
        await api.cartas.descarimbar(id).catch(() => {});
      } else {
        await api.cartas.carimbar(id, "FAVORITA");
      }
    }
  } catch (err: any) {
    if (err.isLimitReached) {
      alert("Sua caixa atingiu o limite de 5 cartas guardadas do Plano Leitor. Assine o Clube Pro para salvar memórias ilimitadas!");
    }
  }

  return updated;
}

export function useArchive(kind: ArchiveKind) {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const update = () => setIds(getArchive(kind));
    update();
    window.addEventListener(EVENT_NAME, update);
    window.addEventListener("storage", update);

    // Tenta sincronizar com as cartas guardadas no banco se logado
    api.cartas.guardadas()
      .then((res: any) => {
        if (res && res.cartas_guardadas && Array.isArray(res.cartas_guardadas)) {
          const remoteIds = res.cartas_guardadas.map((c: any) => String(c.id));
          const current = getArchive(kind);
          const merged = Array.from(new Set([...current, ...remoteIds]));
          window.localStorage.setItem(keyFor(kind), JSON.stringify(merged));
          setIds(merged);
        }
      })
      .catch(() => {
        // Silencioso se visitante anônimo
      });

    return () => {
      window.removeEventListener(EVENT_NAME, update);
      window.removeEventListener("storage", update);
    };
  }, [kind]);

  return { ids, has: (id: string) => ids.includes(id) };
}
