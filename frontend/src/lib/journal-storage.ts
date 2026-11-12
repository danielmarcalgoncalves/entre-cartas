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
export const LETTER_FOLDERS_STORAGE_KEY = "entre-cartas:letter-folders:v1";
export const ACTIVE_LETTER_FOLDER_ID_KEY = "entre-cartas:active-letter-folder-id";
export const ACTIVE_LETTER_EDIT_ID_KEY = "entre-cartas:active-letter-edit-id";
export const SAVED_ENTRIES_KEY = "entre-cartas:journal:entries";
export const TRASH_STORAGE_KEY = "entre-cartas:journal:trash";
export const PINNED_THEME_STORAGE_KEY = "entre-cartas:pinned-theme";

export interface LetterFolder {
  id: string;
  nome: string;
  cor?: string;
  criadoEm: string;
  ownerId?: number | string;
}

export type JournalEntry = {
  id: string;
  titulo: string;
  conteudo: string;
  humor: string;
  data_formatada: string;
  criado_em: string;
  atualizado_em?: string;
  destinatario?: string;
  assinatura?: string;
  status?: "draft" | "completed";
  cor_tinta?: string;
  fonte?: string;
  usuario_id?: number | string;
  remote_id?: number | string;
  polaroid_url?: string;
  polaroid_legenda?: string;
  inspiracao_titulo?: string;
  tipo_papel?: string;
  favoritado?: boolean;
  caderno_origem?: string;
  selo_carta?: string;
  pasta_id?: string;
  pasta_nome?: string;
  tema_carta?: string;
};

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

export interface FolderColorOption {
  id: string;
  nome: string;
  etiqueta: string;
  corHex: string;
  cardGradient: string;
  cardBorder: string;
  tabCor: string;
  imagem: string;
}

export const FOLDER_COLOR_OPTIONS: FolderColorOption[] = [
  {
    id: "marrom",
    nome: "Brown",
    etiqueta: "Rustic Leather",
    corHex: "#5a3820",
    cardGradient: "linear-gradient(135deg, #2d1c14 0%, #1c100a 60%, #120905 100%)",
    cardBorder: "rgba(180, 140, 100, 0.35)",
    tabCor: "#7a4e2e",
    imagem: "/images/pastas/pasta-marrom.svg",
  },
  {
    id: "verde",
    nome: "Green",
    etiqueta: "Botanical Moss",
    corHex: "#1e3827",
    cardGradient: "linear-gradient(135deg, #182c1f 0%, #0f1d14 60%, #09120c 100%)",
    cardBorder: "rgba(140, 180, 150, 0.35)",
    tabCor: "#2e563c",
    imagem: "/images/pastas/pasta-verde.svg",
  },
  {
    id: "vinho",
    nome: "Wine",
    etiqueta: "Noble Burgundy",
    corHex: "#4a1a24",
    cardGradient: "linear-gradient(135deg, #2e1117 0%, #1d090e 60%, #130508 100%)",
    cardBorder: "rgba(190, 130, 145, 0.35)",
    tabCor: "#6a2634",
    imagem: "/images/pastas/pasta-vinho.svg",
  },
];

export const getFolderTheme = (cor?: string): FolderColorOption => {
  if (
    cor === "verde" ||
    cor === "#1e3827" ||
    cor === "#1c3224" ||
    cor === "#163321" ||
    cor === "#223826"
  ) {
    return FOLDER_COLOR_OPTIONS[1];
  }
  if (
    cor === "vinho" ||
    cor === "#4a1a24" ||
    cor === "#451a24" ||
    cor === "#3a0f18" ||
    cor === "#441a24"
  ) {
    return FOLDER_COLOR_OPTIONS[2];
  }
  return FOLDER_COLOR_OPTIONS[0];
};

export interface PostalSeal {
  id: string;
  label: string;
  code: string;
  color: string;
  postmark: string;
}

