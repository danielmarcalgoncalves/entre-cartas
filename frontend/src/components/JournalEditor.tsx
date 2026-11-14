"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { letters, type Letter } from "@/lib/letters";
import { Tape, Sticker } from "@/components/paper-kit";
import { useAuth } from "@/hooks/useAuth";
import { useGuestDemo } from "@/hooks/useGuestDemo";
import { api } from "@/services/api";
import GuestSavePromptModal, { type GuestPromptVariant } from "@/components/GuestSavePromptModal";
import { registerJournalNavigationGuard } from "@/lib/journal-navigation-guard";
import {
  type JournalAttachment,
  type JournalSticker,
} from "@/lib/journal-storage";
import {
  ScrapbookLayer,
  type SelectedScrapbookItem,
} from "@/components/journal/ScrapbookLayer";
import { ScrapbookInspectorPanel } from "@/components/journal/ScrapbookInspectorPanel";
import { StickerCatalogDrawer } from "@/components/journal/StickerCatalogDrawer";
import { PhotoUploadModal } from "@/components/journal/PhotoUploadModal";
import { type StickerDefinition } from "@/lib/scrapbook-stickers";
import {
  JOURNAL_MAX_CHARS_PER_PAGE,
  JOURNAL_MAX_LINES_PER_PAGE,
  JOURNAL_PAGE_HEIGHT,
  JOURNAL_PAGE_WIDTH,
  countNonNewlineChars,
  hasMeaningfulJournalText,
  isJournalPageMeaningful,
  normalizeJournalContentForStorage,
  normalizeJournalLineEndings,
  splitJournalPageOverflow,
  splitJournalPagesRecursive,
} from "@/lib/journal-page-layout";
import {
  ACTIVE_LETTER_EDIT_ID_KEY,
  ACTIVE_LETTER_FOLDER_ID_KEY,
  ACTIVE_NOTEBOOK_ID_KEY,
  ACTIVE_NOTEBOOK_PAGE_KEY,
  FOLDER_COLOR_OPTIONS,
  FONT_OPTIONS,
  INK_OPTIONS,
  JOURNAL_UPDATED_EVENT,
  LETTER_FOLDERS_STORAGE_KEY,
  NOTEBOOK_COLOR_OPTIONS,
  NOTEBOOKS_STORAGE_KEY,
  PAPER_OPTIONS,
  PINNED_THEME_STORAGE_KEY,
  PROMPTS,
  SAVED_ENTRIES_KEY,
  SEAL_OPTIONS,
  SESSION_CLEARED_EVENT,
  TRASH_STORAGE_KEY,
  filterWrittenPages,
  getFontFamilyById,
  getFolderTheme,
  getInkColorById,
  getNotebookDates,
  getNotebookTheme,
  getPaperColorById,
  loadUserNotebooks,
  normalizeNotebookPageForStorage,
  playPaperSound,
  renameUserNotebook,
  saveAllNotebooks,
  loadAllRawNotebooks,
  type FolderColorOption,
  type JournalEntry,
  type LetterFolder,
  type Notebook,
  type NotebookColorOption,
  type NotebookCoverColor,
  type NotebookPage,
  type PostalSeal,
} from "@/lib/journal-storage";

export {
  ACTIVE_LETTER_EDIT_ID_KEY,
  ACTIVE_LETTER_FOLDER_ID_KEY,
  ACTIVE_NOTEBOOK_ID_KEY,
  ACTIVE_NOTEBOOK_PAGE_KEY,
  FOLDER_COLOR_OPTIONS,
  FONT_OPTIONS,
  INK_OPTIONS,
  JOURNAL_UPDATED_EVENT,
  LETTER_FOLDERS_STORAGE_KEY,
  NOTEBOOK_COLOR_OPTIONS,
  NOTEBOOKS_STORAGE_KEY,
  PAPER_OPTIONS,
  PINNED_THEME_STORAGE_KEY,
  PROMPTS,
  SAVED_ENTRIES_KEY,
  SEAL_OPTIONS,
  TRASH_STORAGE_KEY,
  getFolderTheme,
  getNotebookTheme,
  type FolderColorOption,
  type JournalEntry,
  type LetterFolder,
  type Notebook,
  type NotebookColorOption,
  type NotebookCoverColor,
  type NotebookPage,
  type PostalSeal,
};

// Exact line count & char capacity shared with the cinematic 3D viewer
const MAX_LINES_PER_PAGE = JOURNAL_MAX_LINES_PER_PAGE;
const MAX_CHARS_PER_PAGE = JOURNAL_MAX_CHARS_PER_PAGE;

function EyeIcon({ className = "", filled = false }: { className?: string; filled?: boolean }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r={filled ? "3.2" : "3"} fill={filled ? "currentColor" : "none"} />
      {filled && <circle cx="13.2" cy="10.8" r="0.9" fill="#0d0b09" />}
    </svg>
  );
}

function SaveIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

type AutosaveStatus = "idle" | "saving" | "saved" | "error";

interface PageSignatureEntry {
  contentSig: string;
  fullSig: string;
}

interface ConfirmedNotebookSnapshot {
  pagesById: Map<string, PageSignatureEntry>;
  orderedIds: string[];
}

function getPageQualifyingContentSignature(page: NotebookPage): string {
  return JSON.stringify({
    titulo: (page.titulo || "").trim(),
    conteudo: normalizeJournalContentForStorage(page.conteudo || ""),
    polaroid: (page as any).polaroid_url || "",
    attachments: (page.attachments || []).map((a) => ({
      id: a.id,
      objectKey: a.objectKey,
      x: a.x,
      y: a.y,
      width: a.width,
      height: a.height,
      rotation: a.rotation,
      zIndex: a.zIndex,
      style: a.style,
      caption: a.caption || "",
    })),
    stickers: (page.stickers || []).map((s) => ({
      id: s.id,
      stickerId: s.stickerId,
      x: s.x,
      y: s.y,
      scale: s.scale,
      rotation: s.rotation,
      zIndex: s.zIndex,
    })),
  });
}

function getPageFullPersistenceSignature(page: NotebookPage): string {
  return JSON.stringify({
    titulo: (page.titulo || "").trim(),
    conteudo: normalizeJournalContentForStorage(page.conteudo || ""),
    favoritado: Boolean(page.favoritado),
    tipoPapel: page.tipoPapel || "",
    corTinta: page.corTinta || "",
    fonte: page.fonte || "",
    polaroid: (page as any).polaroid_url || "",
    polaroidLegenda: (page as any).polaroid_legenda || "",
    attachments: page.attachments || [],
    stickers: page.stickers || [],
  });
}

function buildSnapshotFromWrittenPages(
  writtenPages: NotebookPage[]
): ConfirmedNotebookSnapshot {
  const pagesById = new Map<string, PageSignatureEntry>();
  const orderedIds: string[] = [];
  for (const p of writtenPages) {
    pagesById.set(p.id, {
      contentSig: getPageQualifyingContentSignature(p),
      fullSig: getPageFullPersistenceSignature(p),
    });
    orderedIds.push(p.id);
  }
  return { pagesById, orderedIds };
}

