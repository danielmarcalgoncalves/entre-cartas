"use client";

import { api } from "@/services/api";
import {
  isJournalPageMeaningful,
  normalizeJournalContentForStorage,
} from "@/lib/journal-page-layout";

export const JOURNAL_UPDATED_EVENT = "entre-cartas:journal-updated";
export const SESSION_CLEARED_EVENT = "entre-cartas:session-cleared";
export const NOTEBOOKS_STORAGE_KEY = "entre-cartas:notebooks:v2";
export const ACTIVE_NOTEBOOK_ID_KEY = "entre-cartas:active-notebook-id";
export const ACTIVE_NOTEBOOK_PAGE_KEY = "entre-cartas:active-notebook-page";
export const PINNED_THEME_STORAGE_KEY = "entre-cartas:pinned-theme";

export type JournalAttachmentStyle = "polaroid" | "washi" | "vintage" | "plain";

export type BorderlessContourMode = "none" | "paper";

export interface JournalAttachment {
  id: string;
  objectKey: string;
  url: string;
  width: number;
  height: number;
  x: number;
  y: number;
  rotation: number;
  zIndex: number;
  style: JournalAttachmentStyle;
  borderlessContour?: BorderlessContourMode;
  caption?: string;
}

export interface JournalSticker {
  id: string;
  stickerId: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  zIndex: number;
}

export interface NotebookPage {
  id: string;
  titulo: string;
  conteudo: string;
  dataFormatada: string;
  favoritado: boolean;
  criadoEm: string;
  atualizadoEm?: string;
  tipoPapel?: string;
  corTinta?: string;
  fonte?: string;
  attachments?: JournalAttachment[];
  stickers?: JournalSticker[];
}

export interface Notebook {
  id: string;
  nome: string;
  corCapa: string;
  paginas: NotebookPage[];
  criadoEm?: string;
  atualizadoEm?: string;
  ownerId?: number | string;
}

export type NotebookCoverColor = "marrom" | "verde" | "vinho" | "preto";

export interface NotebookColorOption {
  id: NotebookCoverColor;
  nome: string;
  etiqueta: string;
  corHex: string;
  shelfBg: string;
  shelfSpine1: string;
  shelfSpine2: string;
  cardGradient: string;
  ribbonColor: string;
}

export const NOTEBOOK_COLOR_OPTIONS: NotebookColorOption[] = [
  {
    id: "marrom",
    nome: "Brown",
    etiqueta: "Rustic Leather",
    corHex: "#42220b",
    shelfBg: "#221612",
    shelfSpine1: "#170e0b",
    shelfSpine2: "#0f0907",
    cardGradient: "linear-gradient(135deg, #42220b 0%, #261306 58%, #150a03 100%)",
    ribbonColor: "#b88a32",
  },
  {
    id: "verde",
    nome: "Green",
    etiqueta: "Botanical Moss",
    corHex: "#163321",
    shelfBg: "#14241a",
    shelfSpine1: "#0e1a12",
    shelfSpine2: "#08100b",
    cardGradient: "linear-gradient(135deg, #163321 0%, #102418 58%, #09150e 100%)",
    ribbonColor: "#8b9a6b",
  },
  {
    id: "vinho",
    nome: "Wine",
    etiqueta: "Noble Burgundy",
    corHex: "#3a0f18",
    shelfBg: "#291117",
    shelfSpine1: "#1d0b10",
    shelfSpine2: "#120609",
    cardGradient: "linear-gradient(135deg, #3a0f18 0%, #260a10 58%, #150508 100%)",
    ribbonColor: "#8c2232",
  },
  {
    id: "preto",
    nome: "Black",
    etiqueta: "Obsidian Leather",
    corHex: "#181818",
    shelfBg: "#121212",
    shelfSpine1: "#0d0d0d",
    shelfSpine2: "#080808",
    cardGradient: "linear-gradient(135deg, #222222 0%, #151515 58%, #0a0a0a 100%)",
    ribbonColor: "#3a3a3a",
  },
];