export const SEAL_OPTIONS: PostalSeal[] = [
  { id: "amor", label: "Love", code: "I. LV", color: "#8B1E1E", postmark: "AFFECTIVE MAIL" },
  { id: "saudade", label: "Longing", code: "II. LG", color: "#1C2A39", postmark: "DISTANT SENDER" },
  { id: "desabafo", label: "Confession", code: "III. CF", color: "#4A3E31", postmark: "FREE CONFESSION" },
  { id: "nunca-enviada", label: "Unsent", code: "IV. US", color: "#2B3A2E", postmark: "UNADDRESSED" },
  { id: "silencio", label: "Silence", code: "V. SL", color: "#3D3935", postmark: "SILENT TIME" },
  { id: "historica", label: "Historical", code: "VI. HS", color: "#6A5432", postmark: "PERMANENT ARCHIVE" },
];

export const LETTER_THEMES = [
  "Love",
  "Longing",
  "Friendship",
  "Memories",
  "Gratitude",
  "Dreams",
  "Family",
  "Personal",
  "Unsent Letters",
] as const;

export type LetterTheme = typeof LETTER_THEMES[number];

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

export function getSealByIdOrLabel(sealValue?: string): PostalSeal {
  if (!sealValue) return SEAL_OPTIONS[0];
  const normalized = sealValue.toLowerCase();
  return (
    SEAL_OPTIONS.find(
      (s) => s.id.toLowerCase() === normalized || s.label.toLowerCase() === normalized
    ) || SEAL_OPTIONS[0]
  );
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
  return {
    ...page,
    titulo: (page.titulo || "").trim(),
    conteudo: normalizeJournalContentForStorage(page.conteudo || ""),
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

export function renameUserNotebook(notebookId: string, newName: string): Notebook[] {
  const trimmed = newName.trim();
  if (!trimmed) return loadAllRawNotebooks();
  const nowIso = new Date().toISOString();
  const target = loadAllRawNotebooks().find((nb) => nb.id === notebookId);
  const updated = loadAllRawNotebooks().map((nb) =>
    nb.id === notebookId ? { ...nb, nome: trimmed, atualizadoEm: nowIso } : nb
  );
  saveAllNotebooks(updated);
  if (target) {
    api.journal
      .upsertNotebook(notebookId, {
        nome: trimmed,
        corCapa: target.corCapa || "marrom",
        paginas: filterWrittenPages(target.paginas),
      })
      .catch(() => {});
  }
  return updated;
}

export function deleteUserNotebook(notebookId: string): Notebook[] {
  const remaining = loadAllRawNotebooks().filter((nb) => nb.id !== notebookId);
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

export function loadTrashLetters(userId?: number | string | null): JournalEntry[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const rawTrash = window.localStorage.getItem(TRASH_STORAGE_KEY);
    if (!rawTrash) return [];
    const parsed = JSON.parse(rawTrash);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item: JournalEntry) =>
        item &&
        item.usuario_id !== undefined &&
        item.usuario_id !== null &&
        String(item.usuario_id) === String(userId)
    );
  } catch {
    return [];
  }
}

export function loadSavedLetters(userId?: number | string | null): JournalEntry[] {
  if (typeof window === "undefined" || !userId) return [];
  const trash = loadTrashLetters(userId);
  const trashIds = new Set(trash.map((d) => String(d.id)));
  try {
    const raw = window.localStorage.getItem(SAVED_ENTRIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e: JournalEntry) => {
      if (!e || trashIds.has(String(e.id))) return false;
      const isLetterEntry =
        Boolean(e.selo_carta) ||
        e.status === "draft" ||
        e.status === "completed" ||
        e.humor !== "reflexao";
      if (!isLetterEntry) return false;
      if (e.usuario_id === undefined || e.usuario_id === null) return false;
      return String(e.usuario_id) === String(userId);
    });
  } catch {
    return [];
  }
}

export function upsertUserLetter(letter: JournalEntry, source?: string): JournalEntry[] {
  if (typeof window === "undefined") return [];
  let all: JournalEntry[] = [];
  try {
    const raw = window.localStorage.getItem(SAVED_ENTRIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) all = parsed;
    }
  } catch {}

  const exists = all.some((item) => String(item.id) === String(letter.id));
  const updated = exists
    ? all.map((item) => (String(item.id) === String(letter.id) ? { ...item, ...letter } : item))
    : [letter, ...all];

  try {
    window.localStorage.setItem(SAVED_ENTRIES_KEY, JSON.stringify(updated));
  } catch {}
  dispatchJournalUpdated(source);
  return updated;
}

