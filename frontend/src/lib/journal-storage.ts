"use client";

export const JOURNAL_UPDATED_EVENT = "entre-cartas:journal-updated";
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

export type NotebookCoverColor = "marrom" | "verde" | "vinho";

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
];

export const getNotebookTheme = (corCapa?: string): NotebookColorOption => {
  if (
    corCapa === "verde" ||
    corCapa === "#163321" ||
    corCapa === "#223826" ||
    corCapa === "#1e3323" ||
    corCapa === "#1c3224"
  ) {
    return NOTEBOOK_COLOR_OPTIONS[1];
  }
  if (
    corCapa === "vinho" ||
    corCapa === "#3a0f18" ||
    corCapa === "#441a24" ||
    corCapa === "#3b161e" ||
    corCapa === "#451a24"
  ) {
    return NOTEBOOK_COLOR_OPTIONS[2];
  }
  return NOTEBOOK_COLOR_OPTIONS[0];
};

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

export const PAPER_OPTIONS = [
  { id: "marfim", name: "Cotton & Ivory", color: "#FCFBF7" },
  { id: "pergaminho", name: "Mellow Parchment", color: "#F7F3EA" },
  { id: "kraft", name: "Noble Raw Linen", color: "#EFE8DA" },
  { id: "branco", name: "Classic Letter Paper", color: "#FAF9F5" },
];

export const INK_OPTIONS = [
  { id: "nanquim", name: "Soft India Ink", color: "#262626" },
  { id: "azul-noite", name: "Deep Midnight Blue", color: "#1C2A39" },
  { id: "sepia", name: "Archival Sepia", color: "#4A3E31" },
  { id: "grafite", name: "Sober Graphite", color: "#3A3A3A" },
];

export const FONT_OPTIONS = [
  { id: "caveat", name: "Fountain Pen Script", styleFamily: "'Caveat', cursive" },
  { id: "literary", name: "Literary Italic", styleFamily: "var(--literary-italic, 'EB Garamond', Georgia, serif)" },
  { id: "garamond", name: "Classic Serif", styleFamily: "var(--serif, 'EB Garamond', serif)" },
  { id: "typewriter", name: "Historical Typewriter", styleFamily: "'Special Elite', monospace" },
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

export function filterWrittenPages(pages?: NotebookPage[]): NotebookPage[] {
  if (!Array.isArray(pages)) return [];
  return pages.filter(
    (p) =>
      Boolean(p?.conteudo && p.conteudo.trim().length > 0) ||
      Boolean(p?.titulo && p.titulo.trim().length > 0)
  );
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
  const all = loadAllRawNotebooks();
  if (!userId) return all;
  return all.filter((nb) => !nb.ownerId || String(nb.ownerId) === String(userId));
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
  const updated = loadAllRawNotebooks().map((nb) =>
    nb.id === notebookId ? { ...nb, nome: trimmed, atualizadoEm: nowIso } : nb
  );
  saveAllNotebooks(updated);
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
  return remaining;
}

export function loadTrashLetters(userId?: number | string | null): JournalEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const rawTrash = window.localStorage.getItem(TRASH_STORAGE_KEY);
    if (!rawTrash) return [];
    const parsed = JSON.parse(rawTrash);
    if (!Array.isArray(parsed)) return [];
    if (!userId) return parsed;
    return parsed.filter((item: JournalEntry) => !item.usuario_id || String(item.usuario_id) === String(userId));
  } catch {
    return [];
  }
}

export function loadSavedLetters(userId?: number | string | null): JournalEntry[] {
  if (typeof window === "undefined") return [];
  const trash = loadTrashLetters();
  const trashIds = new Set(trash.map((d) => String(d.id)));
  try {
    const raw = window.localStorage.getItem(SAVED_ENTRIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e: JournalEntry) => {
      if (!e || trashIds.has(String(e.id))) return false;
      const isLetterEntry = Boolean(e.selo_carta) || e.status === "draft" || e.status === "completed" || e.humor !== "reflexao";
      if (!isLetterEntry) return false;
      if (userId && e.usuario_id && String(e.usuario_id) !== String(userId)) return false;
      return true;
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
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LETTER_FOLDERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid = parsed.filter((f: LetterFolder) => f && f.id !== "pasta-principal");
    if (!userId) return valid;
    return valid.filter((f) => !f.ownerId || String(f.ownerId) === String(userId));
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