export const getNotebookTheme = (corCapa?: string): NotebookColorOption => {
  const normalized = (corCapa || "").toLowerCase().trim();
  if (
    normalized === "verde" ||
    normalized === "green" ||
    normalized === "#163321" ||
    normalized === "#223826" ||
    normalized === "#1e3323" ||
    normalized === "#1c3224"
  ) {
    return NOTEBOOK_COLOR_OPTIONS[1];
  }
  if (
    normalized === "vinho" ||
    normalized === "wine" ||
    normalized === "burgundy" ||
    normalized === "#3a0f18" ||
    normalized === "#441a24" ||
    normalized === "#3b161e" ||
    normalized === "#451a24"
  ) {
    return NOTEBOOK_COLOR_OPTIONS[2];
  }
  if (
    normalized === "preto" ||
    normalized === "black" ||
    normalized === "obsidian" ||
    normalized === "#181818" ||
    normalized === "#1a1a1a" ||
    normalized === "#1c1c1c" ||
    normalized === "#222222" ||
    normalized === "#111111"
  ) {
    return NOTEBOOK_COLOR_OPTIONS[3];
  }
  return NOTEBOOK_COLOR_OPTIONS[0];
};

export function getNotebookById(
  notebookId?: string | null,
  userId?: string | number | null
): Notebook | null {
  if (!notebookId || !userId || typeof window === "undefined") return null;
  const userNotebooks = loadUserNotebooks(userId);
  return userNotebooks.find((n) => n.id === notebookId) || null;
}

export const PAPER_OPTIONS = [
  { id: "ivory", name: "Ivory", color: "#FCFBF7" },
  { id: "cream", name: "Cream", color: "#F6EEDB" },
  { id: "antique-white", name: "Antique White", color: "#FAF6EE" },
  { id: "warm-beige", name: "Warm Beige", color: "#EFE5D3" },
  { id: "dusty-rose", name: "Dusty Rose", color: "#F3E5E3" },
  { id: "muted-sage", name: "Muted Sage", color: "#E6EDE6" },
  // Backwards compatibility aliases
  { id: "marfim", name: "Ivory", color: "#FCFBF7" },
  { id: "pergaminho", name: "Cream", color: "#F6EEDB" },
  { id: "kraft", name: "Warm Beige", color: "#EFE5D3" },
  { id: "branco", name: "Antique White", color: "#FAF6EE" },
];

export const INK_OPTIONS = [
  { id: "nanquim", name: "Soft India Ink", color: "#262626" },
  { id: "azul-noite", name: "Deep Midnight Blue", color: "#1C2A39" },
  { id: "sepia", name: "Archival Sepia", color: "#4A3E31" },
  { id: "grafite", name: "Sober Graphite", color: "#3A3A3A" },
];

export const FONT_OPTIONS = [
  { id: "caveat", name: "Caveat", previewText: "Fountain pen script", styleFamily: "'Caveat', cursive" },
  { id: "garamond", name: "EB Garamond", previewText: "Classic literary serif", styleFamily: "var(--serif, 'EB Garamond', serif)" },
  { id: "cormorant", name: "Cormorant", previewText: "Poetic display serif", styleFamily: "var(--serif-title, 'Cormorant Garamond', Georgia, serif)" },
  { id: "typewriter", name: "Special Elite", previewText: "Vintage typewriter", styleFamily: "'Special Elite', monospace" },
  // Backward compatibility alias
  { id: "literary", name: "EB Garamond Italic", previewText: "Literary italic", styleFamily: "var(--literary-italic, 'EB Garamond', Georgia, serif)" },
];

export const PROMPTS = [
  "Write about a small detail of your day that nobody noticed but you.",
  "When was the last time you waited for something with your heart in your mouth?",
  "If you could leave a note on the windowsill for yourself five years ago, what would it say?",
  "Describe the scent or sound of a place that once felt like home to you.",
  "Is there a word you swallowed recently that deserved to be spoken aloud?",
  "What would you like to forget slowly, without hurry or bitterness?",
];

export function playPaperSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.09);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.09);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  } catch {}
}

export function formatShortDate(isoOrText?: string, fallback = "Recently"): string {
  if (!isoOrText) return fallback;
  const parsed = Date.parse(isoOrText);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  return isoOrText;
}

export function getPaperColorById(paperId?: string): string {
  const found = PAPER_OPTIONS.find((p) => p.id === paperId);
  return found ? found.color : "#FCFBF7";
}