export function renameUserLetter(
  letterId: string,
  newTitle: string,
  newRecipient?: string
): JournalEntry[] {
  const trimmedTitle = newTitle.trim();
  if (!trimmedTitle || typeof window === "undefined") return loadSavedLetters();
  let all: JournalEntry[] = [];
  try {
    const raw = window.localStorage.getItem(SAVED_ENTRIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) all = parsed;
    }
  } catch {}

  const nowIso = new Date().toISOString();
  const updated = all.map((item) => {
    if (String(item.id) === String(letterId)) {
      return {
        ...item,
        titulo: trimmedTitle,
        destinatario: newRecipient !== undefined ? newRecipient.trim() : item.destinatario,
        atualizado_em: nowIso,
      };
    }
    return item;
  });

  try {
    window.localStorage.setItem(SAVED_ENTRIES_KEY, JSON.stringify(updated));
  } catch {}
  dispatchJournalUpdated();
  return updated;
}

export function moveLetterToPostalTrash(carta: JournalEntry) {
  if (typeof window === "undefined") return;
  let currentTrash: JournalEntry[] = [];
  try {
    const rawTrash = window.localStorage.getItem(TRASH_STORAGE_KEY);
    if (rawTrash) {
      const parsed = JSON.parse(rawTrash);
      if (Array.isArray(parsed)) currentTrash = parsed;
    }
  } catch {}

  const updatedTrash = [carta, ...currentTrash.filter((t) => String(t.id) !== String(carta.id))];
  try {
    window.localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(updatedTrash));
  } catch {}

  try {
    const raw = window.localStorage.getItem(SAVED_ENTRIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const rest = parsed.filter((p: any) => String(p.id) !== String(carta.id));
        window.localStorage.setItem(SAVED_ENTRIES_KEY, JSON.stringify(rest));
      }
    }
  } catch {}

  try {
    const activeEdit = window.localStorage.getItem(ACTIVE_LETTER_EDIT_ID_KEY);
    if (activeEdit && String(activeEdit) === String(carta.id)) {
      window.localStorage.removeItem(ACTIVE_LETTER_EDIT_ID_KEY);
    }
  } catch {}

  dispatchJournalUpdated();
  const remoteId = carta.remote_id || (!String(carta.id).startsWith("entry-") ? carta.id : null);
  if (remoteId) {
    api.cartas.setTrash(remoteId, true).catch(() => {});
  }
}

export function restoreLetterFromPostalTrash(carta: JournalEntry) {
  if (typeof window === "undefined") return;
  let currentTrash: JournalEntry[] = [];
  try {
    const rawTrash = window.localStorage.getItem(TRASH_STORAGE_KEY);
    if (rawTrash) {
      const parsed = JSON.parse(rawTrash);
      if (Array.isArray(parsed)) currentTrash = parsed;
    }
  } catch {}

  const updatedTrash = currentTrash.filter((t) => String(t.id) !== String(carta.id));
  try {
    window.localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(updatedTrash));
  } catch {}

  let savedList: JournalEntry[] = [];
  try {
    const raw = window.localStorage.getItem(SAVED_ENTRIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) savedList = parsed;
    }
  } catch {}

  const updatedSaved = [carta, ...savedList.filter((l: any) => String(l.id) !== String(carta.id))];
  try {
    window.localStorage.setItem(SAVED_ENTRIES_KEY, JSON.stringify(updatedSaved));
  } catch {}

  dispatchJournalUpdated();
  const remoteId = carta.remote_id || (!String(carta.id).startsWith("entry-") ? carta.id : null);
  if (remoteId) {
    api.cartas.setTrash(remoteId, false).catch(() => {});
  }
}

