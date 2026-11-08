"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { letters, type Letter } from "@/lib/letters";
import { Tape, Sticker } from "@/components/paper-kit";
import { useAuth } from "@/hooks/useAuth";
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
  TRASH_STORAGE_KEY,
  filterWrittenPages,
  getFontFamilyById,
  getFolderTheme,
  getInkColorById,
  getNotebookDates,
  getNotebookTheme,
  getPaperColorById,
  loadUserNotebooks,
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

// Exact line count visible per sheet (23 ruled lines in textarea + 1 for header = 24 lines)
const MAX_LINES_PER_PAGE = 23;
// Maximum character count fitting physically without overflowing the box
const MAX_CHARS_PER_PAGE = 1200;

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

export default function JournalEditor() {
  const { user, isPro } = useAuth();

  // Focus Mode
  const [modoFoco, setModoFoco] = useState(false);

  // Notebooks and Pages
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [activeNotebookId, setActiveNotebookId] = useState<string>("");
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [notebookDrawerOpen, setNotebookDrawerOpen] = useState(false);
  const [newNotebookTitle, setNewNotebookTitle] = useState("");
  const [newNotebookCover, setNewNotebookCover] = useState<NotebookCoverColor>("marrom");
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

  // Feedback & Saving
  const [salvando, setSalvando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState("");

  const menuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasInitialLoadedRef = useRef(false);
  const activeNotebookIdRef = useRef(activeNotebookId);
  activeNotebookIdRef.current = activeNotebookId;

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

    try {
      const temaSalvoStorage = window.localStorage.getItem(PINNED_THEME_STORAGE_KEY);
      if (temaSalvoStorage) setTemaSalvo(temaSalvoStorage);
    } catch {}
  }, []);

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

  // Initialize notebooks from LocalStorage and URL query params
  const carregarCadernos = (event?: any) => {
    if (event?.detail?.source === "editor") return;

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

    if (!hasInitialLoadedRef.current || !notebookAindaExiste || urlNotebookId) {
      hasInitialLoadedRef.current = true;
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
    carregarCadernos();
    window.addEventListener(JOURNAL_UPDATED_EVENT, carregarCadernos);
    window.addEventListener("storage", carregarCadernos);
    return () => {
      window.removeEventListener(JOURNAL_UPDATED_EVENT, carregarCadernos);
      window.removeEventListener("storage", carregarCadernos);
    };
  }, [user?.id]);

  // Listen to EDIT request from reading room
  useEffect(() => {
    const handleEditRequest = (e: any) => {
      const { notebookId, pageIndex } = e.detail || {};
      if (!notebookId) return;

      setActiveNotebookId(notebookId);
      try {
        window.localStorage.setItem(ACTIVE_NOTEBOOK_ID_KEY, notebookId);
      } catch {}

      const targetNb = notebooks.find((n) => n.id === notebookId);
      if (targetNb) {
        const paginas =
          targetNb.paginas && targetNb.paginas.length > 0
            ? targetNb.paginas
            : [createBlankPage()];
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

    window.addEventListener("entre-cartas:abrir-edicao-caderno", handleEditRequest);
    return () => {
      window.removeEventListener("entre-cartas:abrir-edicao-caderno", handleEditRequest);
    };
  }, [notebooks]);

  const activeNotebook: Notebook | null =
    notebooks.find((n) => n.id === activeNotebookId) ||
    (notebooks.length > 0 ? notebooks[0] : null);

  // CRITICAL RULE: Only save written pages to persistent storage
  const salvarCadernosNoStorage = (paginasAtuais: NotebookPage[]) => {
    if (!activeNotebook) return;

    const nowIso = new Date().toISOString();
    const paginasEscritas = filterWrittenPages(paginasAtuais).map((p) => ({
      ...p,
      atualizadoEm: p.atualizadoEm || nowIso,
    }));

    const allStored = loadAllRawNotebooks();
    const atualizados = allStored.map((nb) => {
      if (nb.id === activeNotebook.id) {
        return {
          ...nb,
          paginas: paginasEscritas,
          criadoEm: nb.criadoEm || nowIso,
          atualizadoEm: nowIso,
          ownerId: nb.ownerId || user?.id,
        };
      }
      return nb;
    });

    setNotebooks(atualizados.filter((nb) => !user?.id || !nb.ownerId || String(nb.ownerId) === String(user.id)));
    saveAllNotebooks(atualizados, "editor");
  };

  const salvarCadernoAtualNoStorage = () => {
    if (!activeNotebook) return;
    const copy = [...cadernoPaginas];
    if (copy[currentPageIndex]) {
      copy[currentPageIndex] = {
        ...copy[currentPageIndex],
        titulo: cadernoTitulo,
        conteudo: cadernoConteudo,
        favoritado: cadernoFavoritado,
        atualizadoEm: new Date().toISOString(),
        tipoPapel: sheetBgId,
        corTinta: inkColorId,
        fonte: fontFamilyId,
      };
    }
    salvarCadernosNoStorage(copy);
  };

  const atualizarRascunhoCaderno = (
    novoTexto?: string,
    novoTitulo?: string,
    novoFav?: boolean,
    customStyle?: { tipoPapel?: string; corTinta?: string; fonte?: string }
  ) => {
    if (!activeNotebook) return;
    const textoSalvar = novoTexto !== undefined ? novoTexto : cadernoConteudo;
    const tituloSalvar = novoTitulo !== undefined ? novoTitulo : cadernoTitulo;
    const favSalvar = novoFav !== undefined ? novoFav : cadernoFavoritado;

    setCadernoPaginas((prev) => {
      const copy = [...prev];
      if (copy[currentPageIndex]) {
        copy[currentPageIndex] = {
          ...copy[currentPageIndex],
          titulo: tituloSalvar,
          conteudo: textoSalvar,
          favoritado: favSalvar,
          atualizadoEm: new Date().toISOString(),
          tipoPapel: customStyle?.tipoPapel ?? sheetBgId,
          corTinta: customStyle?.corTinta ?? inkColorId,
          fonte: customStyle?.fonte ?? fontFamilyId,
        };
      }
      salvarCadernosNoStorage(copy);
      return copy;
    });
  };

  // Pagination rule: allow advancing up to 3 blank pages beyond the last written page
  const ultimoIndiceEscrito = (() => {
    let ultimo = -1;
    cadernoPaginas.forEach((pag, idx) => {
      const isCurrent = idx === currentPageIndex;
      const texto = isCurrent ? cadernoConteudo : pag.conteudo || "";
      const titulo = isCurrent ? cadernoTitulo : pag.titulo || "";
      if (texto.trim().length > 0 || titulo.trim().length > 0) {
        if (idx > ultimo) ultimo = idx;
      }
    });
    if (cadernoConteudo.trim().length > 0 || cadernoTitulo.trim().length > 0) {
      if (currentPageIndex > ultimo) ultimo = currentPageIndex;
    }
    return ultimo;
  })();

  const maxAllowedIndex = (ultimoIndiceEscrito >= 0 ? ultimoIndiceEscrito : 0) + 3;
  const podeAvancarPagina = currentPageIndex < maxAllowedIndex;

  const navegarAnterior = () => {
    if (currentPageIndex <= 0) return;

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
    setCadernoPaginas(paginasAtuais);
    setCurrentPageIndex(anteriorIndex);
    const antPag = paginasAtuais[anteriorIndex];
    setCadernoTitulo(antPag?.titulo || "");
    setCadernoConteudo(antPag?.conteudo || "");
    setCadernoFavoritado(Boolean(antPag?.favoritado));
    applyPageFormatting(antPag);
    playPaperSound();
    salvarCadernosNoStorage(paginasAtuais);
  };

  const navegarProximo = () => {
    if (!podeAvancarPagina) return;

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
      setCadernoPaginas(paginasAtuais);
      setCurrentPageIndex(proximoIndex);
      const proxPag = paginasAtuais[proximoIndex];
      setCadernoTitulo(proxPag?.titulo || "");
      setCadernoConteudo(proxPag?.conteudo || "");
      setCadernoFavoritado(Boolean(proxPag?.favoritado));
      applyPageFormatting(proxPag);
      playPaperSound();
      salvarCadernosNoStorage(paginasAtuais);
    } else {
      const novaPagina = createBlankPage();
      const novasPaginas = [...paginasAtuais, novaPagina];
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

    if (!activeNotebook) {
      setCadernoPromptNotice(
        "Please create a journal first to save and advance to the next page."
      );
      setPendingSaveAfterCreation(true);
      setNotebookDrawerOpen(true);
      return;
    }

    const textoAtual =
      textoAtualPreenchido !== undefined ? textoAtualPreenchido : cadernoConteudo;
    const tituloAtual = cadernoTitulo;

    const paginasAtualizadas = [...cadernoPaginas];
    if (paginasAtualizadas[currentPageIndex]) {
      paginasAtualizadas[currentPageIndex] = {
        ...paginasAtualizadas[currentPageIndex],
        titulo: tituloAtual,
        conteudo: textoAtual,
        favoritado: cadernoFavoritado,
        atualizadoEm: new Date().toISOString(),
        tipoPapel: sheetBgId,
        corTinta: inkColorId,
        fonte: fontFamilyId,
      };
    }

    if (currentPageIndex < paginasAtualizadas.length - 1) {
      const proximoIndex = currentPageIndex + 1;
      const proximaPag = paginasAtualizadas[proximoIndex];
      const textoFinalProxima = textoExcedente
        ? proximaPag.conteudo
          ? textoExcedente + "\n" + proximaPag.conteudo
          : textoExcedente
        : proximaPag.conteudo;

      paginasAtualizadas[proximoIndex] = {
        ...proximaPag,
        conteudo: textoFinalProxima,
      };

      setCadernoPaginas(paginasAtualizadas);
      setCurrentPageIndex(proximoIndex);
      setCadernoTitulo(proximaPag.titulo || "");
      setCadernoConteudo(textoFinalProxima);
      setCadernoFavoritado(Boolean(proximaPag.favoritado));
      applyPageFormatting(proximaPag);

      salvarCadernosNoStorage(paginasAtualizadas);
    } else {
      const novaPagina: NotebookPage = {
        ...createBlankPage(),
        conteudo: textoExcedente,
      };

      const novasPaginas = [...paginasAtualizadas, novaPagina];
      setCadernoPaginas(novasPaginas);
      setCurrentPageIndex(novasPaginas.length - 1);
      setCadernoTitulo("");
      setCadernoConteudo(textoExcedente);
      setCadernoFavoritado(false);

      salvarCadernosNoStorage(novasPaginas);
    }

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          textoExcedente.length,
          textoExcedente.length
        );
      }
    }, 50);
  };

  const isSheetFull = (
    text: string,
    textareaEl?: HTMLTextAreaElement | null
  ): boolean => {
    if (text.length >= MAX_CHARS_PER_PAGE) return true;
    const linhas = text.split("\n");
    if (linhas.length >= MAX_LINES_PER_PAGE) return true;
    if (textareaEl) {
      if (textareaEl.scrollHeight > textareaEl.clientHeight + 2) return true;
    }
    return false;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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

    const textarea = textareaRef.current;
    if (textarea && textarea.selectionStart !== textarea.selectionEnd) {
      return;
    }

    const folhaCheia = isSheetFull(cadernoConteudo, textarea);

    if (folhaCheia) {
      e.preventDefault();
      const charInserido =
        e.key === "Enter" ? "\n" : e.key.length === 1 ? e.key : "";
      avancarParaProximaPaginaComTexto(charInserido);
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

    const linhas = textoProjetado.split("\n");
    if (
      linhas.length > MAX_LINES_PER_PAGE ||
      textoProjetado.length > MAX_CHARS_PER_PAGE
    ) {
      e.preventDefault();

      let textoQueCabe = "";
      let textoExcedente = "";

      if (linhas.length > MAX_LINES_PER_PAGE) {
        textoQueCabe = linhas.slice(0, MAX_LINES_PER_PAGE).join("\n");
        textoExcedente = linhas.slice(MAX_LINES_PER_PAGE).join("\n");
      } else {
        textoQueCabe = textoProjetado.slice(0, MAX_CHARS_PER_PAGE);
        textoExcedente = textoProjetado.slice(MAX_CHARS_PER_PAGE);
      }

      setCadernoConteudo(textoQueCabe);
      atualizarRascunhoCaderno(textoQueCabe);
      avancarParaProximaPaginaComTexto(textoExcedente);
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
    const linhas = novoTexto.split("\n");

    if (linhas.length > MAX_LINES_PER_PAGE) {
      const linhasPaginaAtual = linhas.slice(0, MAX_LINES_PER_PAGE).join("\n");
      const linhasExcedentes = linhas.slice(MAX_LINES_PER_PAGE).join("\n");

      setCadernoConteudo(linhasPaginaAtual);
      atualizarRascunhoCaderno(linhasPaginaAtual);
      avancarParaProximaPaginaComTexto(linhasExcedentes);
      return;
    }

    if (novoTexto.length > MAX_CHARS_PER_PAGE) {
      const textoPaginaAtual = novoTexto.slice(0, MAX_CHARS_PER_PAGE);
      const textoExcedente = novoTexto.slice(MAX_CHARS_PER_PAGE);

      setCadernoConteudo(textoPaginaAtual);
      atualizarRascunhoCaderno(textoPaginaAtual);
      avancarParaProximaPaginaComTexto(textoExcedente);
      return;
    }

    setCadernoConteudo(novoTexto);
    atualizarRascunhoCaderno(novoTexto);
  };

  const handleKeyUp = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    if (textarea.scrollHeight > textarea.clientHeight + 2) {
      const texto = textarea.value;
      const palavras = texto.split(" ");
      if (palavras.length > 1) {
        const ultimaPalavra = palavras.pop() || "";
        const textoQueCabe = palavras.join(" ");

        setCadernoConteudo(textoQueCabe);
        atualizarRascunhoCaderno(textoQueCabe);
        avancarParaProximaPaginaComTexto(ultimaPalavra);
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
    if (!cadernoConteudo.trim() && !cadernoTitulo.trim()) {
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
    setCadernoTitulo(tituloFinal);

    const paginasAtualizadas = [...cadernoPaginas];
    if (paginasAtualizadas[currentPageIndex]) {
      paginasAtualizadas[currentPageIndex] = {
        ...paginasAtualizadas[currentPageIndex],
        titulo: tituloFinal,
        conteudo: cadernoConteudo.trim(),
        favoritado: cadernoFavoritado,
        atualizadoEm: new Date().toISOString(),
        tipoPapel: sheetBgId,
        corTinta: inkColorId,
        fonte: fontFamilyId,
      };
    }
    setCadernoPaginas(paginasAtualizadas);

    salvarCadernosNoStorage(paginasAtualizadas);

    setSalvando(false);
    setMensagemSucesso(
      `Page saved in journal "${activeNotebook.nome}".`
    );
    setTimeout(() => setMensagemSucesso(""), 3000);
  };

  const selecionarCaderno = (nb: Notebook) => {
    if (activeNotebook && activeNotebook.id !== nb.id) {
      salvarCadernoAtualNoStorage();
    }

    setActiveNotebookId(nb.id);
    try {
      window.localStorage.setItem(ACTIVE_NOTEBOOK_ID_KEY, nb.id);
    } catch {}

    const paginas =
      nb.paginas && nb.paginas.length > 0 ? nb.paginas : [createBlankPage()];

    setCadernoPaginas(paginas);
    setCurrentPageIndex(0);
    setCadernoTitulo(paginas[0]?.titulo || "");
    setCadernoConteudo(paginas[0]?.conteudo || "");
    setCadernoFavoritado(Boolean(paginas[0]?.favoritado));
    applyPageFormatting(paginas[0]);

    setNotebookDrawerOpen(false);
    playPaperSound();
  };

  const criarNovoCaderno = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotebookTitle.trim()) return;

    const limiteCadernos = isPro ? 10 : 3;
    if (notebooks.length >= limiteCadernos) {
      alert(
        isPro
          ? `You have reached the limit of ${limiteCadernos} journals on the Premium Plan.`
          : `You have reached the limit of ${limiteCadernos} journals on the Standard Plan. Join Pro Club to have up to 10 journals!`
      );
      return;
    }

    const nowIso = new Date().toISOString();

    // 1. Save whatever was written on screen to the old journal (written pages only)
    let allStored = loadAllRawNotebooks();
    if (activeNotebook) {
      allStored = allStored.map((nb) => {
        if (nb.id === activeNotebook.id) {
          const paginasAtualizadas = [...cadernoPaginas];
          if (paginasAtualizadas[currentPageIndex]) {
            paginasAtualizadas[currentPageIndex] = {
              ...paginasAtualizadas[currentPageIndex],
              titulo: cadernoTitulo,
              conteudo: cadernoConteudo,
              favoritado: cadernoFavoritado,
              atualizadoEm: nowIso,
              tipoPapel: sheetBgId,
              corTinta: inkColorId,
              fonte: fontFamilyId,
            };
          }
          const paginasEscritas = filterWrittenPages(paginasAtualizadas);
          return {
            ...nb,
            paginas: paginasEscritas,
            atualizadoEm: nowIso,
          };
        }
        return nb;
      });
    }

    // 2. If user had written text before creating their very first journal, preserve that page into the new journal
    const hasPendingWrittenText =
      !activeNotebook &&
      Boolean(cadernoConteudo.trim().length > 0 || cadernoTitulo.trim().length > 0);

    const initialPagesForNewNotebook: NotebookPage[] = hasPendingWrittenText
      ? [
          {
            id: "pag-" + Date.now(),
            titulo:
              cadernoTitulo.trim() || `Memory of ${dataFormatada || "Today"}`,
            conteudo: cadernoConteudo.trim(),
            dataFormatada: dataFormatada || "Today",
            favoritado: cadernoFavoritado,
            criadoEm: nowIso,
            atualizadoEm: nowIso,
            tipoPapel: sheetBgId,
            corTinta: inkColorId,
            fonte: fontFamilyId,
          },
        ]
      : [];

    const novoCaderno: Notebook = {
      id: "caderno-" + Date.now(),
      nome: newNotebookTitle.trim(),
      corCapa: newNotebookCover,
      paginas: initialPagesForNewNotebook,
      criadoEm: nowIso,
      atualizadoEm: nowIso,
      ownerId: user?.id,
    };

    const listaFinal = [...allStored, novoCaderno];
    saveAllNotebooks(listaFinal);
    setNotebooks(
      listaFinal.filter(
        (nb) => !user?.id || !nb.ownerId || String(nb.ownerId) === String(user.id)
      )
    );

    try {
      window.localStorage.setItem(ACTIVE_NOTEBOOK_ID_KEY, novoCaderno.id);
    } catch {}

    setActiveNotebookId(novoCaderno.id);
    setCurrentPageIndex(0);

    if (hasPendingWrittenText && initialPagesForNewNotebook[0]) {
      setCadernoPaginas(initialPagesForNewNotebook);
      setCadernoTitulo(initialPagesForNewNotebook[0].titulo);
      setCadernoConteudo(initialPagesForNewNotebook[0].conteudo);
      setCadernoFavoritado(initialPagesForNewNotebook[0].favoritado);
    } else {
      const blank = createBlankPage();
      setCadernoPaginas([blank]);
      setCadernoTitulo("");
      setCadernoConteudo("");
      setCadernoFavoritado(false);
    }

    setNewNotebookTitle("");
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
  };

  const confirmarRenomearCaderno = (notebookId: string) => {
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
      try {
        window.localStorage.setItem(PINNED_THEME_STORAGE_KEY, promptTexto);
      } catch {}
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
        {/* Left Column: Active Leather Journal Volume & Save Action */}
        <div className="desk-left-col">
          <div className="caderno-left-stack">
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
                      setCadernoPromptNotice(null);
                      setNotebookDrawerOpen(true);
                    }}
                    role="button"
                    tabIndex={0}
                    title="Click to switch, rename, or create a journal"
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
                  setCadernoPromptNotice(null);
                  setNotebookDrawerOpen(true);
                }}
                role="button"
                tabIndex={0}
                title="Click to create your first journal"
              >
                <div className="leather-notebook-ribbon" aria-hidden="true" />
                <span className="leather-notebook-tag">NEW VOLUME</span>
                <span className="leather-notebook-title">+ CREATE JOURNAL</span>
                <span className="leather-notebook-author">CLICK TO BEGIN</span>
              </div>
            )}

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
          </div>

          <div className="desk-left-bottom">
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
          </div>
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

            <motion.div
              key={`${activeNotebookId}-${currentPageIndex}`}
              className="writing-sheet-card mode-caderno"
              style={{
                backgroundColor: sheetBgColor,
                color: inkColor,
                fontFamily: getFontFamilyById(fontFamilyId),
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
            </motion.div>

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

        {/* Right Column: Paper & Ink Menu, Pull Inspiration, Pinned Theme, Shelf Link */}
        <div className="desk-right-col">
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
                      try {
                        window.localStorage.removeItem(PINNED_THEME_STORAGE_KEY);
                      } catch {}
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
      </div>

      {/* Journal Volumes Drawer */}
      <AnimatePresence>
        {notebookDrawerOpen && (
          <div
            className="notebook-drawer-backdrop"
            onClick={() => {
              setNotebookDrawerOpen(false);
              setCadernoPromptNotice(null);
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
                    <strong>Journal Required:</strong>
                    <span>{cadernoPromptNotice}</span>
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

              <form onSubmit={criarNovoCaderno} className="new-notebook-form">
                <label className="new-notebook-label">NEW JOURNAL TITLE</label>
                <input
                  type="text"
                  className="new-notebook-input"
                  placeholder="Name of new volume (e.g., Autumn Reflections, Quiet Days)..."
                  value={newNotebookTitle}
                  onChange={(e) => setNewNotebookTitle(e.target.value)}
                  maxLength={50}
                  autoFocus
                />

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
                >
                  + Create Journal
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
    </section>
  );
}