export function getInkColorById(inkId?: string): string {
  const found = INK_OPTIONS.find((i) => i.id === inkId);
  return found ? found.color : "#262626";
}

export function getFontFamilyById(fontId?: string): string {
  const found = FONT_OPTIONS.find((f) => f.id === fontId);
  return found ? found.styleFamily : "'Caveat', cursive";
}

export function dispatchJournalUpdated(source?: string) {
  if (typeof window === "undefined") return;
  if (source) {
    window.dispatchEvent(new CustomEvent(JOURNAL_UPDATED_EVENT, { detail: { source } }));
  } else {
    window.dispatchEvent(new Event(JOURNAL_UPDATED_EVENT));
  }
}

export function normalizeNotebookPageForStorage(page: NotebookPage): NotebookPage {
  const safeAttachments = Array.isArray(page.attachments)
    ? page.attachments.filter(
        (a) =>
          a &&
          typeof a.objectKey === "string" &&
          a.objectKey.length > 0 &&
          !a.objectKey.startsWith("data:") &&
          (!a.url || !a.url.startsWith("data:"))
      )
    : undefined;
  const safeStickers = Array.isArray(page.stickers)
    ? page.stickers.filter((s) => s && typeof s.stickerId === "string" && s.stickerId.length > 0)
    : undefined;

  return {
    ...page,
    titulo: (page.titulo || "").trim(),
    conteudo: normalizeJournalContentForStorage(page.conteudo || ""),
    ...(safeAttachments && safeAttachments.length > 0 ? { attachments: safeAttachments } : { attachments: undefined }),
    ...(safeStickers && safeStickers.length > 0 ? { stickers: safeStickers } : { stickers: undefined }),
  };
}

export function filterWrittenPages(pages?: NotebookPage[]): NotebookPage[] {
  if (!Array.isArray(pages)) return [];
  return pages.filter((p) => isJournalPageMeaningful(p));
}

export function getNotebookDates(nb: Notebook): { created: string; updated: string } {
  const written = filterWrittenPages(nb.paginas);
  const createdRaw =
    nb.criadoEm ||
    written[0]?.criadoEm ||
    written[0]?.dataFormatada ||
    (nb.id.startsWith("caderno-") ? new Date(Number(nb.id.replace("caderno-", "")) || Date.now()).toISOString() : undefined);

  const lastPage = written.length > 0 ? written[written.length - 1] : undefined;
  const updatedRaw =
    nb.atualizadoEm ||
    lastPage?.atualizadoEm ||
    lastPage?.criadoEm ||
    lastPage?.dataFormatada ||
    createdRaw;

  return {
    created: formatShortDate(createdRaw, "Archive record"),
    updated: formatShortDate(updatedRaw, "Archive record"),
  };
}

export function loadAllRawNotebooks(): Notebook[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(NOTEBOOKS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (n: Notebook) => n && n.id !== "default-caderno" && n.id !== "caderno-noturno"
    );
  } catch {
    return [];
  }
}

export function loadUserNotebooks(userId?: number | string | null): Notebook[] {
  if (!userId) return [];
  const all = loadAllRawNotebooks();
  return all.filter((nb) => nb.ownerId !== undefined && nb.ownerId !== null && String(nb.ownerId) === String(userId));
}

export function saveAllNotebooks(notebooks: Notebook[], source?: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NOTEBOOKS_STORAGE_KEY, JSON.stringify(notebooks));
  } catch {}
  dispatchJournalUpdated(source);
}

export function renameUserNotebook(
  notebookId: string,
  newName: string,
  userId?: number | string | null
): Notebook[] {
  const trimmed = newName.trim();
  const all = loadAllRawNotebooks();
  if (!trimmed) return all;
  const nowIso = new Date().toISOString();
  const matchesOwner = (nb: Notebook) =>
    userId == null || nb.ownerId == null || String(nb.ownerId) === String(userId);
  const target = all.find((nb) => nb.id === notebookId && matchesOwner(nb));
  if (!target) return all;
  const updated = all.map((nb) =>
    nb.id === notebookId && matchesOwner(nb)
      ? { ...nb, nome: trimmed, atualizadoEm: nowIso }
      : nb
  );
  saveAllNotebooks(updated);
  api.journal
    .upsertNotebook(notebookId, {
      nome: trimmed,
      corCapa: target.corCapa || "marrom",
      paginas: filterWrittenPages(target.paginas),
    })
    .catch(() => {});
  return updated;
}