export function permanentlyDeleteLetterFromStorage(letterId: string) {
  if (typeof window === "undefined") return;
  try {
    const rawTrash = window.localStorage.getItem(TRASH_STORAGE_KEY);
    if (rawTrash) {
      const parsedTrash = JSON.parse(rawTrash);
      if (Array.isArray(parsedTrash)) {
        window.localStorage.setItem(
          TRASH_STORAGE_KEY,
          JSON.stringify(parsedTrash.filter((t: any) => String(t.id) !== String(letterId)))
        );
      }
    }
  } catch {}

  try {
    const raw = window.localStorage.getItem(SAVED_ENTRIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        window.localStorage.setItem(
          SAVED_ENTRIES_KEY,
          JSON.stringify(parsed.filter((p: any) => String(p.id) !== String(letterId)))
        );
      }
    }
  } catch {}

  try {
    const activeEdit = window.localStorage.getItem(ACTIVE_LETTER_EDIT_ID_KEY);
    if (activeEdit && String(activeEdit) === String(letterId)) {
      window.localStorage.removeItem(ACTIVE_LETTER_EDIT_ID_KEY);
    }
  } catch {}

  dispatchJournalUpdated();
}

export function emptyAllPostalTrash() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify([]));
  } catch {}
  dispatchJournalUpdated();
}

export function loadLetterFolders(userId?: number | string | null): LetterFolder[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = window.localStorage.getItem(LETTER_FOLDERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid = parsed.filter((f: LetterFolder) => f && f.id !== "pasta-principal");
    return valid.filter(
      (f) => f.ownerId !== undefined && f.ownerId !== null && String(f.ownerId) === String(userId)
    );
  } catch {
    return [];
  }
}

export function saveLetterFolders(folders: LetterFolder[], source?: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LETTER_FOLDERS_STORAGE_KEY, JSON.stringify(folders));
  } catch {}
  dispatchJournalUpdated(source);
}

export function saveAllLetters(letters: JournalEntry[], source?: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SAVED_ENTRIES_KEY, JSON.stringify(letters));
  } catch {}
  dispatchJournalUpdated(source);
}

export function createLetterFolder(
  nome: string,
  cor: string = "marrom",
  userId?: number | string | null
): LetterFolder {
  const existing = loadLetterFolders(userId);
  const newFolder: LetterFolder = {
    id: "folder-" + Date.now(),
    nome: nome.trim(),
    cor,
    criadoEm: new Date().toISOString(),
    ownerId: userId || undefined,
  };
  saveLetterFolders([...existing, newFolder]);
  if (userId) {
    api.journal
      .upsertFolder(newFolder.id, { nome: newFolder.nome, cor: newFolder.cor })
      .catch(() => {});
  }
  return newFolder;
}

export function renameLetterFolder(
  folderId: string,
  novoNome: string,
  userId?: number | string | null
) {
  const trimmed = novoNome.trim();
  if (!trimmed) return;
  const existing = loadLetterFolders(userId);
  const target = existing.find((f) => f.id === folderId);
  const updated = existing.map((f) =>
    f.id === folderId ? { ...f, nome: trimmed } : f
  );
  saveLetterFolders(updated);

  if (userId) {
    api.journal
      .upsertFolder(folderId, { nome: trimmed, cor: target?.cor || "marrom" })
      .catch(() => {});
  }

  // Update in saved letters
  const allLetters = loadSavedLetters(userId);
  let changed = false;
  const updatedLetters = allLetters.map((l) => {
    if (l.pasta_id === folderId) {
      changed = true;
      return { ...l, pasta_nome: trimmed };
    }
    return l;
  });
  if (changed) {
    saveAllLetters(updatedLetters);
  }
}

export function deleteLetterFolder(
  folderId: string,
  userId?: number | string | null
) {
  const existing = loadLetterFolders(userId);
  const remaining = existing.filter((f) => f.id !== folderId);
  saveLetterFolders(remaining);

  if (userId) {
    api.journal.deleteFolder(folderId).catch(() => {});
  }

  // Safeguard: reassign letters in this folder to the first remaining folder or unfiled, so no letters are ever deleted
  const fallback = remaining[0];
  const allLetters = loadSavedLetters(userId);
  let changed = false;
  const updatedLetters = allLetters.map((l) => {
    if (l.pasta_id === folderId) {
      changed = true;
      return {
        ...l,
        pasta_id: fallback ? fallback.id : undefined,
        pasta_nome: fallback ? fallback.nome : undefined,
      };
    }
    return l;
  });
  if (changed) {
    saveAllLetters(updatedLetters);
  }
}