export default function JournalEditor() {
  const router = useRouter();
  const { user, loading: authLoading, isPro } = useAuth();
  const isGuestMode = !authLoading && !user;
  const {
    guestNotebooks,
    setGuestNotebooks,
    guestActiveNotebookId,
    setGuestActiveNotebookId,
    guestPinnedTheme,
    setGuestPinnedTheme,
  } = useGuestDemo();

  const [guestPromptOpen, setGuestPromptOpen] = useState(false);
  const [guestPromptVariant, setGuestPromptVariant] = useState<GuestPromptVariant>("save");
  const [sheetScale, setSheetScale] = useState(1);

  // Scrapbook studio state
  const [stickerDrawerOpen, setStickerDrawerOpen] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [guestPhotoNoticeOpen, setGuestPhotoNoticeOpen] = useState(false);
  const [selectedScrapbookItem, setSelectedScrapbookItem] = useState<SelectedScrapbookItem>(null);
  const [scrapbookUndoStack, setScrapbookUndoStack] = useState<
    Array<{ attachments: JournalAttachment[]; stickers: JournalSticker[] }>
  >([]);
  const [scrapbookRedoStack, setScrapbookRedoStack] = useState<
    Array<{ attachments: JournalAttachment[]; stickers: JournalSticker[] }>
  >([]);
  const lastCommittedScrapbookRef = useRef<{
    attachments: JournalAttachment[];
    stickers: JournalSticker[];
  } | null>(null);

  const openGuestPrompt = (variant: GuestPromptVariant) => {
    setGuestPromptVariant(variant);
    setGuestPromptOpen(true);
  };

  // Preserve identical canonical 580x820 sheet layout on narrow viewports via proportional scaling
  useEffect(() => {
    const updateSheetScale = () => {
      const vw = window.innerWidth;
      const availableWidth = vw < 680 ? vw - 64 : vw - 140;
      const nextScale =
        availableWidth < JOURNAL_PAGE_WIDTH
          ? Math.max(0.45, Number((availableWidth / JOURNAL_PAGE_WIDTH).toFixed(4)))
          : 1;
      setSheetScale(nextScale);
    };

    updateSheetScale();
    window.addEventListener("resize", updateSheetScale);
  return () => window.removeEventListener("resize", updateSheetScale);
  }, []);

  // Focus Mode
  const [modoFoco, setModoFoco] = useState(false);

  // Notebooks and Pages
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [activeNotebookId, setActiveNotebookId] = useState<string>("");
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [notebookDrawerOpen, setNotebookDrawerOpen] = useState(false);
  const [newNotebookTitle, setNewNotebookTitle] = useState("");
  const [newNotebookNameError, setNewNotebookNameError] = useState<string | null>(null);
  const [newNotebookCover, setNewNotebookCover] = useState<NotebookCoverColor>("marrom");
  const [creatingNotebook, setCreatingNotebook] = useState(false);
  const [cadernoPromptNotice, setCadernoPromptNotice] = useState<string | null>(null);
  const [pendingSaveAfterCreation, setPendingSaveAfterCreation] = useState(false);

  // Inline rename inside drawer
  const [renamingNotebookId, setRenamingNotebookId] = useState<string | null>(null);
  const [renameDraftValue, setRenameDraftValue] = useState("");

  // Active Journal Page Content
  const [cadernoTitulo, setCadernoTitulo] = useState("");
  const [cadernoConteudo, setCadernoConteudo] = useState("");
  const [cadernoFavoritado, setCadernoFavoritado] = useState(false);
  const [cadernoPaginas, setCadernoPaginas] = useState<NotebookPage[]>([]);

  const [dataFormatada, setDataFormatada] = useState("");

  // Pinned theme
  const [temaSalvo, setTemaSalvo] = useState<string>("");

  // Customization Menu
  const [customMenuOpen, setCustomMenuOpen] = useState(false);
  const [sheetBgId, setSheetBgId] = useState("marfim");
  const [sheetBgColor, setSheetBgColor] = useState("#FCFBF7");
  const [inkColorId, setInkColorId] = useState("nanquim");
  const [inkColor, setInkColor] = useState("#262626");
  const [fontFamilyId, setFontFamilyId] = useState("caveat");

  // Inspiration
  const [inspiracaoModal, setInspiracaoModal] = useState(false);
  const [cartaInspiracao, setCartaInspiracao] = useState<Letter | null>(null);
  const [promptTexto, setPromptTexto] = useState("");

  // Feedback, Autosave & Navigation Protection
  const [salvando, setSalvando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("idle");
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [navFailureModalOpen, setNavFailureModalOpen] = useState(false);
  const [navFailureContextLabel, setNavFailureContextLabel] = useState("leaving the editor");
  const [retryingNavSave, setRetryingNavSave] = useState(false);
  const [editRevision, setEditRevision] = useState(0);

  const menuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const newNotebookInputRef = useRef<HTMLInputElement>(null);
  const hasInitialLoadedRef = useRef(false);
  const appliedUrlNotebookRef = useRef<string | null>(null);
  const activeNotebookIdRef = useRef(activeNotebookId);
  activeNotebookIdRef.current = activeNotebookId;

  const editRevisionRef = useRef(0);
  const confirmedSnapshotsRef = useRef<Record<string, ConfirmedNotebookSnapshot>>({});
  const inFlightSavePromiseRef = useRef<Promise<boolean> | null>(null);
  const pendingNavActionRef = useRef<(() => void) | null>(null);

  const createBlankPage = (dateLabel?: string): NotebookPage => ({
    id: "pag-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
    titulo: "",
    conteudo: "",
    dataFormatada: dateLabel || dataFormatada || "Today",
    favoritado: false,
    criadoEm: new Date().toISOString(),
    tipoPapel: sheetBgId,
    corTinta: inkColorId,
    fonte: fontFamilyId,
  });

  const applyPageFormatting = (page?: NotebookPage) => {
    if (!page) return;
    if (page.tipoPapel) {
      setSheetBgId(page.tipoPapel);
      setSheetBgColor(getPaperColorById(page.tipoPapel));
    }
    if (page.corTinta) {
      setInkColorId(page.corTinta);
      setInkColor(getInkColorById(page.corTinta));
    }
    if (page.fonte) {
      setFontFamilyId(page.fonte);
    }
  };

  // Current date formatted in English
  useEffect(() => {
    const hoje = new Date();
    const opcoes: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    const dataExtenso = hoje.toLocaleDateString("en-US", opcoes);
    setDataFormatada(dataExtenso);
  }, []);

  // Load pinned theme cleanly depending on auth vs guest mode
  useEffect(() => {
    if (authLoading) return;
    if (isGuestMode) {
      setTemaSalvo(guestPinnedTheme || "");
      return;
    }
    try {
      const temaSalvoStorage = window.localStorage.getItem(PINNED_THEME_STORAGE_KEY);
      setTemaSalvo(temaSalvoStorage || "");
    } catch {}
  }, [authLoading, isGuestMode, guestPinnedTheme]);

  // Close customization menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setCustomMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Exit Focus Mode on Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && modoFoco) {
        setModoFoco(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modoFoco]);

  // Initialize notebooks from in-memory guest store (for guests) or LocalStorage (for authenticated users)
  const carregarCadernos = (event?: any) => {
    if (authLoading) return;
    if (event?.detail?.source === "editor") return;

    if (isGuestMode) {
      setNotebooks(guestNotebooks);
      const currentId = activeNotebookIdRef.current;
      const exists = guestNotebooks.some((n) => n.id === currentId);
      if (!hasInitialLoadedRef.current || !exists) {
        hasInitialLoadedRef.current = true;
        const targetId = guestNotebooks.some((n) => n.id === guestActiveNotebookId)
          ? guestActiveNotebookId
          : guestNotebooks[0]?.id || "";
        setActiveNotebookId(targetId);
        const active =
          guestNotebooks.find((n) => n.id === targetId) || guestNotebooks[0];
        const pages =
          active?.paginas && active.paginas.length > 0
            ? active.paginas
            : [createBlankPage()];
        setCadernoPaginas(pages);
        setCurrentPageIndex(0);
        setCadernoTitulo(pages[0]?.titulo || "");
        setCadernoConteudo(pages[0]?.conteudo || "");
        setCadernoFavoritado(Boolean(pages[0]?.favoritado));
        applyPageFormatting(pages[0]);
      }
      return;
    }

    const userOnlyNotebooks = loadUserNotebooks(user?.id);
    setNotebooks(userOnlyNotebooks);

    let urlNotebookId: string | null = null;
    let urlPageIndex: number | null = null;
    let shouldOpenCreate = false;

    if (typeof window !== "undefined") {
      try {
        const params = new URLSearchParams(window.location.search);
        urlNotebookId = params.get("notebook");
        const pageParam = params.get("page");
        if (pageParam !== null && !Number.isNaN(Number(pageParam))) {
          urlPageIndex = Number(pageParam);
        }
        if (params.get("create") === "1") {
          shouldOpenCreate = true;
        }
      } catch {}
    }

    if (shouldOpenCreate && !hasInitialLoadedRef.current) {
      setNotebookDrawerOpen(true);
    }

    const currentId = activeNotebookIdRef.current;
    const notebookAindaExiste = userOnlyNotebooks.some((n: Notebook) => n.id === currentId);
    const shouldApplyUrlNotebook =
      Boolean(urlNotebookId) && appliedUrlNotebookRef.current !== urlNotebookId;

    if (!hasInitialLoadedRef.current || !notebookAindaExiste || shouldApplyUrlNotebook) {
      hasInitialLoadedRef.current = true;
      if (urlNotebookId) {
        appliedUrlNotebookRef.current = urlNotebookId;
      }
      if (userOnlyNotebooks.length > 0) {
        let savedActiveId: string | null = null;
        let savedPageIdx: number | null = null;
        try {
          savedActiveId = window.localStorage.getItem(ACTIVE_NOTEBOOK_ID_KEY);
          const rawPage = window.localStorage.getItem(ACTIVE_NOTEBOOK_PAGE_KEY);
          if (rawPage !== null && !Number.isNaN(Number(rawPage))) {
            savedPageIdx = Number(rawPage);
            window.localStorage.removeItem(ACTIVE_NOTEBOOK_PAGE_KEY);
          }
        } catch {}

        const preferredId = urlNotebookId || savedActiveId;
        const targetActiveId = userOnlyNotebooks.some((n: Notebook) => n.id === preferredId)
          ? (preferredId as string)
          : userOnlyNotebooks[0].id;

        setActiveNotebookId(targetActiveId);
        try {
          window.localStorage.setItem(ACTIVE_NOTEBOOK_ID_KEY, targetActiveId);
        } catch {}

        const active =
          userOnlyNotebooks.find((n: Notebook) => n.id === targetActiveId) ||
          userOnlyNotebooks[0];
        const paginasEscritas = filterWrittenPages(active?.paginas);
        if (!confirmedSnapshotsRef.current[targetActiveId]) {
          confirmedSnapshotsRef.current[targetActiveId] =
            buildSnapshotFromWrittenPages(paginasEscritas);
        }
        const writtenPages =
          paginasEscritas.length > 0 ? paginasEscritas : [createBlankPage()];

        const desiredIdx = urlPageIndex ?? savedPageIdx ?? 0;
        const safeIdx =
          desiredIdx >= 0 && desiredIdx < writtenPages.length ? desiredIdx : 0;

        setCadernoPaginas(writtenPages);
        setCurrentPageIndex(safeIdx);
        setCadernoTitulo(writtenPages[safeIdx]?.titulo || "");
        setCadernoConteudo(writtenPages[safeIdx]?.conteudo || "");
        setCadernoFavoritado(Boolean(writtenPages[safeIdx]?.favoritado));
        applyPageFormatting(writtenPages[safeIdx]);
      } else {
        setActiveNotebookId("");
        const initialPage = createBlankPage();
        setCadernoPaginas([initialPage]);
        setCurrentPageIndex(0);
        setCadernoTitulo("");
        setCadernoConteudo("");
        setCadernoFavoritado(false);
      }
    }
  };

  useEffect(() => {
    hasInitialLoadedRef.current = false;
    appliedUrlNotebookRef.current = null;
    confirmedSnapshotsRef.current = {};
    setAutosaveStatus("idle");
    setSaveErrorMessage(null);
  }, [user?.id, isGuestMode]);

  useEffect(() => {
    const resetEditorMemory = () => {
      hasInitialLoadedRef.current = false;
      appliedUrlNotebookRef.current = null;
      confirmedSnapshotsRef.current = {};
      inFlightSavePromiseRef.current = null;
      setAutosaveStatus("idle");
      setSaveErrorMessage(null);
      setNotebooks([]);
      setActiveNotebookId("");
      setCadernoPaginas([createBlankPage()]);
      setCurrentPageIndex(0);
      setCadernoTitulo("");
      setCadernoConteudo("");
      setCadernoFavoritado(false);
    };
    window.addEventListener(SESSION_CLEARED_EVENT, resetEditorMemory);
  return () => {
      window.removeEventListener(SESSION_CLEARED_EVENT, resetEditorMemory);
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;
    carregarCadernos();
    if (isGuestMode) return;
    window.addEventListener(JOURNAL_UPDATED_EVENT, carregarCadernos);
    window.addEventListener("storage", carregarCadernos);
  return () => {
      window.removeEventListener(JOURNAL_UPDATED_EVENT, carregarCadernos);
      window.removeEventListener("storage", carregarCadernos);
    };
  }, [user?.id, authLoading, isGuestMode]);

  const activeNotebook: Notebook | null =
    notebooks.find((n) => n.id === activeNotebookId) ||
    (notebooks.length > 0 ? notebooks[0] : null);

  // Authoritative synchronous mirror of latest editor state to prevent stale-closure races
  const latestStateRef = useRef({
    user,
    isGuestMode,
    activeNotebook,
    cadernoPaginas,
    currentPageIndex,
    cadernoTitulo,
    cadernoConteudo,
    cadernoFavoritado,
    sheetBgId,
    inkColorId,
    fontFamilyId,
  });
  latestStateRef.current = {
    user,
    isGuestMode,
    activeNotebook,
    cadernoPaginas,
    currentPageIndex,
    cadernoTitulo,
    cadernoConteudo,
    cadernoFavoritado,
    sheetBgId,
    inkColorId,
    fontFamilyId,
  };

  const getMergedPagesSnapshot = useCallback(
    (overridePages?: NotebookPage[]): NotebookPage[] => {
      const s = latestStateRef.current;
      const basePages = overridePages ? [...overridePages] : [...s.cadernoPaginas];
      if (!overridePages && basePages[s.currentPageIndex]) {
        basePages[s.currentPageIndex] = {
          ...basePages[s.currentPageIndex],
          titulo: s.cadernoTitulo,
          conteudo: s.cadernoConteudo,
          favoritado: s.cadernoFavoritado,
          atualizadoEm: basePages[s.currentPageIndex].atualizadoEm || new Date().toISOString(),
          tipoPapel: s.sheetBgId,
          corTinta: s.inkColorId,
          fonte: s.fontFamilyId,
        };
      }
      return basePages;
    },
    []
  );

  const getQualifyingModifiedPagesCount = useCallback(
    (nbId: string, pages: NotebookPage[]): number => {
      const confirmed = confirmedSnapshotsRef.current[nbId];
      let count = 0;
      for (const p of pages) {
        if (!isJournalPageMeaningful(p)) continue;
        const currentSig = getPageQualifyingContentSignature(p);
        const savedSig = confirmed?.pagesById.get(p.id)?.contentSig;
        if (savedSig !== currentSig) {
          count++;
        }
      }
      return count;
    },
    []
  );

  const hasUnsavedBackendChanges = useCallback((): boolean => {
    const s = latestStateRef.current;
    if (s.isGuestMode || !s.user?.id) return false;
    if (!s.activeNotebook) {
  return (
        hasMeaningfulJournalText(s.cadernoConteudo) ||
        hasMeaningfulJournalText(s.cadernoTitulo)
      );
    }
    const confirmed = confirmedSnapshotsRef.current[s.activeNotebook.id];
    const merged = getMergedPagesSnapshot();
    const written = filterWrittenPages(merged).map(normalizeNotebookPageForStorage);
    if (!confirmed) {
      return written.length > 0;
    }
    if (written.length !== confirmed.orderedIds.length) {
      return true;
    }
    for (let i = 0; i < written.length; i++) {
      const p = written[i];
      if (confirmed.orderedIds[i] !== p.id) return true;
      const entry = confirmed.pagesById.get(p.id);
      if (!entry || entry.fullSig !== getPageFullPersistenceSignature(p)) {
        return true;
      }
    }
    return false;
  }, [getMergedPagesSnapshot]);

  const hasPendingSaveWork = useCallback((): boolean => {
    const s = latestStateRef.current;
    if (s.isGuestMode || !s.user?.id) return false;
    return Boolean(inFlightSavePromiseRef.current) || hasUnsavedBackendChanges();
  }, [hasUnsavedBackendChanges]);

  const syncLocalNotebooksStorage = useCallback(
    (
      targetNotebookId: string,
      paginasAtuais: NotebookPage[],
      markUpdatedTimestamp = true
    ) => {
      const s = latestStateRef.current;
      if (authLoading) return;
      const nowIso = new Date().toISOString();

      if (s.isGuestMode) {
        const paginasTemp = paginasAtuais.map((p) => ({
          ...p,
          atualizadoEm: p.atualizadoEm || nowIso,
        }));
        setNotebooks((prev) => {
          const updatedGuest = prev.map((nb) =>
            nb.id === targetNotebookId
              ? {
                  ...nb,
                  paginas: paginasTemp,
                  criadoEm: nb.criadoEm || nowIso,
                  atualizadoEm: markUpdatedTimestamp ? nowIso : nb.atualizadoEm || nowIso,
                }
              : nb
          );
          setGuestNotebooks(updatedGuest);
          return updatedGuest;
        });
        return;
      }

      if (!s.user?.id) return;

      const paginasEscritas = filterWrittenPages(paginasAtuais).map((p) => ({
        ...normalizeNotebookPageForStorage(p),
        atualizadoEm: p.atualizadoEm || nowIso,
      }));

      const allStored = loadAllRawNotebooks();
      const atualizados = allStored.map((nb) => {
        if (nb.id === targetNotebookId) {
          return {
            ...nb,
            paginas: paginasEscritas,
            criadoEm: nb.criadoEm || nowIso,
            atualizadoEm: markUpdatedTimestamp ? nowIso : nb.atualizadoEm || nowIso,
            ownerId: nb.ownerId || s.user!.id,
          };
        }
        return nb;
      });

      setNotebooks(
        atualizados.filter((nb) =>
          Boolean(nb.ownerId && String(nb.ownerId) === String(s.user!.id))
        )
      );
      saveAllNotebooks(atualizados, "editor");
    },
    [authLoading, setGuestNotebooks]
  );

  // Single-flight backend persistence queue: guarantees no conflicting concurrent writes,
  // preserves newer edits made while saving, and resets counter only after backend confirmation.
  const flushBackendSave = useCallback(
    async (overridePages?: NotebookPage[]): Promise<boolean> => {
      const s = latestStateRef.current;
      if (s.isGuestMode || !s.user?.id) return true;
      if (!s.activeNotebook) {
        return !(
          hasMeaningfulJournalText(s.cadernoConteudo) ||
          hasMeaningfulJournalText(s.cadernoTitulo)
        );
      }

      if (inFlightSavePromiseRef.current) {
        const prevOk = await inFlightSavePromiseRef.current;
        if (!prevOk) return false;
        if (!hasUnsavedBackendChanges() && !overridePages) {
          return true;
        }
      }

      const runSaveChain = async (): Promise<boolean> => {
        let loopOverride = overridePages;
        while (true) {
          const cur = latestStateRef.current;
          const targetNb = cur.activeNotebook;
          const curUser = cur.user;
          if (cur.isGuestMode || !curUser?.id || !targetNb) {
            return true;
          }

          const capturedRevision = editRevisionRef.current;
          const mergedPages = getMergedPagesSnapshot(loopOverride);
          loopOverride = undefined;
          const nowIso = new Date().toISOString();
          const paginasParaPersistir = filterWrittenPages(mergedPages).map((p) => ({
            ...normalizeNotebookPageForStorage(p),
            atualizadoEm: p.atualizadoEm || nowIso,
          }));
          const nextSnapshot = buildSnapshotFromWrittenPages(paginasParaPersistir);

          setAutosaveStatus("saving");
          setSaveErrorMessage(null);

          try {
            await api.journal.upsertNotebook(targetNb.id, {
              nome: targetNb.nome,
              corCapa: targetNb.corCapa,
              paginas: paginasParaPersistir,
            });

            // Confirm snapshot only after backend responds 2xx
            confirmedSnapshotsRef.current[targetNb.id] = nextSnapshot;
            syncLocalNotebooksStorage(targetNb.id, paginasParaPersistir, true);

            // If user continued writing while this save request was in flight,
            // immediately save the newer pending changes before marking "Saved".
            if (editRevisionRef.current !== capturedRevision && hasUnsavedBackendChanges()) {
              continue;
            }

            setAutosaveStatus("saved");
            setSaveErrorMessage(null);
            return true;
          } catch (err: any) {
            const msg =
              err?.message || "Unable to save your latest journal changes to the server.";
            setAutosaveStatus("error");
            setSaveErrorMessage(msg);
            return false;
          }
        }
      };

      const promise = runSaveChain();
      inFlightSavePromiseRef.current = promise;
      try {
        return await promise;
      } finally {
        if (inFlightSavePromiseRef.current === promise) {
          inFlightSavePromiseRef.current = null;
        }
      }
    },
    [getMergedPagesSnapshot, hasUnsavedBackendChanges, syncLocalNotebooksStorage]
  );

  // Two-page autosave trigger: automatically saves once 2 qualifying pages have new/modified meaningful content
  useEffect(() => {
    if (authLoading || isGuestMode || !user?.id || !activeNotebook) return;
    if (editRevision === 0) return;

    const merged = getMergedPagesSnapshot();
    const qualifyingModified = getQualifyingModifiedPagesCount(
      activeNotebook.id,
      merged
    );

    if (qualifyingModified >= 2 && !inFlightSavePromiseRef.current) {
      void flushBackendSave();
      return;
    }

    if (autosaveStatus === "saved" && hasUnsavedBackendChanges()) {
      setAutosaveStatus("idle");
    }
  }, [
    editRevision,
    authLoading,
    isGuestMode,
    user?.id,
    activeNotebook,
    autosaveStatus,
    getMergedPagesSnapshot,
    getQualifyingModifiedPagesCount,
    hasUnsavedBackendChanges,
    flushBackendSave,
  ]);

  const openNavFailureModal = useCallback(
    (pendingAction: () => void, contextLabel = "leaving the editor") => {
      pendingNavActionRef.current = pendingAction;
      setNavFailureContextLabel(contextLabel);
      setNavFailureModalOpen(true);
    },
    []
  );

  const handleRetryNavSave = async () => {
    if (retryingNavSave) return;
    setRetryingNavSave(true);
    try {
      const ok = await flushBackendSave();
      if (ok) {
        setNavFailureModalOpen(false);
        const action = pendingNavActionRef.current;
        pendingNavActionRef.current = null;
        if (action) action();
      }
    } finally {
      setRetryingNavSave(false);
    }
  };

  const handleStayInEditor = () => {
    pendingNavActionRef.current = null;
    setNavFailureModalOpen(false);
  };

  // Register navigation guard for SiteShell actions (search, Sign Out) and intercept all internal <Link> clicks
  useEffect(() => {
    if (authLoading || isGuestMode) return;

    const unregister = registerJournalNavigationGuard({
      hasPendingChanges: hasPendingSaveWork,
      flushBeforeNavigation: () => flushBackendSave(),
      promptSaveFailureModal: (pendingAction) =>
        openNavFailureModal(pendingAction, "leaving the editor"),
    });

    const handleDocumentLinkClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const rawHref = anchor.getAttribute("href") || "";
      if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:")) {
        return;
      }

      let parsed: URL;
      try {
        parsed = new URL(anchor.href, window.location.origin);
      } catch {
        return;
      }
      if (parsed.origin !== window.location.origin) return;

      const nextPath = `${parsed.pathname}${parsed.search}${parsed.hash}`;
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (nextPath === currentPath) return;

      if (!hasPendingSaveWork()) return;

      e.preventDefault();
      e.stopPropagation();

      if (!latestStateRef.current.activeNotebook) {
        setSaveErrorMessage(
          "Your writing is not yet saved inside a journal. Create a journal to keep it before leaving."
        );
        openNavFailureModal(() => router.push(nextPath), "leaving the editor");
        return;
      }

      void (async () => {
        const ok = await flushBackendSave();
        if (ok) {
          router.push(nextPath);
        } else {
          openNavFailureModal(() => router.push(nextPath), "leaving the editor");
        }
      })();
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasPendingSaveWork()) return;
      e.preventDefault();
      e.returnValue = "";
    };

    document.addEventListener("click", handleDocumentLinkClick, true);
    window.addEventListener("beforeunload", handleBeforeUnload);
  return () => {
      unregister();
      document.removeEventListener("click", handleDocumentLinkClick, true);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [
    authLoading,
    isGuestMode,
    hasPendingSaveWork,
    flushBackendSave,
    openNavFailureModal,
    router,
  ]);

  // Listen to EDIT request from reading room
  useEffect(() => {
    const handleEditRequest = (e: any) => {
      const { notebookId, pageIndex } = e.detail || {};
      if (!notebookId) return;

      const applyTarget = () => {
        setActiveNotebookId(notebookId);
        try {
          window.localStorage.setItem(ACTIVE_NOTEBOOK_ID_KEY, notebookId);
        } catch {}

        const targetNb = notebooks.find((n) => n.id === notebookId);
        if (targetNb) {
          const written = filterWrittenPages(targetNb.paginas);
          confirmedSnapshotsRef.current[targetNb.id] =
            buildSnapshotFromWrittenPages(written);
          const paginas =
            written.length > 0 ? written : [createBlankPage()];
          setCadernoPaginas(paginas);
          const idx = typeof pageIndex === "number" && paginas[pageIndex] ? pageIndex : 0;
          setCurrentPageIndex(idx);
          const pag = paginas[idx];
          if (pag) {
            setCadernoTitulo(pag.titulo || "");
            setCadernoConteudo(pag.conteudo || "");
            setCadernoFavoritado(Boolean(pag.favoritado));
            applyPageFormatting(pag);
          }
        }

        const deskElem = document.getElementById("mesa-de-escrita");
        if (deskElem) {
          deskElem.scrollIntoView({ behavior: "smooth", block: "start" });
        }

        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
          }
        }, 350);
      };

      if (activeNotebookIdRef.current !== notebookId && hasPendingSaveWork()) {
        void (async () => {
          const ok = await flushBackendSave();
          if (ok) {
            applyTarget();
          } else {
            openNavFailureModal(applyTarget, "switching journals");
          }
        })();
        return;
      }

      applyTarget();
    };

    window.addEventListener("entre-cartas:abrir-edicao-caderno", handleEditRequest);
  return () => {
      window.removeEventListener("entre-cartas:abrir-edicao-caderno", handleEditRequest);
    };
  }, [notebooks, hasPendingSaveWork, flushBackendSave, openNavFailureModal]);

  const salvarCadernosNoStorage = (paginasAtuais: NotebookPage[]) => {
    if (!activeNotebook || authLoading) return;
    syncLocalNotebooksStorage(activeNotebook.id, paginasAtuais, true);
  };

  const atualizarRascunhoCaderno = (
    novoTexto?: string,
    novoTitulo?: string,
    novoFav?: boolean,
    customStyle?: { tipoPapel?: string; corTinta?: string; fonte?: string }
  ) => {
    const cur = latestStateRef.current;
    const textoSalvar = novoTexto !== undefined ? novoTexto : cur.cadernoConteudo;
    const tituloSalvar = novoTitulo !== undefined ? novoTitulo : cur.cadernoTitulo;
    const favSalvar = novoFav !== undefined ? novoFav : cur.cadernoFavoritado;

    const nextPages = [...cur.cadernoPaginas];
    if (nextPages[cur.currentPageIndex]) {
      nextPages[cur.currentPageIndex] = {
        ...nextPages[cur.currentPageIndex],
        titulo: tituloSalvar,
        conteudo: textoSalvar,
        favoritado: favSalvar,
        atualizadoEm: new Date().toISOString(),
        tipoPapel: customStyle?.tipoPapel ?? cur.sheetBgId,
        corTinta: customStyle?.corTinta ?? cur.inkColorId,
        fonte: customStyle?.fonte ?? cur.fontFamilyId,
      };
    }

    latestStateRef.current.cadernoPaginas = nextPages;
    latestStateRef.current.cadernoTitulo = tituloSalvar;
    latestStateRef.current.cadernoConteudo = textoSalvar;
    latestStateRef.current.cadernoFavoritado = favSalvar;

    setCadernoPaginas(nextPages);
    if (cur.activeNotebook) {
      syncLocalNotebooksStorage(cur.activeNotebook.id, nextPages, true);
    }
    editRevisionRef.current += 1;
    setEditRevision((r) => r + 1);
  };

  // Pagination rule: allow advancing up to 3 blank pages beyond the last written/decorated page
  const ultimoIndiceEscrito = (() => {
    let ultimo = -1;
    cadernoPaginas.forEach((pag, idx) => {
      const isCurrent = idx === currentPageIndex;
      const texto = isCurrent ? cadernoConteudo : pag.conteudo || "";
      const titulo = isCurrent ? cadernoTitulo : pag.titulo || "";
      const hasMedia =
        (pag.attachments && pag.attachments.length > 0) ||
        (pag.stickers && pag.stickers.length > 0);
      if (hasMeaningfulJournalText(texto) || hasMeaningfulJournalText(titulo) || hasMedia) {
        if (idx > ultimo) ultimo = idx;
      }
    });
    if (hasMeaningfulJournalText(cadernoConteudo) || hasMeaningfulJournalText(cadernoTitulo)) {
      if (currentPageIndex > ultimo) ultimo = currentPageIndex;
    }
    return ultimo;
  })();

  const maxAllowedIndex = (ultimoIndiceEscrito >= 0 ? ultimoIndiceEscrito : 0) + 3;
  const podeAvancarPagina = currentPageIndex < maxAllowedIndex;

  const resetScrapbookSelectionAndHistory = () => {
    setSelectedScrapbookItem(null);
    setScrapbookUndoStack([]);
    setScrapbookRedoStack([]);
    lastCommittedScrapbookRef.current = null;
  };

  const currentPageObj = cadernoPaginas[currentPageIndex];
  const currentPageAttachments = currentPageObj?.attachments ?? [];
  const currentPageStickers = currentPageObj?.stickers ?? [];

  const getNextScrapbookZIndex = (
    attachmentsList: JournalAttachment[] = currentPageAttachments,
    stickersList: JournalSticker[] = currentPageStickers
  ) => {
    const maxAttachmentZ = attachmentsList.reduce((max, item) => Math.max(max, item.zIndex || 1), 0);
    const maxStickerZ = stickersList.reduce((max, item) => Math.max(max, item.zIndex || 1), 0);
    return Math.max(1, maxAttachmentZ, maxStickerZ) + 1;
  };

  const applyCurrentPageScrapbook = (
    nextAttachments: JournalAttachment[],
    nextStickers: JournalSticker[],
    options?: { commit?: boolean; recordUndo?: boolean }
  ) => {
    const commit = options?.commit !== false;
    const recordUndo = options?.recordUndo !== false;
    const cur = latestStateRef.current;
    const nextPages = [...cur.cadernoPaginas];
    const existing = nextPages[cur.currentPageIndex] || createBlankPage();

    if (commit && recordUndo) {
      const baseline = lastCommittedScrapbookRef.current ?? {
        attachments: existing.attachments ?? [],
        stickers: existing.stickers ?? [],
      };
      setScrapbookUndoStack((prev) => [...prev.slice(-24), baseline]);
      setScrapbookRedoStack([]);
      lastCommittedScrapbookRef.current = null;
    } else if (!commit && !lastCommittedScrapbookRef.current) {
      lastCommittedScrapbookRef.current = {
        attachments: existing.attachments ?? [],
        stickers: existing.stickers ?? [],
      };
    }

    nextPages[cur.currentPageIndex] = {
      ...existing,
      titulo: cur.cadernoTitulo,
      conteudo: cur.cadernoConteudo,
      favoritado: cur.cadernoFavoritado,
      atualizadoEm: new Date().toISOString(),
      tipoPapel: cur.sheetBgId,
      corTinta: cur.inkColorId,
      fonte: cur.fontFamilyId,
      attachments: nextAttachments,
      stickers: nextStickers,
    };

    latestStateRef.current.cadernoPaginas = nextPages;
    setCadernoPaginas(nextPages);

    if (commit) {
      if (cur.activeNotebook) {
        syncLocalNotebooksStorage(cur.activeNotebook.id, nextPages, true);
      }
      editRevisionRef.current += 1;
      setEditRevision((r) => r + 1);
    }
  };

  const handleChangePageAttachments = (nextAttachments: JournalAttachment[], commit = true) => {
    const curPage = latestStateRef.current.cadernoPaginas[latestStateRef.current.currentPageIndex];
    applyCurrentPageScrapbook(nextAttachments, curPage?.stickers ?? [], { commit });
  };

  const handleChangePageStickers = (nextStickers: JournalSticker[], commit = true) => {
    const curPage = latestStateRef.current.cadernoPaginas[latestStateRef.current.currentPageIndex];
    applyCurrentPageScrapbook(curPage?.attachments ?? [], nextStickers, { commit });
  };

  const handleInsertSticker = (def: StickerDefinition) => {
    const curPage = latestStateRef.current.cadernoPaginas[latestStateRef.current.currentPageIndex];
    const existingAttachments = curPage?.attachments ?? [];
    const existingStickers = curPage?.stickers ?? [];
    const id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? `stk_${crypto.randomUUID()}`
        : `stk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const offset = (existingStickers.length % 5) * 18;
    const newSticker: JournalSticker = {
      id,
      stickerId: def.id,
      x: 210 + offset,
      y: 190 + offset,
      scale: 1,
      rotation: (existingStickers.length % 3 - 1) * 4,
      zIndex: getNextScrapbookZIndex(existingAttachments, existingStickers),
    };
    applyCurrentPageScrapbook(existingAttachments, [...existingStickers, newSticker], {
      commit: true,
    });
    setSelectedScrapbookItem({ kind: "sticker", id });
    setStickerDrawerOpen(false);
    playPaperSound();
  };

  const handleInsertAttachment = (attachment: JournalAttachment) => {
    const curPage = latestStateRef.current.cadernoPaginas[latestStateRef.current.currentPageIndex];
    const existingAttachments = curPage?.attachments ?? [];
    const existingStickers = curPage?.stickers ?? [];
    const offset = (existingAttachments.length % 4) * 20;
    const placed: JournalAttachment = {
      ...attachment,
      x: Math.min(340, 120 + offset),
      y: Math.min(520, 140 + offset),
      zIndex: getNextScrapbookZIndex(existingAttachments, existingStickers),
    };
    applyCurrentPageScrapbook([...existingAttachments, placed], existingStickers, {
      commit: true,
    });
    setSelectedScrapbookItem({ kind: "attachment", id: placed.id });
    setPhotoModalOpen(false);
    playPaperSound();
  };

  const handleUndoScrapbook = () => {
    if (scrapbookUndoStack.length === 0) return;
    const previous = scrapbookUndoStack[scrapbookUndoStack.length - 1];
    const curPage = latestStateRef.current.cadernoPaginas[latestStateRef.current.currentPageIndex];
    setScrapbookRedoStack((prev) => [
      ...prev.slice(-24),
      {
        attachments: curPage?.attachments ?? [],
        stickers: curPage?.stickers ?? [],
      },
    ]);
    setScrapbookUndoStack((prev) => prev.slice(0, -1));
    applyCurrentPageScrapbook(previous.attachments, previous.stickers, {
      commit: true,
      recordUndo: false,
    });
    setSelectedScrapbookItem(null);
  };

  const handleRedoScrapbook = () => {
    if (scrapbookRedoStack.length === 0) return;
    const next = scrapbookRedoStack[scrapbookRedoStack.length - 1];
    const curPage = latestStateRef.current.cadernoPaginas[latestStateRef.current.currentPageIndex];
    setScrapbookUndoStack((prev) => [
      ...prev.slice(-24),
      {
        attachments: curPage?.attachments ?? [],
        stickers: curPage?.stickers ?? [],
      },
    ]);
    setScrapbookRedoStack((prev) => prev.slice(0, -1));
    applyCurrentPageScrapbook(next.attachments, next.stickers, {
      commit: true,
      recordUndo: false,
    });
    setSelectedScrapbookItem(null);
  };

  const handleShiftSelectedZIndex = (direction: "forward" | "backward") => {
    if (!selectedScrapbookItem) return;
    const curPage = latestStateRef.current.cadernoPaginas[latestStateRef.current.currentPageIndex];
    const attachmentsList = curPage?.attachments ?? [];
    const stickersList = curPage?.stickers ?? [];
    const allZ = [...attachmentsList.map((a) => a.zIndex), ...stickersList.map((s) => s.zIndex)];
    const maxZ = allZ.length > 0 ? Math.max(...allZ) : 1;
    const minZ = allZ.length > 0 ? Math.min(...allZ) : 1;

    if (selectedScrapbookItem.kind === "attachment") {
      const next = attachmentsList.map((item) =>
        item.id === selectedScrapbookItem.id
          ? { ...item, zIndex: direction === "forward" ? maxZ + 1 : Math.max(1, minZ - 1) }
          : item
      );
      applyCurrentPageScrapbook(next, stickersList, { commit: true });
    } else {
      const next = stickersList.map((item) =>
        item.id === selectedScrapbookItem.id
          ? { ...item, zIndex: direction === "forward" ? maxZ + 1 : Math.max(1, minZ - 1) }
          : item
      );
      applyCurrentPageScrapbook(attachmentsList, next, { commit: true });
    }
  };

  const handleUpdateSelectedAttachment = (
    patch: Partial<
      Pick<JournalAttachment, "style" | "caption" | "width" | "height" | "rotation">
    >
  ) => {
    if (!selectedScrapbookItem || selectedScrapbookItem.kind !== "attachment") return;
    const curPage = latestStateRef.current.cadernoPaginas[latestStateRef.current.currentPageIndex];
    const attachmentsList = curPage?.attachments ?? [];
    const stickersList = curPage?.stickers ?? [];
    const next = attachmentsList.map((item) =>
      item.id === selectedScrapbookItem.id ? { ...item, ...patch } : item
    );
    applyCurrentPageScrapbook(next, stickersList, { commit: true });
  };

  const handleUpdateSelectedSticker = (
    patch: Partial<Pick<JournalSticker, "scale" | "rotation">>
  ) => {
    if (!selectedScrapbookItem || selectedScrapbookItem.kind !== "sticker") return;
    const curPage = latestStateRef.current.cadernoPaginas[latestStateRef.current.currentPageIndex];
    const attachmentsList = curPage?.attachments ?? [];
    const stickersList = curPage?.stickers ?? [];
    const next = stickersList.map((item) =>
      item.id === selectedScrapbookItem.id ? { ...item, ...patch } : item
    );
    applyCurrentPageScrapbook(attachmentsList, next, { commit: true });
  };

  const handleDeleteSelectedScrapbookItem = () => {
    if (!selectedScrapbookItem) return;
    const curPage = latestStateRef.current.cadernoPaginas[latestStateRef.current.currentPageIndex];
    const attachmentsList = curPage?.attachments ?? [];
    const stickersList = curPage?.stickers ?? [];
    if (selectedScrapbookItem.kind === "attachment") {
      applyCurrentPageScrapbook(
        attachmentsList.filter((item) => item.id !== selectedScrapbookItem.id),
        stickersList,
        { commit: true }
      );
    } else {
      applyCurrentPageScrapbook(
        attachmentsList,
        stickersList.filter((item) => item.id !== selectedScrapbookItem.id),
        { commit: true }
      );
    }
    setSelectedScrapbookItem(null);
  };

  const selectedAttachmentObj =
    selectedScrapbookItem?.kind === "attachment"
      ? currentPageAttachments.find((a) => a.id === selectedScrapbookItem.id) ?? null
      : null;
  const selectedStickerObj =
    selectedScrapbookItem?.kind === "sticker"
      ? currentPageStickers.find((s) => s.id === selectedScrapbookItem.id) ?? null
      : null;

  const handleOpenPhotoUpload = () => {
    if (isGuestMode) {
      setGuestPhotoNoticeOpen(true);
      return;
    }
    setStickerDrawerOpen(false);
    setPhotoModalOpen(true);
  };

  const navegarAnterior = () => {
    if (currentPageIndex <= 0) return;
    resetScrapbookSelectionAndHistory();

    const paginasAtuais = [...cadernoPaginas];
    if (paginasAtuais[currentPageIndex]) {
      paginasAtuais[currentPageIndex] = {
        ...paginasAtuais[currentPageIndex],
        titulo: cadernoTitulo,
        conteudo: cadernoConteudo,
        favoritado: cadernoFavoritado,
        atualizadoEm: new Date().toISOString(),
        tipoPapel: sheetBgId,
        corTinta: inkColorId,
        fonte: fontFamilyId,
      };
    }

    const anteriorIndex = currentPageIndex - 1;
    const antPag = paginasAtuais[anteriorIndex];
    latestStateRef.current.cadernoPaginas = paginasAtuais;
    latestStateRef.current.currentPageIndex = anteriorIndex;
    latestStateRef.current.cadernoTitulo = antPag?.titulo || "";
    latestStateRef.current.cadernoConteudo = antPag?.conteudo || "";
    latestStateRef.current.cadernoFavoritado = Boolean(antPag?.favoritado);

    setCadernoPaginas(paginasAtuais);
    setCurrentPageIndex(anteriorIndex);
    setCadernoTitulo(antPag?.titulo || "");
    setCadernoConteudo(antPag?.conteudo || "");
    setCadernoFavoritado(Boolean(antPag?.favoritado));
    applyPageFormatting(antPag);
    playPaperSound();
    salvarCadernosNoStorage(paginasAtuais);
  };

  const navegarProximo = () => {
    if (!podeAvancarPagina) return;
    resetScrapbookSelectionAndHistory();

    const paginasAtuais = [...cadernoPaginas];
    if (paginasAtuais[currentPageIndex]) {
      paginasAtuais[currentPageIndex] = {
        ...paginasAtuais[currentPageIndex],
        titulo: cadernoTitulo,
        conteudo: cadernoConteudo,
        favoritado: cadernoFavoritado,
        atualizadoEm: new Date().toISOString(),
        tipoPapel: sheetBgId,
        corTinta: inkColorId,
        fonte: fontFamilyId,
      };
    }

    const proximoIndex = currentPageIndex + 1;

    if (proximoIndex < paginasAtuais.length) {
      const proxPag = paginasAtuais[proximoIndex];
      latestStateRef.current.cadernoPaginas = paginasAtuais;
      latestStateRef.current.currentPageIndex = proximoIndex;
      latestStateRef.current.cadernoTitulo = proxPag?.titulo || "";
      latestStateRef.current.cadernoConteudo = proxPag?.conteudo || "";
      latestStateRef.current.cadernoFavoritado = Boolean(proxPag?.favoritado);

      setCadernoPaginas(paginasAtuais);
      setCurrentPageIndex(proximoIndex);
      setCadernoTitulo(proxPag?.titulo || "");
      setCadernoConteudo(proxPag?.conteudo || "");
      setCadernoFavoritado(Boolean(proxPag?.favoritado));
      applyPageFormatting(proxPag);
      playPaperSound();
      salvarCadernosNoStorage(paginasAtuais);
    } else {
      const novaPagina = createBlankPage();
      const novasPaginas = [...paginasAtuais, novaPagina];
      latestStateRef.current.cadernoPaginas = novasPaginas;
      latestStateRef.current.currentPageIndex = proximoIndex;
      latestStateRef.current.cadernoTitulo = "";
      latestStateRef.current.cadernoConteudo = "";
      latestStateRef.current.cadernoFavoritado = false;

      setCadernoPaginas(novasPaginas);
      setCurrentPageIndex(proximoIndex);
      setCadernoTitulo("");
      setCadernoConteudo("");
      setCadernoFavoritado(false);
      playPaperSound();
      salvarCadernosNoStorage(novasPaginas);
    }
  };

  const avancarParaProximaPaginaComTexto = (
    textoExcedente: string,
    textoAtualPreenchido?: string
  ) => {
    playPaperSound();

    const cur = latestStateRef.current;
    if (!cur.activeNotebook) {
      setCadernoPromptNotice(
        "Please create a journal first to save and advance to the next page."
      );
      setPendingSaveAfterCreation(true);
      setNotebookDrawerOpen(true);
      return;
    }

    const textoAtual =
      textoAtualPreenchido !== undefined ? textoAtualPreenchido : cur.cadernoConteudo;
    const tituloAtual = cur.cadernoTitulo;

    const paginasAtualizadas = [...cur.cadernoPaginas];
    if (paginasAtualizadas[cur.currentPageIndex]) {
      paginasAtualizadas[cur.currentPageIndex] = {
        ...paginasAtualizadas[cur.currentPageIndex],
        titulo: tituloAtual,
        conteudo: textoAtual,
        favoritado: cur.cadernoFavoritado,
        atualizadoEm: new Date().toISOString(),
        tipoPapel: cur.sheetBgId,
        corTinta: cur.inkColorId,
        fonte: cur.fontFamilyId,
      };
    }

    const chunks = hasMeaningfulJournalText(textoExcedente)
      ? splitJournalPagesRecursive(textoExcedente)
      : [textoExcedente];

    let targetIndex = cur.currentPageIndex + 1;
    let finalNextTitle = "";
    let finalNextContent = chunks[0] ?? "";
    let finalNextFav = false;
    let pageForFormatting: NotebookPage | undefined;

    if (targetIndex < paginasAtualizadas.length && chunks.length === 1) {
      const proximaPag = paginasAtualizadas[targetIndex];
      const combined = chunks[0]
        ? proximaPag.conteudo
          ? chunks[0] + "\n" + proximaPag.conteudo
          : chunks[0]
        : proximaPag.conteudo;

      const splitCombined = splitJournalPagesRecursive(combined);
      paginasAtualizadas[targetIndex] = {
        ...proximaPag,
        conteudo: splitCombined[0],
        atualizadoEm: new Date().toISOString(),
      };
      for (let i = 1; i < splitCombined.length; i++) {
        paginasAtualizadas.splice(targetIndex + i, 0, {
          ...createBlankPage(),
          conteudo: splitCombined[i],
        });
      }
      finalNextTitle = proximaPag.titulo || "";
      finalNextContent = splitCombined[0];
      finalNextFav = Boolean(proximaPag.favoritado);
      pageForFormatting = proximaPag;
    } else {
      for (let i = 0; i < chunks.length; i++) {
        const insertAt = targetIndex + i;
        if (insertAt < paginasAtualizadas.length && !isJournalPageMeaningful(paginasAtualizadas[insertAt])) {
          paginasAtualizadas[insertAt] = {
            ...paginasAtualizadas[insertAt],
            conteudo: chunks[i],
            atualizadoEm: new Date().toISOString(),
          };
        } else {
          paginasAtualizadas.splice(insertAt, 0, {
            ...createBlankPage(),
            conteudo: chunks[i],
          });
        }
      }
      targetIndex = targetIndex + chunks.length - 1;
      finalNextTitle = paginasAtualizadas[targetIndex]?.titulo || "";
      finalNextContent = paginasAtualizadas[targetIndex]?.conteudo || "";
      finalNextFav = Boolean(paginasAtualizadas[targetIndex]?.favoritado);
      pageForFormatting = paginasAtualizadas[targetIndex];
    }

    latestStateRef.current.cadernoPaginas = paginasAtualizadas;
    latestStateRef.current.currentPageIndex = targetIndex;
    latestStateRef.current.cadernoTitulo = finalNextTitle;
    latestStateRef.current.cadernoConteudo = finalNextContent;
    latestStateRef.current.cadernoFavoritado = finalNextFav;

    setCadernoPaginas(paginasAtualizadas);
    setCurrentPageIndex(targetIndex);
    setCadernoTitulo(finalNextTitle);
    setCadernoConteudo(finalNextContent);
    setCadernoFavoritado(finalNextFav);
    if (pageForFormatting) {
      applyPageFormatting(pageForFormatting);
    }

    salvarCadernosNoStorage(paginasAtualizadas);
    editRevisionRef.current += 1;
    setEditRevision((r) => r + 1);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const cursorEnd = finalNextContent.length;
        textareaRef.current.setSelectionRange(cursorEnd, cursorEnd);
      }
    }, 50);
  };

  const isSheetFull = (
    text: string,
    textareaEl?: HTMLTextAreaElement | null
  ): boolean => {
    if (!hasMeaningfulJournalText(text)) return false;
    if (countNonNewlineChars(text) >= MAX_CHARS_PER_PAGE) return true;

    const normalizedContent = normalizeJournalContentForStorage(text);
    const meaningfulLines = normalizedContent.split("\n");
    if (
      meaningfulLines.length >= MAX_LINES_PER_PAGE &&
      hasMeaningfulJournalText(meaningfulLines[MAX_LINES_PER_PAGE - 1])
    ) {
      return true;
    }

    if (textareaEl && textareaEl.scrollHeight > textareaEl.clientHeight + 2) {
      const rawLines = normalizeJournalLineEndings(text).split("\n");
      const lastRawLine = rawLines[rawLines.length - 1] ?? "";
      if (hasMeaningfulJournalText(lastRawLine) || rawLines.length <= MAX_LINES_PER_PAGE) {
        return true;
      }
    }
    return false;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // TAB indentation inside the active journal editor (4 spaces, preserves selections)
    if (e.key === "Tab" && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const INDENT = "    ";
      const start = textarea.selectionStart ?? cadernoConteudo.length;
      const end = textarea.selectionEnd ?? cadernoConteudo.length;
      const normalized = normalizeJournalLineEndings(cadernoConteudo);

      let nextText: string;
      let nextSelectionStart: number;
      let nextSelectionEnd: number;

      if (start === end) {
        nextText = normalized.slice(0, start) + INDENT + normalized.slice(end);
        nextSelectionStart = start + INDENT.length;
        nextSelectionEnd = nextSelectionStart;
      } else {
        const lineStart = normalized.lastIndexOf("\n", start - 1) + 1;
        const selectedBlock = normalized.slice(lineStart, end);
        const linesInBlock = selectedBlock.split("\n");
        const indentedBlock = linesInBlock.map((line) => INDENT + line).join("\n");
        nextText = normalized.slice(0, lineStart) + indentedBlock + normalized.slice(end);
        nextSelectionStart = start + INDENT.length;
        nextSelectionEnd = end + INDENT.length * linesInBlock.length;
      }

      const overflow = splitJournalPageOverflow(nextText);
      if (overflow.exceeded) {
        return;
      }

      setCadernoConteudo(nextText);
      atualizarRascunhoCaderno(nextText);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(nextSelectionStart, nextSelectionEnd);
        }
      });
      return;
    }

    const isDeleteKey = e.key === "Backspace" || e.key === "Delete";
    const isNavKey = [
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Home",
      "End",
      "PageUp",
      "PageDown",
      "Tab",
    ].includes(e.key);
    const isShortcut = e.ctrlKey || e.metaKey || e.altKey;

    if (isDeleteKey || isNavKey || isShortcut) {
      return;
    }

    // Never trigger overflow on modifier/control/function keys (Shift, CapsLock, Escape, etc.)
    if (e.key !== "Enter" && e.key.length !== 1) {
      return;
    }

    const textarea = textareaRef.current;
    if (!textarea || textarea.selectionStart !== textarea.selectionEnd) {
      return;
    }

    const pos = textarea.selectionStart ?? cadernoConteudo.length;
    const normalized = normalizeJournalLineEndings(cadernoConteudo);
    const beforeCursor = normalized.slice(0, pos);
    const afterCursor = normalized.slice(pos);
    const currentLineStart = beforeCursor.lastIndexOf("\n") + 1;
    const nextNewlineOffset = afterCursor.indexOf("\n");
    const currentLineEnd =
      nextNewlineOffset === -1 ? normalized.length : pos + nextNewlineOffset;
    const currentLineText = normalized.slice(currentLineStart, currentLineEnd);
    const isCursorOnEmptyLine = !hasMeaningfulJournalText(currentLineText);
    const hasContentAfterCursor = hasMeaningfulJournalText(afterCursor);
    const lines = normalized.split("\n");

    if (e.key === "Enter") {
      // An empty / whitespace-only page must never overflow into a new page on Enter.
      if (!hasMeaningfulJournalText(normalized)) {
        if (lines.length >= MAX_LINES_PER_PAGE) {
          e.preventDefault();
        }
        return;
      }

      if (
        lines.length >= MAX_LINES_PER_PAGE ||
        textarea.scrollHeight > textarea.clientHeight + 2
      ) {
        // Stay on the current page when pressing Enter on a trailing empty line.
        if (isCursorOnEmptyLine && !hasContentAfterCursor) {
          e.preventDefault();
          return;
        }

        // If inserting a blank line mid-page when trailing empty lines exist at the bottom,
        // absorb one trailing empty line so the user stays on this sheet without creating a ghost page.
        const lastLine = lines[lines.length - 1] ?? "";
        if (!hasMeaningfulJournalText(lastLine) && lines.length >= MAX_LINES_PER_PAGE) {
          const lastNewlineIdx = normalized.lastIndexOf("\n");
          if (lastNewlineIdx >= pos) {
            e.preventDefault();
            const nextText =
              normalized.slice(0, pos) +
              "\n" +
              normalized.slice(pos, lastNewlineIdx) +
              normalized.slice(lastNewlineIdx + 1);
            setCadernoConteudo(nextText);
            atualizarRascunhoCaderno(nextText);
            requestAnimationFrame(() => {
              if (textareaRef.current) {
                textareaRef.current.selectionStart = pos + 1;
                textareaRef.current.selectionEnd = pos + 1;
              }
            });
            return;
          }
        }

        // Actual content reaches/exceeds the 23-line writing area -> advance cleanly to next page.
        if (
          textarea.scrollHeight > textarea.clientHeight + 2 ||
          (lines.length >= MAX_LINES_PER_PAGE && !hasContentAfterCursor)
        ) {
          e.preventDefault();
          avancarParaProximaPaginaComTexto("", normalized);
          return;
        }
      }
      return;
    }

    // Printable character: an empty line is ALWAYS reusable for typing.
    if (isCursorOnEmptyLine) {
      return;
    }

    const atBottomWithOverflow =
      (textarea.scrollHeight > textarea.clientHeight + 2 ||
        countNonNewlineChars(normalized) >= MAX_CHARS_PER_PAGE) &&
      !hasContentAfterCursor;

    if (atBottomWithOverflow) {
      e.preventDefault();
      avancarParaProximaPaginaComTexto(e.key, normalized);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData("text");
    if (!pastedText) return;

    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? cadernoConteudo.length;
    const end = textarea?.selectionEnd ?? cadernoConteudo.length;
    const textoProjetado =
      cadernoConteudo.slice(0, start) + pastedText + cadernoConteudo.slice(end);

    const overflow = splitJournalPageOverflow(textoProjetado);
    if (overflow.exceeded) {
      e.preventDefault();
      setCadernoConteudo(overflow.currentPageText);
      atualizarRascunhoCaderno(overflow.currentPageText);
      avancarParaProximaPaginaComTexto(
        overflow.overflowText,
        overflow.currentPageText
      );
    } else if (overflow.currentPageText !== normalizeJournalLineEndings(textoProjetado)) {
      e.preventDefault();
      setCadernoConteudo(overflow.currentPageText);
      atualizarRascunhoCaderno(overflow.currentPageText);
    }
  };

  const handleCadernoTituloChange = (novoTitulo: string) => {
    setCadernoTitulo(novoTitulo);
    atualizarRascunhoCaderno(undefined, novoTitulo);
  };

  const handleCadernoConteudoChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const novoTexto = e.target.value;
    const overflow = splitJournalPageOverflow(novoTexto);

    if (overflow.exceeded) {
      setCadernoConteudo(overflow.currentPageText);
      atualizarRascunhoCaderno(overflow.currentPageText);
      avancarParaProximaPaginaComTexto(
        overflow.overflowText,
        overflow.currentPageText
      );
      return;
    }

    setCadernoConteudo(overflow.currentPageText);
    atualizarRascunhoCaderno(overflow.currentPageText);
  };

  const handleKeyUp = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const texto = normalizeJournalLineEndings(textarea.value);
    if (!hasMeaningfulJournalText(texto)) {
      const lines = texto.split("\n");
      if (lines.length > MAX_LINES_PER_PAGE) {
        const clamped = lines.slice(0, MAX_LINES_PER_PAGE).join("\n");
        setCadernoConteudo(clamped);
        atualizarRascunhoCaderno(clamped);
      }
      return;
    }

    if (textarea.scrollHeight > textarea.clientHeight + 2) {
      const cursorPos = textarea.selectionStart ?? texto.length;
      const lines = texto.split("\n");
      const lastLine = lines[lines.length - 1] ?? "";

      // Absorb trailing empty lines at the bottom before overflowing real text.
      if (!hasMeaningfulJournalText(lastLine)) {
        const lastNewlineIdx = texto.lastIndexOf("\n");
        if (lastNewlineIdx !== -1 && cursorPos <= lastNewlineIdx) {
          const reduced = texto.slice(0, lastNewlineIdx);
          setCadernoConteudo(reduced);
          atualizarRascunhoCaderno(reduced);
          requestAnimationFrame(() => {
            if (textareaRef.current) {
              const safePos = Math.min(cursorPos, reduced.length);
              textareaRef.current.setSelectionRange(safePos, safePos);
            }
          });
          return;
        }
      }

      const lastBreak = Math.max(texto.lastIndexOf(" "), texto.lastIndexOf("\n"));
      if (lastBreak > 0) {
        const textoQueCabe = texto.slice(0, lastBreak);
        const excedente = texto.slice(lastBreak + 1);
        if (hasMeaningfulJournalText(excedente)) {
          setCadernoConteudo(textoQueCabe);
          atualizarRascunhoCaderno(textoQueCabe);
          avancarParaProximaPaginaComTexto(excedente, textoQueCabe);
        }
      }
    }
  };

  const toggleFavoritoCaderno = () => {
    playPaperSound();
    const novoStatus = !cadernoFavoritado;
    setCadernoFavoritado(novoStatus);
    atualizarRascunhoCaderno(undefined, undefined, novoStatus);
  };

  const salvarPagina = async () => {
    if (isGuestMode) {
      playPaperSound();
      openGuestPrompt("save");
      return;
    }

    if (
      !hasMeaningfulJournalText(cadernoConteudo) &&
      !hasMeaningfulJournalText(cadernoTitulo)
    ) {
      alert("Please write something on the page before saving.");
      return;
    }

    if (!activeNotebook) {
      setCadernoPromptNotice("You must create a journal before saving this page.");
      setPendingSaveAfterCreation(true);
      setNotebookDrawerOpen(true);
      playPaperSound();
      return;
    }

    setSalvando(true);
    playPaperSound();

    const tituloFinal =
      cadernoTitulo.trim() || `Memory of ${dataFormatada || "Today"}`;
    const conteudoNormalizado = normalizeJournalContentForStorage(cadernoConteudo);
    setCadernoTitulo(tituloFinal);

    const paginasAtualizadas = [...cadernoPaginas];
    if (paginasAtualizadas[currentPageIndex]) {
      paginasAtualizadas[currentPageIndex] = {
        ...paginasAtualizadas[currentPageIndex],
        titulo: tituloFinal,
        conteudo: conteudoNormalizado,
        favoritado: cadernoFavoritado,
        atualizadoEm: new Date().toISOString(),
        tipoPapel: sheetBgId,
        corTinta: inkColorId,
        fonte: fontFamilyId,
      };
    }

    latestStateRef.current.cadernoTitulo = tituloFinal;
    latestStateRef.current.cadernoPaginas = paginasAtualizadas;
    setCadernoPaginas(paginasAtualizadas);

    const savedOk = await flushBackendSave(paginasAtualizadas);

    setSalvando(false);
    if (savedOk) {
      setMensagemSucesso(
        `Page saved in journal "${activeNotebook.nome}".`
      );
      setTimeout(() => setMensagemSucesso(""), 3000);
    }
  };

  const applyNotebookSelection = (nb: Notebook) => {
    setActiveNotebookId(nb.id);
    try {
      window.localStorage.setItem(ACTIVE_NOTEBOOK_ID_KEY, nb.id);
    } catch {}

    const written = filterWrittenPages(nb.paginas);
    confirmedSnapshotsRef.current[nb.id] = buildSnapshotFromWrittenPages(written);
    const paginas = written.length > 0 ? written : [createBlankPage()];

    latestStateRef.current.cadernoPaginas = paginas;
    latestStateRef.current.currentPageIndex = 0;
    latestStateRef.current.cadernoTitulo = paginas[0]?.titulo || "";
    latestStateRef.current.cadernoConteudo = paginas[0]?.conteudo || "";
    latestStateRef.current.cadernoFavoritado = Boolean(paginas[0]?.favoritado);

    setCadernoPaginas(paginas);
    setCurrentPageIndex(0);
    setCadernoTitulo(paginas[0]?.titulo || "");
    setCadernoConteudo(paginas[0]?.conteudo || "");
    setCadernoFavoritado(Boolean(paginas[0]?.favoritado));
    applyPageFormatting(paginas[0]);
    setAutosaveStatus("idle");
    setSaveErrorMessage(null);

    setNotebookDrawerOpen(false);
    setNewNotebookNameError(null);
    playPaperSound();
  };

  const selecionarCaderno = async (nb: Notebook) => {
    if (isGuestMode) {
      playPaperSound();
      openGuestPrompt("notebook-open");
      return;
    }

    if (activeNotebook && activeNotebook.id !== nb.id && hasPendingSaveWork()) {
      const ok = await flushBackendSave();
      if (!ok) {
        setNotebookDrawerOpen(false);
        openNavFailureModal(() => applyNotebookSelection(nb), "switching journals");
        return;
      }
    }

    applyNotebookSelection(nb);
  };

  const criarNovoCaderno = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creatingNotebook) return;

    if (isGuestMode) {
      playPaperSound();
      openGuestPrompt("notebook-manage");
      return;
    }

    const trimmedName = newNotebookTitle.trim();
    if (!trimmedName) {
      setNewNotebookNameError("Notebook name is required.");
      newNotebookInputRef.current?.focus();
      return;
    }
    setNewNotebookNameError(null);

    const limiteCadernos = isPro ? 10 : 3;
    if (notebooks.length >= limiteCadernos) {
      setCadernoPromptNotice(
        isPro
          ? `You have reached the Premium Plan limit of ${limiteCadernos} journals (${notebooks.length}/${limiteCadernos}).`
          : `You have reached the Free Plan limit of ${limiteCadernos} journals (${notebooks.length}/${limiteCadernos}). Upgrade to the Pro Sender Club to create up to 10 journals.`
      );
      return;
    }

    const proceedCreateNotebook = async () => {
      setCreatingNotebook(true);
      try {
        const cur = latestStateRef.current;
        const nowIso = new Date().toISOString();

        // If user had written text before creating their very first journal, preserve that page into the new journal
        const hasPendingWrittenText =
          !cur.activeNotebook &&
          (hasMeaningfulJournalText(cur.cadernoConteudo) ||
            hasMeaningfulJournalText(cur.cadernoTitulo));

        const initialPagesForNewNotebook: NotebookPage[] = hasPendingWrittenText
          ? [
              {
                id: "pag-" + Date.now(),
                titulo:
                  cur.cadernoTitulo.trim() || `Memory of ${dataFormatada || "Today"}`,
                conteudo: normalizeJournalContentForStorage(cur.cadernoConteudo),
                dataFormatada: dataFormatada || "Today",
                favoritado: cur.cadernoFavoritado,
                criadoEm: nowIso,
                atualizadoEm: nowIso,
                tipoPapel: cur.sheetBgId,
                corTinta: cur.inkColorId,
                fonte: cur.fontFamilyId,
              },
            ]
          : [];

        const novoCaderno: Notebook = {
          id: "caderno-" + Date.now(),
          nome: trimmedName,
          corCapa: newNotebookCover,
          paginas: initialPagesForNewNotebook,
          criadoEm: nowIso,
          atualizadoEm: nowIso,
          ownerId: user?.id,
        };

        await api.journal.upsertNotebook(novoCaderno.id, {
          nome: novoCaderno.nome,
          corCapa: novoCaderno.corCapa,
          paginas: initialPagesForNewNotebook,
        });

        const allStored = loadAllRawNotebooks();
        const listaFinal = [...allStored, novoCaderno];
        saveAllNotebooks(listaFinal, "editor");
        setNotebooks(
          listaFinal.filter(
            (nb) => Boolean(user?.id && nb.ownerId && String(nb.ownerId) === String(user.id))
          )
        );

        confirmedSnapshotsRef.current[novoCaderno.id] =
          buildSnapshotFromWrittenPages(initialPagesForNewNotebook);

        try {
          window.localStorage.setItem(ACTIVE_NOTEBOOK_ID_KEY, novoCaderno.id);
        } catch {}

        setActiveNotebookId(novoCaderno.id);
        setCurrentPageIndex(0);

        if (hasPendingWrittenText && initialPagesForNewNotebook[0]) {
          latestStateRef.current.cadernoPaginas = initialPagesForNewNotebook;
          latestStateRef.current.cadernoTitulo = initialPagesForNewNotebook[0].titulo;
          latestStateRef.current.cadernoConteudo = initialPagesForNewNotebook[0].conteudo;
          latestStateRef.current.cadernoFavoritado = initialPagesForNewNotebook[0].favoritado;

          setCadernoPaginas(initialPagesForNewNotebook);
          setCadernoTitulo(initialPagesForNewNotebook[0].titulo);
          setCadernoConteudo(initialPagesForNewNotebook[0].conteudo);
          setCadernoFavoritado(initialPagesForNewNotebook[0].favoritado);
        } else {
          const blank = createBlankPage();
          latestStateRef.current.cadernoPaginas = [blank];
          latestStateRef.current.cadernoTitulo = "";
          latestStateRef.current.cadernoConteudo = "";
          latestStateRef.current.cadernoFavoritado = false;

          setCadernoPaginas([blank]);
          setCadernoTitulo("");
          setCadernoConteudo("");
          setCadernoFavoritado(false);
        }

        setAutosaveStatus(hasPendingWrittenText ? "saved" : "idle");
        setSaveErrorMessage(null);
        setNewNotebookTitle("");
        setNewNotebookNameError(null);
        setNewNotebookCover("marrom");
        setNotebookDrawerOpen(false);
        setCadernoPromptNotice(null);
        setPendingSaveAfterCreation(false);
        playPaperSound();

        setMensagemSucesso(
          hasPendingWrittenText
            ? `Journal "${novoCaderno.nome}" created and your page was saved!`
            : `Journal "${novoCaderno.nome}" created and ready for your story.`
        );
        setTimeout(() => setMensagemSucesso(""), 3200);
      } catch (err: any) {
        setCadernoPromptNotice(
          err?.message || "Unable to create journal on the server. Please try again."
        );
      } finally {
        setCreatingNotebook(false);
      }
    };

    // Save any pending changes in the currently active notebook BEFORE creating & switching to a new one
    if (activeNotebook && hasPendingSaveWork()) {
      setCreatingNotebook(true);
      const savedCurrentOk = await flushBackendSave();
      setCreatingNotebook(false);
      if (!savedCurrentOk) {
        setNotebookDrawerOpen(false);
        openNavFailureModal(
          () => {
            void proceedCreateNotebook();
          },
          "creating a new journal"
        );
        return;
      }
    }

    await proceedCreateNotebook();
  };

  const confirmarRenomearCaderno = (notebookId: string) => {
    if (isGuestMode) {
      playPaperSound();
      setRenamingNotebookId(null);
      openGuestPrompt("notebook-manage");
      return;
    }
    if (!renameDraftValue.trim()) return;
    renameUserNotebook(notebookId, renameDraftValue);
    setNotebooks(loadUserNotebooks(user?.id));
    setRenamingNotebookId(null);
    setRenameDraftValue("");
    playPaperSound();
    setMensagemSucesso("Journal title updated.");
    setTimeout(() => setMensagemSucesso(""), 2500);
  };

  const sortearInspiracao = () => {
    const carta = letters[Math.floor(Math.random() * letters.length)];
    const prompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
    setCartaInspiracao(carta);
    setPromptTexto(prompt);
    setInspiracaoModal(true);
    playPaperSound();
  };

  const aplicarInspiracao = () => {
    if (promptTexto) {
      setTemaSalvo(promptTexto);
      if (isGuestMode) {
        setGuestPinnedTheme(promptTexto);
      } else {
        try {
          window.localStorage.setItem(PINNED_THEME_STORAGE_KEY, promptTexto);
        } catch {}
      }
    }
    setInspiracaoModal(false);
    playPaperSound();
  };

  const renderCustomizationMenu = (isInFocus = false) => (
    <div
      className={`vintage-menu-wrapper ${isInFocus ? "is-focus-mode" : ""}`}
      ref={menuRef}
    >
      <button
        type="button"
        className={`vintage-menu-btn ${isInFocus ? "is-focus-mode" : ""}`}
        onClick={() => setCustomMenuOpen(!customMenuOpen)}
        aria-expanded={customMenuOpen}
        title="Customize paper, ink, and calligraphy"
      >
        <span>Paper & Ink</span>
        <span className="menu-caret">▾</span>
      </button>

      <AnimatePresence>
        {customMenuOpen && (
          <motion.div
            className={`floating-customization-menu ${
              isInFocus ? "is-focus-mode" : ""
            }`}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.16 }}
          >
            {/* 1. Paper Background */}
            <div className="menu-group">
              <span className="menu-group-title">Sheet Paper</span>
              <div className="paper-swatches">
                {PAPER_OPTIONS.map((paper) => (
                  <button
                    key={paper.id}
                    type="button"
                    className={`paper-swatch ${
                      sheetBgId === paper.id ? "active" : ""
                    }`}
                    style={{ backgroundColor: paper.color }}
                    onClick={() => {
                      setSheetBgId(paper.id);
                      setSheetBgColor(paper.color);
                      atualizarRascunhoCaderno(undefined, undefined, undefined, {
                        tipoPapel: paper.id,
                      });
                    }}
                    title={paper.name}
                  >
                    {sheetBgId === paper.id ? "✓" : ""}
                  </button>
                ))}
              </div>
              <small className="swatch-name">
                {PAPER_OPTIONS.find((p) => p.id === sheetBgId)?.name}
              </small>
            </div>

            {/* 2. Ink Color */}
            <div className="menu-group">
              <span className="menu-group-title">Ink Color</span>
              <div className="ink-swatches">
                {INK_OPTIONS.map((ink) => (
                  <button
                    key={ink.id}
                    type="button"
                    className={`ink-swatch ${
                      inkColorId === ink.id ? "active" : ""
                    }`}
                    style={{ backgroundColor: ink.color }}
                    onClick={() => {
                      setInkColorId(ink.id);
                      setInkColor(ink.color);
                      atualizarRascunhoCaderno(undefined, undefined, undefined, {
                        corTinta: ink.id,
                      });
                    }}
                    title={ink.name}
                  >
                    {inkColorId === ink.id ? "✓" : ""}
                  </button>
                ))}
              </div>
              <small className="swatch-name">
                {INK_OPTIONS.find((i) => i.id === inkColorId)?.name}
              </small>
            </div>

            {/* 3. Typography & Calligraphy */}
            <div className="menu-group">
              <span className="menu-group-title">Script & Typography</span>
              <div className="font-options-list">
                {FONT_OPTIONS.map((font) => (
                  <button
                    key={font.id}
                    type="button"
                    className={`font-choice-btn ${
                      fontFamilyId === font.id ? "active" : ""
                    }`}
                    style={{ fontFamily: font.styleFamily }}
                    onClick={() => {
                      setFontFamilyId(font.id);
                      atualizarRascunhoCaderno(undefined, undefined, undefined, {
                        fonte: font.id,
                      });
                    }}
                  >
                    <span>{font.name}</span>
                    {fontFamilyId === font.id && (
                      <span className="font-check">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <section
      className={`writing-desk-wrap ${modoFoco ? "is-focus-mode" : ""}`}
      id="mesa-de-escrita"
      aria-label="Personal Journal Writing Desk"
    >
      {/* Meaningful Journal Empty State Banner when no journals exist yet */}
      {notebooks.length === 0 && !modoFoco && (
        <motion.div
          className="architecture-empty-banner"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="architecture-empty-banner__art" aria-hidden="true">
            <div className="mini-leather-emblem">
              <span className="mini-leather-emblem__ribbon" />
              <span className="mini-leather-emblem__glyph">✎</span>
            </div>
          </div>
          <div className="architecture-empty-banner__copy">
            <span className="section-kicker">PERSONAL JOURNAL SANCTUARY</span>
            <h2>Your story begins here.</h2>
            <p>Create a journal and give your thoughts a place to live.</p>
          </div>
          <div className="architecture-empty-banner__actions">
            <button
              type="button"
              className="sober-save-btn"
              onClick={() => {
                setCadernoPromptNotice(null);
                setNotebookDrawerOpen(true);
                playPaperSound();
              }}
            >
              Create a Journal
            </button>
          </div>
        </motion.div>
      )}

      {/* Top Bar for Focus Mode */}
      {modoFoco && (
        <div className="focus-mode-topbar">
          <button
            type="button"
            className="focus-mode-eye-btn is-active"
            onClick={() => {
              setModoFoco(false);
              playPaperSound();
            }}
            title="Exit Focus Mode (Esc)"
            aria-label="Exit Focus Mode"
          >
            <EyeIcon className="focus-mode-eye-icon" filled={true} />
            <span>Exit Focus</span>
          </button>

          <div className="focus-mode-menu-container">
            {renderCustomizationMenu(true)}
          </div>
        </div>
      )}

      <div className="writing-desk-container">
        {/* Left Column: Creative Tools & Element Studio */}
        <div className="desk-left-col">
          {/* Creative Tools Section (directly above Element Studio) */}
          <section
            className="scrapbook-creative-panel"
            role="toolbar"
            aria-label="Scrapbook creative tools"
          >
            <div className="scrapbook-creative-header">
              <span className="scrapbook-inspector-eyebrow">CREATIVE TOOLS</span>
              <span className="scrapbook-creative-count">
                {currentPageAttachments.length} photo
                {currentPageAttachments.length === 1 ? "" : "s"} · {currentPageStickers.length}{" "}
                sticker{currentPageStickers.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="scrapbook-creative-primary-grid">
              <button
                type="button"
                className={`scrapbook-creative-btn is-primary ${isGuestMode ? "is-guest-locked" : ""}`}
                onClick={handleOpenPhotoUpload}
                title={
                  isGuestMode
                    ? "Sign in to upload personal photos to your journal"
                    : "Upload a photograph to this page"
                }
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span>Add Photo</span>
                {isGuestMode && <span className="scrapbook-creative-badge">Account</span>}
              </button>

              <button
                type="button"
                className="scrapbook-creative-btn"
                onClick={() => {
                  setPhotoModalOpen(false);
                  setStickerDrawerOpen(true);
                  playPaperSound();
                }}
                title="Open vintage sticker & pressed botanical catalog"
              >
                <span aria-hidden="true">✦</span>
                <span>Stickers</span>
              </button>
            </div>

            <div className="scrapbook-creative-history-row">
              <button
                type="button"
                className="scrapbook-creative-history-btn"
                onClick={handleUndoScrapbook}
                disabled={scrapbookUndoStack.length === 0}
                title="Undo last scrapbook change"
              >
                ↶ Undo
              </button>
              <button
                type="button"
                className="scrapbook-creative-history-btn"
                onClick={handleRedoScrapbook}
                disabled={scrapbookRedoStack.length === 0}
                title="Redo scrapbook change"
              >
                ↷ Redo
              </button>
            </div>

            {isGuestMode && (
              <div className="scrapbook-creative-guest-note">
                Guest preview (not saved)
              </div>
            )}
          </section>

          <ScrapbookInspectorPanel
            selectedAttachment={selectedAttachmentObj}
            selectedSticker={selectedStickerObj}
            onUpdateAttachment={handleUpdateSelectedAttachment}
            onUpdateSticker={handleUpdateSelectedSticker}
            onShiftZIndex={handleShiftSelectedZIndex}
            onDelete={handleDeleteSelectedScrapbookItem}
          />
        </div>

        {/* Center Column: Dedicated Ruled Notebook Sheet */}
        <div className="desk-center-col">
          <div className="notebook-tabs-container">
            <div className="notebook-tab notebook-tab--caderno active" aria-current="page">
              {activeNotebook ? `Journal · ${activeNotebook.nome}` : "Personal Journal"}
            </div>
            <button
              type="button"
              className="notebook-tab"
              style={{
                background: "rgba(43, 34, 26, 0.78)",
                color: "var(--color-pollen, #cfa96f)",
                fontSize: "11px",
              }}
              onClick={() => {
                setCadernoPromptNotice(null);
                setNotebookDrawerOpen(true);
                playPaperSound();
              }}
              title="Switch or create a journal volume"
            >
              Switch Volume ▾
            </button>
          </div>

          <div className="sheet-stage-wrapper">
            <button
              type="button"
              className="sheet-nav-arrow sheet-nav-arrow--left"
              onClick={navegarAnterior}
              disabled={currentPageIndex === 0}
              title="Previous page (←)"
              aria-label="Previous page"
            >
              <svg
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <div
              className="caderno-sheet-viewport-box"
              style={
                sheetScale < 1
                  ? {
                      width: `${Math.round(JOURNAL_PAGE_WIDTH * sheetScale)}px`,
                      height: `${Math.round(JOURNAL_PAGE_HEIGHT * sheetScale)}px`,
                      position: "relative",
                      flexShrink: 0,
                    }
                  : { width: "100%", maxWidth: `${JOURNAL_PAGE_WIDTH}px` }
              }
            >
              <div
                style={
                  sheetScale < 1
                    ? {
                        width: `${JOURNAL_PAGE_WIDTH}px`,
                        height: `${JOURNAL_PAGE_HEIGHT}px`,
                        transform: `scale(${sheetScale})`,
                        transformOrigin: "top left",
                      }
                    : undefined
                }
              >
                <motion.div
                  key={`${activeNotebookId}-${currentPageIndex}`}
                  className="writing-sheet-card mode-caderno"
                  style={{
                    backgroundColor: sheetBgColor,
                    color: inkColor,
                    fontFamily: getFontFamilyById(fontFamilyId),
                  }}
                  onPointerDown={() => {
                    if (selectedScrapbookItem) {
                      setSelectedScrapbookItem(null);
                    }
                  }}
                  initial={{ opacity: 0.9, scale: 0.99 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.22 }}
                >
                  <div className="caderno-content-inner">
                    <div className="caderno-date-line">
                      <span>
                        {cadernoPaginas[currentPageIndex]?.dataFormatada ||
                          dataFormatada ||
                          "Today"}
                      </span>
                      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        {isSheetFull(cadernoConteudo, textareaRef.current) && (
                          <span
                            style={{
                              fontSize: "10px",
                              color: "var(--color-red-sands, #ad5b30)",
                              fontWeight: 700,
                              letterSpacing: "0.08em",
                            }}
                          >
                            SHEET FULL
                          </span>
                        )}
                        <small className="caderno-page-counter">
                          page {currentPageIndex + 1} of {Math.max(cadernoPaginas.length, 1)}
                        </small>
                      </div>
                    </div>

                    <input
                      type="text"
                      className="caderno-title-input"
                      value={cadernoTitulo}
                      onChange={(e) => handleCadernoTituloChange(e.target.value)}
                      placeholder="Entry title (optional)..."
                      aria-label="Journal entry title"
                    />

                    <textarea
                      ref={textareaRef}
                      className="caderno-textarea-ruled"
                      value={cadernoConteudo}
                      onChange={handleCadernoConteudoChange}
                      onKeyDown={handleKeyDown}
                      onPaste={handlePaste}
                      onKeyUp={handleKeyUp}
                      placeholder="Write your journal entry here..."
                      aria-label="Journal page content"
                      rows={MAX_LINES_PER_PAGE}
                    />

                    <div className="caderno-bottom-corner">
                      <motion.button
                        type="button"
                        className={`classic-stamp-favorite ${
                          cadernoFavoritado ? "is-favorited" : ""
                        }`}
                        onClick={toggleFavoritoCaderno}
                        whileTap={{ scale: 0.95 }}
                        title="Stamp page as favorite"
                      >
                        {cadernoFavoritado ? "FAVORITED ♥" : "FAVORITE ♥"}
                      </motion.button>
                    </div>
                  </div>
                  <ScrapbookLayer
                    attachments={currentPageAttachments}
                    stickers={currentPageStickers}
                    readonly={false}
                    sheetScale={sheetScale}
                    selectedItem={selectedScrapbookItem}
                    onSelectItem={setSelectedScrapbookItem}
                    onChangeAttachments={handleChangePageAttachments}
                    onChangeStickers={handleChangePageStickers}
                  />
                </motion.div>
              </div>
            </div>

            <button
              type="button"
              className="sheet-nav-arrow sheet-nav-arrow--right"
              onClick={navegarProximo}
              disabled={!podeAvancarPagina}
              title={
                podeAvancarPagina
                  ? "Next page (→)"
                  : "You can advance up to 3 blank pages after a written page. Write something on this page to advance further."
              }
              aria-label="Next page"
            >
              <svg
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Right Column: Active Leather Journal Volume, Paper & Ink Menu, Inspiration, Focus Mode & Save */}
        <div className="desk-right-col">
          <div className="desk-right-top">
            <div className="desk-right-notebook-wrap">
              {activeNotebook ? (
                (() => {
                  const theme = getNotebookTheme(activeNotebook.corCapa);
                  const dates = getNotebookDates(activeNotebook);
                  return (
                    <div
                      className={`leather-notebook-card leather-notebook-color--${theme.id}`}
                    style={{
                      background: theme.cardGradient,
                      borderLeftColor: theme.shelfSpine2,
                    }}
                    onClick={() => {
                      if (isGuestMode) {
                        playPaperSound();
                        openGuestPrompt("notebook-open");
                        return;
                      }
                      setCadernoPromptNotice(null);
                      setNotebookDrawerOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (isGuestMode) {
                          playPaperSound();
                          openGuestPrompt("notebook-open");
                          return;
                        }
                        setCadernoPromptNotice(null);
                        setNotebookDrawerOpen(true);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    title={
                      isGuestMode
                        ? "Sign in or create an account to open saved journals"
                        : "Click to switch, rename, or create a journal"
                    }
                  >
                    <div
                      className="leather-notebook-ribbon"
                      aria-hidden="true"
                      style={{ backgroundColor: theme.ribbonColor }}
                    />
                    <span className="leather-notebook-tag">ACTIVE JOURNAL</span>
                    <span className="leather-notebook-title">
                      {activeNotebook.nome}
                    </span>
                    <span className="leather-notebook-author">
                      {dates.updated}
                    </span>
                  </div>
                );
              })()
            ) : (
              <div
                className="leather-notebook-card is-empty-state"
                onClick={() => {
                  if (isGuestMode) {
                    playPaperSound();
                    openGuestPrompt("notebook-manage");
                    return;
                  }
                  setCadernoPromptNotice(null);
                  setNotebookDrawerOpen(true);
                }}
                role="button"
                tabIndex={0}
                title={
                  isGuestMode
                    ? "Sign in or create an account to create personal journals"
                    : "Click to create your first journal"
                }
              >
                <div className="leather-notebook-ribbon" aria-hidden="true" />
                <span className="leather-notebook-tag">NEW VOLUME</span>
                <span className="leather-notebook-title">+ CREATE JOURNAL</span>
                <span className="leather-notebook-author">CLICK TO BEGIN</span>
              </div>
            )}
          </div>

          <div className="desk-right-tools">
            {!modoFoco && renderCustomizationMenu(false)}

            <button
              type="button"
              className="inspire-trigger-btn"
              onClick={sortearInspiracao}
              title="Pull an inspiring writing prompt from the archive"
            >
              <span>Pull Inspiration</span>
            </button>

            <Link
              href="/my-shelf?section=journals"
              className="inspire-trigger-btn"
              style={{ textDecoration: "none", justifyContent: "center" }}
              title="Browse all your saved journals on My Shelf"
            >
              <span>My Shelf Archive ↗</span>
            </Link>

            {temaSalvo && (
              <div className="pinned-theme-box">
                <div className="pinned-theme-top">
                  <span className="pinned-theme-label">TODAY&apos;S THEME</span>
                  <button
                    type="button"
                    className="pinned-theme-clear"
                    onClick={() => {
                      setTemaSalvo("");
                      if (isGuestMode) {
                        setGuestPinnedTheme("");
                      } else {
                        try {
                          window.localStorage.removeItem(PINNED_THEME_STORAGE_KEY);
                        } catch {}
                      }
                    }}
                    title="Remove theme"
                  >
                    ✕
                  </button>
                </div>
                <p className="pinned-theme-phrase">“{temaSalvo}”</p>
              </div>
            )}
          </div>
          </div>

          {/* Bottom-Right Primary Actions: Focus Mode & Save Journal Page */}
          <div className="desk-right-bottom-actions">
            <button
              type="button"
              className="focus-mode-trigger-btn"
              onClick={() => {
                setModoFoco(true);
                playPaperSound();
              }}
              title="Activate Focus Mode (immersive writing canvas)"
              aria-label="Activate Focus Mode"
            >
              <EyeIcon className="focus-mode-eye-icon" />
              <span>FOCUS MODE</span>
            </button>

            <div className="desk-left-save-block">
              <button
                type="button"
                className="sober-save-btn"
                onClick={salvarPagina}
                disabled={salvando}
                title="Save current page in your active journal"
              >
                <SaveIcon className="save-btn-icon" />
                <span>{salvando ? "SAVING..." : "SAVE JOURNAL PAGE"}</span>
              </button>

              {!isGuestMode && autosaveStatus !== "idle" && (
                <div
                  className={`journal-autosave-status is-${autosaveStatus}`}
                  role={autosaveStatus === "error" ? "alert" : "status"}
                  aria-live="polite"
                >
                  {autosaveStatus === "saving" && (
                    <>
                      <span className="journal-autosave-dot" aria-hidden="true" />
                      <span>Saving...</span>
                    </>
                  )}
                  {autosaveStatus === "saved" && <span>✓ Saved</span>}
                  {autosaveStatus === "error" && (
                    <>
                      <span>Unable to save —</span>
                      <button
                        type="button"
                        className="journal-autosave-retry-btn"
                        onClick={() => void flushBackendSave()}
                      >
                        Retry
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Journal Volumes Drawer */}
      <AnimatePresence>
        {notebookDrawerOpen && (
          <div
            className="notebook-drawer-backdrop"
            onClick={() => {
              setNotebookDrawerOpen(false);
              setCadernoPromptNotice(null);
              setNewNotebookNameError(null);
              setPendingSaveAfterCreation(false);
              setRenamingNotebookId(null);
            }}
          >
            <motion.div
              className="notebook-drawer-sheet"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.92, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 15 }}
            >
              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => {
                  setNotebookDrawerOpen(false);
                  setCadernoPromptNotice(null);
                  setNewNotebookNameError(null);
                  setPendingSaveAfterCreation(false);
                  setRenamingNotebookId(null);
                }}
                title="Close"
              >
                ✕
              </button>
              <h3 className="drawer-title">Your Journals</h3>
              <p className="drawer-subtitle">
                Select an existing journal to continue writing or bind a new leather volume.
                <br />
                <span
                  style={{
                    display: "inline-block",
                    marginTop: "4px",
                    fontSize: "11px",
                    letterSpacing: "0.06em",
                    color: "#8a6b2d",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  Quota: {notebooks.length}/{isPro ? 10 : 3} journals (
                  {isPro ? "Premium Plan" : "Standard Plan"})
                </span>
              </p>

              {cadernoPromptNotice && (
                <div className="drawer-mandatory-alert">
                  <span className="drawer-alert-icon">!</span>
                  <div className="drawer-alert-body">
                    <strong>{notebooks.length >= (isPro ? 10 : 3) ? "Plan Limit Reached:" : "Journal Notice:"}</strong>
                    <span>{cadernoPromptNotice}</span>
                    {!isPro && notebooks.length >= 3 && (
                      <div style={{ marginTop: "8px" }}>
                        <Link
                          href="/clube-pro"
                          className="stamp-button compact"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            background: "var(--color-red-sands, #ad5b30)",
                            color: "#fcfbf7",
                            textDecoration: "none",
                          }}
                        >
                          Upgrade to Pro Club (up to 10 journals) →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="notebooks-list">
                {notebooks.length === 0 ? (
                  <div className="drawer-empty-state-hint">
                    <span className="empty-hint-title">Your story begins here.</span>
                    <p className="empty-hint-text">
                      Name your volume below and choose a leather cover to create your first journal.
                    </p>
                  </div>
                ) : (
                  notebooks.map((nb) => {
                    const theme = getNotebookTheme(nb.corCapa);
                    const totalPags = filterWrittenPages(nb.paginas).length;
                    const isRenaming = renamingNotebookId === nb.id;

  return (
                      <div
                        key={nb.id}
                        className={`notebook-item-card ${
                          activeNotebook?.id === nb.id ? "is-active" : ""
                        }`}
                        onClick={() => {
                          if (!isRenaming) selecionarCaderno(nb);
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          <div
                            className="notebook-item-mini-swatch"
                            style={{
                              background: theme.cardGradient,
                              borderLeft: `3px solid ${theme.shelfSpine2}`,
                            }}
                          >
                            <div
                              className="mini-swatch-ribbon"
                              style={{ backgroundColor: theme.ribbonColor }}
                            />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {isRenaming ? (
                              <div
                                style={{ display: "flex", gap: "6px", alignItems: "center" }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="text"
                                  className="new-notebook-input"
                                  style={{ padding: "4px 8px", fontSize: "13px" }}
                                  value={renameDraftValue}
                                  onChange={(e) => setRenameDraftValue(e.target.value)}
                                  maxLength={50}
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      confirmarRenomearCaderno(nb.id);
                                    } else if (e.key === "Escape") {
                                      setRenamingNotebookId(null);
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  className="stamp-button compact"
                                  onClick={() => confirmarRenomearCaderno(nb.id)}
                                >
                                  Save
                                </button>
                              </div>
                            ) : (
                              <>
                                <span className="notebook-item-name">{nb.nome}</span>
                                <div className="notebook-item-count">
                                  {totalPags}{" "}
                                  {totalPags === 1 ? "page written" : "pages written"}
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {!isRenaming && (
                          <div
                            style={{ display: "flex", alignItems: "center", gap: "8px" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="stamp-button compact"
                              style={{ padding: "3px 8px", fontSize: "9px" }}
                              onClick={() => {
                                if (isGuestMode) {
                                  playPaperSound();
                                  openGuestPrompt("notebook-manage");
                                  return;
                                }
                                setRenamingNotebookId(nb.id);
                                setRenameDraftValue(nb.nome);
                              }}
                              title="Rename this journal"
                            >
                              Rename
                            </button>
                            {activeNotebook?.id === nb.id && (
                              <span
                                style={{
                                  color: "var(--color-pollen, #cfa96f)",
                                  fontWeight: 700,
                                  fontSize: "11px",
                                }}
                              >
                                ✓ Active
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={criarNovoCaderno} className="new-notebook-form" noValidate>
                <label className="new-notebook-label" htmlFor="new-notebook-title-input">
                  NEW JOURNAL TITLE
                </label>
                <input
                  id="new-notebook-title-input"
                  ref={newNotebookInputRef}
                  type="text"
                  className={`new-notebook-input${newNotebookNameError ? " is-invalid" : ""}`}
                  placeholder="Name of new volume (e.g., Autumn Reflections, Quiet Days)..."
                  value={newNotebookTitle}
                  onChange={(e) => {
                    const nextVal = e.target.value;
                    setNewNotebookTitle(nextVal);
                    if (newNotebookNameError && nextVal.trim().length > 0) {
                      setNewNotebookNameError(null);
                    }
                  }}
                  aria-invalid={Boolean(newNotebookNameError)}
                  aria-describedby={
                    newNotebookNameError ? "new-notebook-name-error" : undefined
                  }
                  maxLength={50}
                  autoFocus
                />
                {newNotebookNameError && (
                  <p
                    id="new-notebook-name-error"
                    className="new-notebook-error"
                    role="alert"
                  >
                    {newNotebookNameError}
                  </p>
                )}

                <label
                  className="new-notebook-label"
                  style={{ marginTop: "14px" }}
                >
                  CHOOSE LEATHER COVER
                </label>
                <div className="notebook-color-picker-grid">
                  {NOTEBOOK_COLOR_OPTIONS.map((opt) => {
                    const isSelected = newNotebookCover === opt.id;
  return (
                      <button
                        key={opt.id}
                        type="button"
                        className={`notebook-color-option-card ${
                          isSelected ? "is-selected" : ""
                        }`}
                        onClick={() => {
                          setNewNotebookCover(opt.id);
                          playPaperSound();
                        }}
                      >
                        <div
                          className="notebook-color-swatch-box"
                          style={{
                            background: opt.cardGradient,
                            borderLeft: `4px solid ${opt.shelfSpine2}`,
                          }}
                        >
                          <div
                            className="swatch-ribbon"
                            style={{ backgroundColor: opt.ribbonColor }}
                          />
                          {isSelected && (
                            <span className="notebook-color-check-badge">✓</span>
                          )}
                        </div>
                        <span className="notebook-color-opt-name">{opt.nome}</span>
                        <small className="notebook-color-opt-sub">
                          {opt.etiqueta}
                        </small>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="submit"
                  className="new-notebook-btn"
                  style={{ marginTop: "14px" }}
                  disabled={creatingNotebook}
                  onClick={(e) => {
                    if (isGuestMode) {
                      e.preventDefault();
                      playPaperSound();
                      openGuestPrompt("notebook-manage");
                    }
                  }}
                >
                  {creatingNotebook ? "Creating Journal..." : "+ Create Journal"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Writing Inspiration Modal */}
      <AnimatePresence>
        {inspiracaoModal && cartaInspiracao && (
          <div
            className="inspiration-modal-backdrop"
            onClick={() => setInspiracaoModal(false)}
          >
            <motion.div
              className="inspiration-modal-sheet"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
            >
              <Tape className="modal-tape" />
              <div className="modal-top">
                <span className="modal-kicker">ARCHIVE INSPIRATION</span>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setInspiracaoModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="inspiration-prompt-box">
                <small className="prompt-label">WRITING PROMPT</small>
                <p className="prompt-text">“{promptTexto}”</p>
              </div>

              <div className="inspiration-letter-excerpt">
                <span className="excerpt-label">
                  Excerpt from “{cartaInspiracao.title}”:
                </span>
                <blockquote>“{cartaInspiracao.excerpt}”</blockquote>
                <span className="excerpt-author">
                  — {cartaInspiracao.sender}
                </span>
              </div>

              <div className="inspiration-modal-actions">
                <button
                  type="button"
                  className="btn-shuffle-inspire"
                  onClick={sortearInspiracao}
                >
                  Pull another prompt
                </button>

                <button
                  type="button"
                  className="primary-cta"
                  onClick={aplicarInspiracao}
                >
                  <span>Pin this theme</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Feedback */}
      <AnimatePresence>
        {mensagemSucesso && (
          <motion.div
            className="journal-feedback-toast"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Sticker>{mensagemSucesso}</Sticker>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Save Failure Warning Modal */}
      <AnimatePresence>
        {navFailureModalOpen && (
          <div
            className="delete-notebook-modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="journal-save-warning-title"
          >
            <motion.div
              className="delete-notebook-modal-sheet journal-save-warning-modal"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ duration: 0.18 }}
            >
              <div className="delete-modal-warning-header">
                <span className="delete-modal-icon" aria-hidden="true">
                  !
                </span>
                <h3
                  id="journal-save-warning-title"
                  className="delete-modal-title"
                >
                  Unable to Save Latest Changes
                </h3>
              </div>

              <div className="delete-modal-body">
                <p className="delete-modal-notice-text">
                  Your latest journal changes could not be saved before{" "}
                  {navFailureContextLabel}. Your writing is still safe in the
                  editor.
                </p>
                {saveErrorMessage && (
                  <div className="delete-modal-danger-box">
                    <strong>Details:</strong>
                    <p>{saveErrorMessage}</p>
                  </div>
                )}
              </div>

              <div className="delete-modal-actions">
                <button
                  type="button"
                  className="delete-modal-cancel-btn"
                  onClick={handleStayInEditor}
                  disabled={retryingNavSave}
                >
                  Stay in the editor
                </button>
                <button
                  type="button"
                  className="journal-save-retry-modal-btn"
                  onClick={() => void handleRetryNavSave()}
                  disabled={retryingNavSave}
                >
                  {retryingNavSave ? "Retrying..." : "Retry saving"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sticker Catalog Drawer */}
      <StickerCatalogDrawer
        open={stickerDrawerOpen}
        isGuestMode={isGuestMode}
        onClose={() => setStickerDrawerOpen(false)}
        onSelectSticker={handleInsertSticker}
      />

      {/* Photo Upload Modal (Authenticated Users) */}
      <PhotoUploadModal
        open={photoModalOpen}
        notebookId={activeNotebookId}
        nextZIndex={getNextScrapbookZIndex()}
        onClose={() => setPhotoModalOpen(false)}
        onInsertAttachment={handleInsertAttachment}
      />

      {/* Guest Photo Upload Restriction Modal */}
      <AnimatePresence>
        {guestPhotoNoticeOpen && (
          <motion.div
            className="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setGuestPhotoNoticeOpen(false)}
            style={{ zIndex: 1300 }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="guest-photo-notice-title"
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: "430px",
                margin: "auto",
                background: "#1f1812",
                border: "1px solid rgba(207, 169, 111, 0.42)",
                borderRadius: "12px",
                padding: "24px",
                color: "#f5e7d2",
                boxShadow: "0 20px 50px rgba(0, 0, 0, 0.55)",
              }}
            >
              <h3
                id="guest-photo-notice-title"
                style={{
                  margin: "0 0 8px",
                  fontFamily: "var(--font-serif, Georgia, serif)",
                  fontSize: "20px",
                  color: "#f5d7a3",
                }}
              >
                Account Required for Photo Uploads
              </h3>
              <p
                style={{
                  margin: "0 0 16px",
                  fontSize: "13px",
                  lineHeight: 1.55,
                  color: "rgba(245, 231, 210, 0.85)",
                }}
              >
                In guest mode, you can freely write and decorate pages with predefined vintage
                stickers in temporary memory. Sign in or create a free account to upload personal
                photographs and save your scrapbook journal permanently.
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setGuestPhotoNoticeOpen(false)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "6px",
                    border: "1px solid rgba(207, 169, 111, 0.3)",
                    background: "transparent",
                    color: "#e6d7c3",
                    cursor: "pointer",
                    fontSize: "13px",
                  }}
                >
                  Continue as Guest
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGuestPhotoNoticeOpen(false);
                    openGuestPrompt("save");
                  }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    border: "1px solid rgba(207, 169, 111, 0.6)",
                    background: "linear-gradient(180deg, #c99b5b, #9c7238)",
                    color: "#1b120b",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: "13px",
                  }}
                >
                  Sign In / Create Account
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Account Required Prompt for Guest Save & Notebook Restrictions */}
      <GuestSavePromptModal
        isOpen={guestPromptOpen}
        onClose={() => setGuestPromptOpen(false)}
        variant={guestPromptVariant}
      />
    </section>
  );
}