export function deleteUserNotebook(
  notebookId: string,
  userId?: number | string | null
): Notebook[] {
  const all = loadAllRawNotebooks();
  const matchesOwner = (nb: Notebook) =>
    userId == null || nb.ownerId == null || String(nb.ownerId) === String(userId);
  const remaining = all.filter((nb) => !(nb.id === notebookId && matchesOwner(nb)));
  try {
    const activeId = window.localStorage.getItem(ACTIVE_NOTEBOOK_ID_KEY);
    if (activeId === notebookId) {
      window.localStorage.removeItem(ACTIVE_NOTEBOOK_ID_KEY);
      window.localStorage.removeItem(ACTIVE_NOTEBOOK_PAGE_KEY);
    }
  } catch {}
  saveAllNotebooks(remaining);
  api.journal.deleteNotebook(notebookId).catch(() => {});
  return remaining;
}

/**
 * COMPLETE CLIENT DATA CLEANUP FOR LOGOUT & SESSION ISOLATION
 * Removes ALL application-owned private storage across localStorage, sessionStorage,
 * IndexedDB, and Cache API, and broadcasts session-cleared so in-memory contexts reset.
 * Leaves non-sensitive theme choice ('entre-cartas:theme') untouched if present.
 */
export async function clearAllPrivateBrowserData(): Promise<void> {
  if (typeof window === "undefined") return;

  const PRESERVED_KEYS = new Set(["entre-cartas:theme"]);

  // 1. Clear all application-owned private localStorage keys
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k || PRESERVED_KEYS.has(k)) continue;
      if (k.startsWith("entre-cartas:") || k.startsWith("entre_cartas")) {
        keysToRemove.push(k);
      }
    }
    for (const k of keysToRemove) {
      window.localStorage.removeItem(k);
    }
  } catch {}

  // 2. Clear all application-owned sessionStorage keys
  try {
    const sKeysToRemove: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const k = window.sessionStorage.key(i);
      if (!k) continue;
      if (k.startsWith("entre-cartas:") || k.startsWith("entre_cartas")) {
        sKeysToRemove.push(k);
      }
    }
    for (const k of sKeysToRemove) {
      window.sessionStorage.removeItem(k);
    }
  } catch {}

  // 3. Clear any app-owned IndexedDB databases (fail-safe)
  try {
    if (typeof window.indexedDB !== "undefined" && typeof window.indexedDB.databases === "function") {
      const dbs = await window.indexedDB.databases();
      for (const db of dbs) {
        if (
          db?.name &&
          (db.name.startsWith("entre-cartas") || db.name.startsWith("entre_cartas"))
        ) {
          window.indexedDB.deleteDatabase(db.name);
        }
      }
    }
  } catch {}

  // 4. Clear any app-owned Cache Storage entries
  try {
    if (typeof window.caches !== "undefined") {
      const names = await window.caches.keys();
      for (const name of names) {
        if (name.includes("entre-cartas") || name.includes("entre_cartas")) {
          await window.caches.delete(name);
        }
      }
    }
  } catch {}

  // 5. Notify all React contexts & editors immediately
  try {
    window.dispatchEvent(new Event(SESSION_CLEARED_EVENT));
    window.dispatchEvent(new Event(JOURNAL_UPDATED_EVENT));
  } catch {}
}

/**
 * Hydrates an authenticated user's persistent notebooks from MariaDB directly into
 * clean user-scoped storage. Never touches other users' records.
 */
export async function hydrateUserDataFromBackend(userId: number | string): Promise<void> {
  if (typeof window === "undefined" || !userId) return;

  try {
    const nbRes = await api.journal.listNotebooks().catch(() => null);

    if (nbRes && Array.isArray(nbRes.notebooks)) {
      const remoteNbs: Notebook[] = nbRes.notebooks.map((nb: any) => ({
        ...nb,
        ownerId: userId,
      }));
      saveAllNotebooks(remoteNbs, "backend-sync");
    }
  } catch {
    // Silent fallback if transient network issue
  }
}