export function moveLetterToFolder(
  letterId: string,
  targetFolderId: string,
  targetFolderName: string,
  userId?: number | string | null
) {
  const allLetters = loadSavedLetters(userId);
  let movedLetter: JournalEntry | null = null;
  const updatedLetters = allLetters.map((l) => {
    if (String(l.id) === String(letterId)) {
      movedLetter = {
        ...l,
        pasta_id: targetFolderId,
        pasta_nome: targetFolderName,
        atualizado_em: new Date().toISOString(),
      };
      return movedLetter;
    }
    return l;
  });
  saveAllLetters(updatedLetters);
  if (userId && movedLetter) {
    const ml = movedLetter as JournalEntry;
    const remoteId = ml.remote_id || (!String(ml.id).startsWith("entry-") ? ml.id : null);
    if (remoteId) {
      api.cartas
        .atualizar(remoteId, {
          titulo: ml.titulo || "Untitled",
          pasta_client_id: targetFolderId,
          pasta_nome: targetFolderName,
        })
        .catch(() => {});
    }
  }
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
 * Hydrates an authenticated user's persistent notebooks, folders, and letters from
 * MariaDB directly into clean user-scoped storage. Never touches other users' records.
 */
export async function hydrateUserDataFromBackend(userId: number | string): Promise<void> {
  if (typeof window === "undefined" || !userId) return;

  try {
    const [nbRes, folderRes, cartasRes] = await Promise.all([
      api.journal.listNotebooks().catch(() => null),
      api.journal.listFolders().catch(() => null),
      api.cartas.minhas().catch(() => null),
    ]);

    if (nbRes && Array.isArray(nbRes.notebooks)) {
      const remoteNbs: Notebook[] = nbRes.notebooks.map((nb: any) => ({
        ...nb,
        ownerId: userId,
      }));
      saveAllNotebooks(remoteNbs, "backend-sync");
    }

    if (folderRes && Array.isArray(folderRes.folders)) {
      const remoteFolders: LetterFolder[] = folderRes.folders.map((f: any) => ({
        ...f,
        ownerId: userId,
      }));
      saveLetterFolders(remoteFolders, "backend-sync");
    }

    if (cartasRes && Array.isArray(cartasRes.cartas)) {
      const activeLetters: JournalEntry[] = [];
      const trashedLetters: JournalEntry[] = [];

      for (const c of cartasRes.cartas) {
        const mapped: JournalEntry = {
          id: c.client_id || String(c.id),
          remote_id: c.id,
          titulo: c.titulo,
          destinatario: c.destinatario_anonimo || undefined,
          assinatura: c.remetente_anonimo || undefined,
          conteudo: c.conteudo,
          humor: c.categoria || "desabafo",
          tema_carta: c.tema_carta || undefined,
          data_formatada:
            c.data_carta ||
            new Date(c.criado_em).toLocaleDateString("en-US"),
          criado_em: c.criado_em,
          atualizado_em: c.criado_em,
          tipo_papel: c.tipo_papel || "ivory",
          fonte: c.fonte || "caveat",
          favoritado: Boolean(c.favoritado),
          selo_carta: c.categoria ? c.categoria.toUpperCase() : "LETTER",
          pasta_id: c.pasta_client_id || undefined,
          pasta_nome: c.pasta_nome || undefined,
          status: c.status_carta === "draft" ? "draft" : "completed",
          usuario_id: c.usuario_id || userId,
        };
        if (c.na_lixeira === 1 || c.na_lixeira === true) {
          trashedLetters.push(mapped);
        } else {
          activeLetters.push(mapped);
        }
      }

      try {
        window.localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(trashedLetters));
      } catch {}
      saveAllLetters(activeLetters, "backend-sync");
    }
  } catch {
    // Silent fallback if transient network issue
  }
}
