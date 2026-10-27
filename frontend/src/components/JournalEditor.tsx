"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { letters, type Letter } from "@/lib/letters";
import { Tape, Sticker } from "@/components/paper-kit";
import { api } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";

export const JOURNAL_UPDATED_EVENT = "entre-cartas:journal-updated";
export const NOTEBOOKS_STORAGE_KEY = "entre-cartas:notebooks:v2";
export const ACTIVE_NOTEBOOK_ID_KEY = "entre-cartas:active-notebook-id";
export const LETTER_FOLDERS_STORAGE_KEY = "entre-cartas:letter-folders:v1";
export const ACTIVE_LETTER_FOLDER_ID_KEY = "entre-cartas:active-letter-folder-id";
const SAVED_ENTRIES_KEY = "entre-cartas:journal:entries";
const PINNED_THEME_STORAGE_KEY = "entre-cartas:pinned-theme";

// Exact line count visible per sheet (23 ruled lines in textarea + 1 for header = 24 lines)
const MAX_LINES_PER_PAGE = 23;
// Maximum character count fitting physically without overflowing the box
const MAX_CHARS_PER_PAGE = 1200;

export interface LetterFolder {
  id: string;
  nome: string;
  cor?: string;
  criadoEm: string;
}

export type JournalEntry = {
  id: string;
  titulo: string;
  conteudo: string;
  humor: string;
  data_formatada: string;
  criado_em: string;
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
  tipoPapel?: string;
  corTinta?: string;
  fonte?: string;
}

export interface Notebook {
  id: string;
  nome: string;
  corCapa: string;
  paginas: NotebookPage[];
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
    corHex: "#3e271d",
    shelfBg: "#221612",
    shelfSpine1: "#170e0b",
    shelfSpine2: "#0f0907",
    cardGradient: "linear-gradient(135deg, #2c1d18 0%, #1c110d 55%, #120b08 100%)",
    ribbonColor: "#7a1818",
  },
  {
    id: "verde",
    nome: "Green",
    etiqueta: "Botanical Moss",
    corHex: "#1c3224",
    shelfBg: "#14241a",
    shelfSpine1: "#0e1a12",
    shelfSpine2: "#08100b",
    cardGradient: "linear-gradient(135deg, #1b2f22 0%, #132219 55%, #0b140f 100%)",
    ribbonColor: "#8b7332",
  },
  {
    id: "vinho",
    nome: "Wine",
    etiqueta: "Noble Burgundy",
    corHex: "#451a24",
    shelfBg: "#291117",
    shelfSpine1: "#1d0b10",
    shelfSpine2: "#120609",
    cardGradient: "linear-gradient(135deg, #3d1722 0%, #290e16 55%, #17070b 100%)",
    ribbonColor: "#9c8242",
  },
];

export const getNotebookTheme = (corCapa?: string): NotebookColorOption => {
  if (corCapa === "verde" || corCapa === "#223826" || corCapa === "#1e3323" || corCapa === "#1c3224") {
    return NOTEBOOK_COLOR_OPTIONS[1];
  }
  if (corCapa === "vinho" || corCapa === "#441a24" || corCapa === "#3b161e" || corCapa === "#451a24") {
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

// Sober archival postal seals
const SEAL_OPTIONS: PostalSeal[] = [
  { id: "amor", label: "Love", code: "I. LV", color: "#8B1E1E", postmark: "AFFECTIVE MAIL" },
  { id: "saudade", label: "Longing", code: "II. LG", color: "#1C2A39", postmark: "DISTANT SENDER" },
  { id: "desabafo", label: "Confession", code: "III. CF", color: "#4A3E31", postmark: "FREE CONFESSION" },
  { id: "nunca-enviada", label: "Unsent", code: "IV. US", color: "#2B3A2E", postmark: "UNADDRESSED" },
  { id: "silencio", label: "Silence", code: "V. SL", color: "#3D3935", postmark: "SILENT TIME" },
  { id: "historica", label: "Historical", code: "VI. HS", color: "#6A5432", postmark: "PERMANENT ARCHIVE" },
];

const PAPER_OPTIONS = [
  { id: "marfim", name: "Cotton & Ivory", color: "#FCFBF7" },
  { id: "pergaminho", name: "Mellow Parchment", color: "#F7F3EA" },
  { id: "kraft", name: "Noble Raw Linen", color: "#EFE8DA" },
  { id: "branco", name: "Classic Letter Paper", color: "#FAF9F5" },
];

const INK_OPTIONS = [
  { id: "nanquim", name: "Soft India Ink", color: "#262626" },
  { id: "azul-noite", name: "Deep Midnight Blue", color: "#1C2A39" },
  { id: "sepia", name: "Archival Sepia", color: "#4A3E31" },
  { id: "grafite", name: "Sober Graphite", color: "#3A3A3A" },
];

const FONT_OPTIONS = [
  { id: "caveat", name: "Fountain Pen Script", styleFamily: "'Caveat', cursive" },
  { id: "literary", name: "Literary Italic", styleFamily: "var(--literary-italic, 'EB Garamond', Georgia, serif)" },
  { id: "garamond", name: "Classic Serif", styleFamily: "var(--serif, 'EB Garamond', serif)" },
  { id: "typewriter", name: "Historical Typewriter", styleFamily: "'Special Elite', monospace" },
];

const PROMPTS = [
  "Write about a small detail of your day that nobody noticed but you.",
  "When was the last time you waited for something with your heart in your mouth?",
  "If you could leave a note on the windowsill for yourself five years ago, what would it say?",
  "Describe the scent or sound of a place that once felt like home to you.",
  "Is there a word you swallowed recently that deserved to be spoken aloud?",
  "What would you like to forget slowly, without hurry or bitterness?",
];

function playPaperSound() {
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

export default function JournalEditor() {
  const { user, isPro } = useAuth();

  // Tabs: 'caderno' (Journal) | 'carta' (Letter)
  const [activeTab, setActiveTab] = useState<"caderno" | "carta">("caderno");

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

  // Separated content: Caderno (Journal)
  const [cadernoTitulo, setCadernoTitulo] = useState("");
  const [cadernoConteudo, setCadernoConteudo] = useState("");
  const [cadernoFavoritado, setCadernoFavoritado] = useState(false);
  const [cadernoPaginas, setCadernoPaginas] = useState<NotebookPage[]>([]);

  // Separated content: Carta (Letter)
  const [cartaTitulo, setCartaTitulo] = useState("");
  const [cartaConteudo, setCartaConteudo] = useState("");
  const [cartaFavoritado, setCartaFavoritado] = useState(false);

  const [dataFormatada, setDataFormatada] = useState("");

  // Letter Mode Seal
  const [cartaSelo, setCartaSelo] = useState<PostalSeal>(SEAL_OPTIONS[0]);

  // Letter Mode Folders
  const [letterFolders, setLetterFolders] = useState<LetterFolder[]>([]);
  const [activeLetterFolderId, setActiveLetterFolderId] = useState<string>("");
  const [folderDrawerOpen, setFolderDrawerOpen] = useState(false);
  const [newFolderTitle, setNewFolderTitle] = useState("");
  const [newFolderColor, setNewFolderColor] = useState<string>("marrom");
  const [folderPromptNotice, setFolderPromptNotice] = useState<string | null>(null);

  // Pending save after creation
  const [pendingSaveAfterCreation, setPendingSaveAfterCreation] = useState(false);

  const activeLetterFolder =
    letterFolders.find((f) => f.id === activeLetterFolderId) || (letterFolders.length > 0 ? letterFolders[0] : null);

  // Pinned theme
  const [temaSalvo, setTemaSalvo] = useState<string>("");

  // Customization Menu
  const [customMenuOpen, setCustomMenuOpen] = useState(false);
  const [sheetBgId, setSheetBgId] = useState("marfim");
  const [sheetBgColor, setSheetBgColor] = useState("#FBF7EF");
  const [inkColorId, setInkColorId] = useState("nanquim");
  const [inkColor, setInkColor] = useState("#2B2B2B");
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

  const hasInitialLoadedRef = useRef(false);
  const activeNotebookIdRef = useRef(activeNotebookId);
  activeNotebookIdRef.current = activeNotebookId;

  // Initialize notebooks and folders from LocalStorage
  const carregarCadernosEPastas = (event?: any) => {
    // Se o evento foi disparado pelo próprio editor, não precisamos recarregar nada
    if (event?.detail?.source === "editor") return;

    try {
      const stored = window.localStorage.getItem(NOTEBOOKS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const userOnlyNotebooks = parsed.filter(
            (n: Notebook) => n.id !== "default-caderno" && n.id !== "caderno-noturno"
          );
          setNotebooks(userOnlyNotebooks);

          const currentId = activeNotebookIdRef.current;
          const notebookAindaExiste = userOnlyNotebooks.some((n: Notebook) => n.id === currentId);

          if (!hasInitialLoadedRef.current || !notebookAindaExiste) {
            hasInitialLoadedRef.current = true;
            if (userOnlyNotebooks.length > 0) {
              const savedActiveId = window.localStorage.getItem(ACTIVE_NOTEBOOK_ID_KEY);
              const targetActiveId = userOnlyNotebooks.some((n: Notebook) => n.id === savedActiveId)
                ? (savedActiveId as string)
                : userOnlyNotebooks[0].id;
              setActiveNotebookId(targetActiveId);

              const active = userOnlyNotebooks.find((n: Notebook) => n.id === targetActiveId) || userOnlyNotebooks[0];
              const paginasEscritas = (active?.paginas || []).filter(
                (p: NotebookPage) => (p.conteudo && p.conteudo.trim().length > 0) || (p.titulo && p.titulo.trim().length > 0)
              );
              const writtenPages =
                paginasEscritas.length > 0
                  ? paginasEscritas
                  : [
                      {
                        id: "pag-" + Date.now(),
                        titulo: "",
                        conteudo: "",
                        dataFormatada: dataFormatada || "Today",
                        favoritado: false,
                        criadoEm: new Date().toISOString(),
                      },
                    ];
              setCadernoPaginas(writtenPages);
              setCurrentPageIndex(0);
              setCadernoTitulo(writtenPages[0]?.titulo || "");
              setCadernoConteudo(writtenPages[0]?.conteudo || "");
              setCadernoFavoritado(Boolean(writtenPages[0]?.favoritado));
            } else {
              setActiveNotebookId("");
              setCadernoPaginas([
                {
                  id: "pag-init",
                  titulo: "",
                  conteudo: "",
                  dataFormatada: dataFormatada || "Today",
                  favoritado: false,
                  criadoEm: new Date().toISOString(),
                },
              ]);
              setCurrentPageIndex(0);
              setCadernoTitulo("");
              setCadernoConteudo("");
              setCadernoFavoritado(false);
            }
          }
        }
      } else {
        setNotebooks([]);
        setActiveNotebookId("");
      }
    } catch {}

    try {
      const storedFolders = window.localStorage.getItem(LETTER_FOLDERS_STORAGE_KEY);
      if (storedFolders) {
        const parsedFolders = JSON.parse(storedFolders);
        if (Array.isArray(parsedFolders)) {
          const userOnlyFolders = parsedFolders.filter(
            (f: LetterFolder) => f.id !== "pasta-principal"
          );
          setLetterFolders(userOnlyFolders);

          if (userOnlyFolders.length > 0) {
            const savedActiveFolderId = window.localStorage.getItem(ACTIVE_LETTER_FOLDER_ID_KEY);
            if (savedActiveFolderId && userOnlyFolders.some((f: LetterFolder) => f.id === savedActiveFolderId)) {
              setActiveLetterFolderId(savedActiveFolderId);
            } else {
              setActiveLetterFolderId(userOnlyFolders[0].id);
            }
          } else {
            setActiveLetterFolderId("");
          }
        }
      } else {
        setLetterFolders([]);
        setActiveLetterFolderId("");
      }
    } catch {}
  };

  useEffect(() => {
    carregarCadernosEPastas();
    window.addEventListener(JOURNAL_UPDATED_EVENT, carregarCadernosEPastas);
    window.addEventListener("storage", carregarCadernosEPastas);
    return () => {
      window.removeEventListener(JOURNAL_UPDATED_EVENT, carregarCadernosEPastas);
      window.removeEventListener("storage", carregarCadernosEPastas);
    };
  }, []);

  // Listen to EDIT request from reading room
  useEffect(() => {
    const handleEditRequest = (e: any) => {
      const { notebookId, pageIndex } = e.detail || {};
      if (!notebookId) return;

      setActiveTab("caderno");
      setActiveNotebookId(notebookId);

      const targetNb = notebooks.find((n) => n.id === notebookId);
      if (targetNb && targetNb.paginas) {
        const paginas = targetNb.paginas.length > 0
          ? targetNb.paginas
          : [
              {
                id: "pag-" + Date.now(),
                titulo: "",
                conteudo: "",
                dataFormatada: "Today",
                favoritado: false,
                criadoEm: new Date().toISOString(),
              },
            ];
        setCadernoPaginas(paginas);
        const idx = typeof pageIndex === "number" && paginas[pageIndex] ? pageIndex : 0;
        setCurrentPageIndex(idx);
        const pag = paginas[idx];
        if (pag) {
          setCadernoTitulo(pag.titulo || "");
          setCadernoConteudo(pag.conteudo || "");
          setCadernoFavoritado(Boolean(pag.favoritado));
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

  const paginasCaderno = cadernoPaginas.length > 0 ? cadernoPaginas : (activeNotebook?.paginas || []);

  const carregarPagina = (index: number, lista: NotebookPage[] = cadernoPaginas) => {
    if (!lista || lista.length === 0) return;
    const pag = lista[index];
    if (pag) {
      setCurrentPageIndex(index);
      setCadernoTitulo(pag.titulo || "");
      setCadernoConteudo(pag.conteudo || "");
      setCadernoFavoritado(Boolean(pag.favoritado));
      playPaperSound();
    }
  };

  // REGRA CRÍTICA: Somente salva no caderno as páginas ESCRITAS!
  // Caso tenha 1 página escrita e 2 vazias, o contador em tela pode marcar 3 páginas,
  // porém a única salva no caderno é a que está escrita.
  const salvarCadernosNoStorage = (paginasAtuais: NotebookPage[]) => {
    if (!activeNotebook) return;

    const paginasEscritas = paginasAtuais.filter(
      (p) => (p.conteudo && p.conteudo.trim().length > 0) || (p.titulo && p.titulo.trim().length > 0)
    );

    const atualizados = notebooks.map((nb) => {
      if (nb.id === activeNotebook.id) {
        return {
          ...nb,
          paginas: paginasEscritas,
        };
      }
      return nb;
    });

    setNotebooks(atualizados);
    try {
      window.localStorage.setItem(NOTEBOOKS_STORAGE_KEY, JSON.stringify(atualizados));
    } catch {}

    window.dispatchEvent(
      new CustomEvent(JOURNAL_UPDATED_EVENT, { detail: { source: "editor" } })
    );
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
      };
    }
    salvarCadernosNoStorage(copy);
  };

  const atualizarRascunhoCaderno = (novoTexto?: string, novoTitulo?: string, novoFav?: boolean) => {
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
        };
      }
      salvarCadernosNoStorage(copy);
      return copy;
    });
  };

  const mudarAba = (novaAba: "caderno" | "carta") => {
    if (novaAba === activeTab) return;
    playPaperSound();

    if (activeTab === "caderno") {
      salvarCadernoAtualNoStorage();
    }

    setActiveTab(novaAba);
    if (novaAba === "carta") {
      setModoFoco(false);
    }
  };

  // NOVA REGRA DE AVANÇO (Solicitada pelo usuário):
  // O usuário pode avançar sempre 3 páginas, independente se está escrita ou não a atual,
  // sempre conferir que ele consiga avançar somente 3 páginas após uma que esteja escrita.
  const ultimoIndiceEscrito = (() => {
    let ultimo = -1;
    cadernoPaginas.forEach((pag, idx) => {
      const isCurrent = idx === currentPageIndex;
      const texto = isCurrent ? cadernoConteudo : (pag.conteudo || "");
      const titulo = isCurrent ? cadernoTitulo : (pag.titulo || "");
      if (texto.trim().length > 0 || titulo.trim().length > 0) {
        if (idx > ultimo) ultimo = idx;
      }
    });
    if (cadernoConteudo.trim().length > 0 || cadernoTitulo.trim().length > 0) {
      if (currentPageIndex > ultimo) ultimo = currentPageIndex;
    }
    return ultimo;
  })();

  // Se nenhuma página foi escrita ainda, a base é 0 (pode avançar até o índice 3, total de 4 páginas).
  // Se alguma página foi escrita, pode avançar até 3 páginas à frente da última escrita.
  const maxAllowedIndex = (ultimoIndiceEscrito >= 0 ? ultimoIndiceEscrito : 0) + 3;
  const podeAvancarPagina = currentPageIndex < maxAllowedIndex;

  const navegarAnterior = () => {
    if (activeTab === "carta") return;
    if (currentPageIndex <= 0) return;

    const paginasAtuais = [...cadernoPaginas];
    if (paginasAtuais[currentPageIndex]) {
      paginasAtuais[currentPageIndex] = {
        ...paginasAtuais[currentPageIndex],
        titulo: cadernoTitulo,
        conteudo: cadernoConteudo,
        favoritado: cadernoFavoritado,
      };
    }

    const anteriorIndex = currentPageIndex - 1;
    setCadernoPaginas(paginasAtuais);
    setCurrentPageIndex(anteriorIndex);
    const antPag = paginasAtuais[anteriorIndex];
    setCadernoTitulo(antPag?.titulo || "");
    setCadernoConteudo(antPag?.conteudo || "");
    setCadernoFavoritado(Boolean(antPag?.favoritado));
    playPaperSound();
    salvarCadernosNoStorage(paginasAtuais);
  };

  const navegarProximo = () => {
    if (activeTab === "carta") return;
    if (!podeAvancarPagina) return;

    const paginasAtuais = [...cadernoPaginas];
    if (paginasAtuais[currentPageIndex]) {
      paginasAtuais[currentPageIndex] = {
        ...paginasAtuais[currentPageIndex],
        titulo: cadernoTitulo,
        conteudo: cadernoConteudo,
        favoritado: cadernoFavoritado,
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
      playPaperSound();
      salvarCadernosNoStorage(paginasAtuais);
    } else {
      const novaPagina: NotebookPage = {
        id: "pag-" + Date.now(),
        titulo: "",
        conteudo: "",
        dataFormatada: dataFormatada || "Hoje",
        favoritado: false,
        criadoEm: new Date().toISOString(),
      };

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

  const avancarParaProximaPaginaComTexto = (textoExcedente: string, textoAtualPreenchido?: string) => {
    playPaperSound();

    if (!activeNotebook) {
      setCadernoPromptNotice("Please create a journal first to save and advance to the next page.");
      setPendingSaveAfterCreation(true);
      setNotebookDrawerOpen(true);
      return;
    }

    const textoAtual = textoAtualPreenchido !== undefined ? textoAtualPreenchido : cadernoConteudo;
    const tituloAtual = cadernoTitulo;

    const paginasAtualizadas = [...cadernoPaginas];
    if (paginasAtualizadas[currentPageIndex]) {
      paginasAtualizadas[currentPageIndex] = {
        ...paginasAtualizadas[currentPageIndex],
        titulo: tituloAtual,
        conteudo: textoAtual,
        favoritado: cadernoFavoritado,
      };
    }

    if (currentPageIndex < paginasAtualizadas.length - 1) {
      const proximoIndex = currentPageIndex + 1;
      const proximaPag = paginasAtualizadas[proximoIndex];
      const textoFinalProxima = textoExcedente
        ? (proximaPag.conteudo ? textoExcedente + "\n" + proximaPag.conteudo : textoExcedente)
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

      salvarCadernosNoStorage(paginasAtualizadas);
    } else {
      const novaPagina: NotebookPage = {
        id: "pag-" + Date.now(),
        titulo: "",
        conteudo: textoExcedente,
        dataFormatada: dataFormatada || "Today",
        favoritado: false,
        criadoEm: new Date().toISOString(),
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
        textareaRef.current.setSelectionRange(textoExcedente.length, textoExcedente.length);
      }
    }, 50);
  };

  const isSheetFull = (text: string, textareaEl?: HTMLTextAreaElement | null): boolean => {
    if (text.length >= MAX_CHARS_PER_PAGE) return true;
    const linhas = text.split("\n");
    if (linhas.length >= MAX_LINES_PER_PAGE) return true;
    if (textareaEl) {
      if (textareaEl.scrollHeight > textareaEl.clientHeight + 2) return true;
    }
    return false;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (activeTab !== "caderno") return;

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
      const charInserido = e.key === "Enter" ? "\n" : e.key.length === 1 ? e.key : "";
      avancarParaProximaPaginaComTexto(charInserido);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (activeTab !== "caderno") return;
    const pastedText = e.clipboardData.getData("text");
    if (!pastedText) return;

    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? cadernoConteudo.length;
    const end = textarea?.selectionEnd ?? cadernoConteudo.length;
    const textoProjetado = cadernoConteudo.slice(0, start) + pastedText + cadernoConteudo.slice(end);

    const linhas = textoProjetado.split("\n");
    if (linhas.length > MAX_LINES_PER_PAGE || textoProjetado.length > MAX_CHARS_PER_PAGE) {
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

  const handleCadernoConteudoChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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

  const handleCartaConteudoChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCartaConteudo(e.target.value);
  };

  const handleKeyUp = () => {
    if (activeTab !== "caderno") return;
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

  const toggleFavoritoCarta = () => {
    playPaperSound();
    setCartaFavoritado(!cartaFavoritado);
  };

  const salvarPagina = async () => {
    if (activeTab === "caderno") {
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

      const tituloFinal = cadernoTitulo.trim() || `Memory of ${dataFormatada || "Today"}`;
      setCadernoTitulo(tituloFinal);

      const paginasAtualizadas = [...cadernoPaginas];
      if (paginasAtualizadas[currentPageIndex]) {
        paginasAtualizadas[currentPageIndex] = {
          ...paginasAtualizadas[currentPageIndex],
          titulo: tituloFinal,
          conteudo: cadernoConteudo.trim(),
          favoritado: cadernoFavoritado,
        };
      }
      setCadernoPaginas(paginasAtualizadas);

      salvarCadernosNoStorage(paginasAtualizadas);

      setSalvando(false);
      setMensagemSucesso(`Page saved successfully in journal "${activeNotebook.nome}"!`);
      setTimeout(() => setMensagemSucesso(""), 3000);
      return;
    }

    if (activeTab === "carta") {
      if (!cartaConteudo.trim() && !cartaTitulo.trim()) {
        alert("Please write your letter before archiving.");
        return;
      }

      if (!activeLetterFolder) {
        setFolderPromptNotice("You must create a folder before filing this letter.");
        setPendingSaveAfterCreation(true);
        setFolderDrawerOpen(true);
        playPaperSound();
        return;
      }

      const limiteCartas = isPro ? 30 : 10;
      let totalCartasLocais = 0;
      try {
        const existente = JSON.parse(window.localStorage.getItem(SAVED_ENTRIES_KEY) || "[]");
        totalCartasLocais = existente.filter((e: any) => e.selo_carta || e.humor !== "reflexao").length;
      } catch {}

      if (totalCartasLocais >= limiteCartas) {
        alert(
          isPro
            ? `You have reached the limit of ${limiteCartas} archived letters on the Premium Plan.`
            : `You have reached the limit of ${limiteCartas} letters on the Standard Plan. Join Pro Club to write up to 30 letters!`
        );
        return;
      }

      setSalvando(true);
      playPaperSound();

      const tituloFinal = cartaTitulo.trim() || `Letter: ${cartaSelo.label}`;

      try {
        const existente = JSON.parse(window.localStorage.getItem(SAVED_ENTRIES_KEY) || "[]");
        const novaEntrada: JournalEntry = {
          id: "entry-" + Date.now(),
          titulo: tituloFinal,
          conteudo: cartaConteudo.trim(),
          humor: cartaSelo.id,
          data_formatada: dataFormatada || "Today",
          criado_em: new Date().toISOString(),
          tipo_papel: sheetBgId,
          favoritado: cartaFavoritado,
          selo_carta: cartaSelo.label,
          pasta_id: activeLetterFolder?.id,
          pasta_nome: activeLetterFolder?.nome,
        };
        window.localStorage.setItem(SAVED_ENTRIES_KEY, JSON.stringify([novaEntrada, ...existente]));
      } catch {}

      try {
        await api.cartas.enviar({
          titulo: tituloFinal,
          conteudo: cartaConteudo.trim(),
          remetente_anonimo: user?.nome || "Correspondent",
          categoria: cartaSelo.id,
          tipo_papel: sheetBgId,
          data_carta: dataFormatada,
        });
      } catch (err: any) {
        if (err?.error && err?.isLimitReached) {
          alert(err.error);
        }
      }

      window.dispatchEvent(new Event(JOURNAL_UPDATED_EVENT));

      setCartaTitulo("");
      setCartaConteudo("");
      setCartaFavoritado(false);

      setSalvando(false);
      setMensagemSucesso(`Letter archived successfully in folder "${activeLetterFolder.nome}"!`);
      setTimeout(() => setMensagemSucesso(""), 3200);
    }
  };

  const selecionarCaderno = (nb: Notebook) => {
    if (activeNotebook && activeNotebook.id !== nb.id) {
      salvarCadernoAtualNoStorage();
    }

    setActiveNotebookId(nb.id);
    try {
      window.localStorage.setItem(ACTIVE_NOTEBOOK_ID_KEY, nb.id);
    } catch {}

    const paginas = nb.paginas && nb.paginas.length > 0
      ? nb.paginas
      : [
          {
            id: "pag-" + Date.now(),
            titulo: "",
            conteudo: "",
            dataFormatada: dataFormatada || "Today",
            favoritado: false,
            criadoEm: new Date().toISOString(),
          },
        ];

    setCadernoPaginas(paginas);
    setCurrentPageIndex(0);
    setCadernoTitulo(paginas[0]?.titulo || "");
    setCadernoConteudo(paginas[0]?.conteudo || "");
    setCadernoFavoritado(Boolean(paginas[0]?.favoritado));

    setNotebookDrawerOpen(false);
    playPaperSound();
  };

  // REGRA DE NOVO CADERNO:
  // Ao já estar em um caderno e criar um novo:
  // 1. Tudo o que já estava escrito na tela é salvo no caderno antigo.
  // 2. Quando é criado um caderno novo, a página vem em branco, sem nada escrito,
  //    de forma em que NADA é salvo no caderno novo!
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

    // 1. Save whatever was written on screen to the old journal (written pages only)
    let notebooksAtualizados = [...notebooks];
    if (activeNotebook) {
      notebooksAtualizados = notebooksAtualizados.map((nb) => {
        if (nb.id === activeNotebook.id) {
          const paginasAtualizadas = [...cadernoPaginas];
          if (paginasAtualizadas[currentPageIndex]) {
            paginasAtualizadas[currentPageIndex] = {
              ...paginasAtualizadas[currentPageIndex],
              titulo: cadernoTitulo,
              conteudo: cadernoConteudo,
              favoritado: cadernoFavoritado,
            };
          }
          const paginasEscritas = paginasAtualizadas.filter(
            (p) => (p.conteudo && p.conteudo.trim().length > 0) || (p.titulo && p.titulo.trim().length > 0)
          );
          return {
            ...nb,
            paginas: paginasEscritas,
          };
        }
        return nb;
      });
    }

    // 2. Create the new empty journal with chosen cover color
    const novoCaderno: Notebook = {
      id: "caderno-" + Date.now(),
      nome: newNotebookTitle.trim(),
      corCapa: newNotebookCover,
      paginas: [],
    };

    const listaFinal = [...notebooksAtualizados, novoCaderno];
    setNotebooks(listaFinal);

    try {
      window.localStorage.setItem(NOTEBOOKS_STORAGE_KEY, JSON.stringify(listaFinal));
      window.localStorage.setItem(ACTIVE_NOTEBOOK_ID_KEY, novoCaderno.id);
    } catch {}

    // 3. Set the new journal active with a fresh blank page
    setActiveNotebookId(novoCaderno.id);
    setCurrentPageIndex(0);
    setCadernoPaginas([
      {
        id: "pag-" + Date.now(),
        titulo: "",
        conteudo: "",
        dataFormatada: dataFormatada || "Today",
        favoritado: false,
        criadoEm: new Date().toISOString(),
      },
    ]);
    setCadernoTitulo("");
    setCadernoConteudo("");
    setCadernoFavoritado(false);

    setNewNotebookTitle("");
    setNewNotebookCover("marrom");
    setNotebookDrawerOpen(false);
    setCadernoPromptNotice(null);
    setPendingSaveAfterCreation(false);
    playPaperSound();

    window.dispatchEvent(new Event(JOURNAL_UPDATED_EVENT));
    setMensagemSucesso(`Journal "${novoCaderno.nome}" created with a blank page!`);
    setTimeout(() => setMensagemSucesso(""), 3000);
  };

  const criarNovaPasta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderTitle.trim()) return;

    const limitePastas = isPro ? 10 : 3;
    if (letterFolders.length >= limitePastas) {
      alert(
        isPro
          ? `You have reached the limit of ${limitePastas} folders on the Premium Plan.`
          : `You have reached the limit of ${limitePastas} folders on the Standard Plan. Join Pro Club to have up to 10 folders!`
      );
      return;
    }

    const chosenTheme = getFolderTheme(newFolderColor);

    const nova: LetterFolder = {
      id: "pasta-" + Date.now(),
      nome: newFolderTitle.trim(),
      cor: chosenTheme.corHex,
      criadoEm: new Date().toISOString(),
    };

    const atualizadas = [...letterFolders, nova];
    setLetterFolders(atualizadas);
    setActiveLetterFolderId(nova.id);
    try {
      window.localStorage.setItem(LETTER_FOLDERS_STORAGE_KEY, JSON.stringify(atualizadas));
      window.localStorage.setItem(ACTIVE_LETTER_FOLDER_ID_KEY, nova.id);
    } catch {}

    if (pendingSaveAfterCreation && activeTab === "carta") {
      const tituloFinal = cartaTitulo.trim() || `Letter: ${cartaSelo.label}`;
      try {
        const existente = JSON.parse(window.localStorage.getItem(SAVED_ENTRIES_KEY) || "[]");
        const novaEntrada: JournalEntry = {
          id: "entry-" + Date.now(),
          titulo: tituloFinal,
          conteudo: cartaConteudo.trim(),
          humor: cartaSelo.id,
          data_formatada: dataFormatada || "Today",
          criado_em: new Date().toISOString(),
          tipo_papel: sheetBgId,
          favoritado: cartaFavoritado,
          selo_carta: cartaSelo.label,
          pasta_id: nova.id,
          pasta_nome: nova.nome,
        };
        window.localStorage.setItem(SAVED_ENTRIES_KEY, JSON.stringify([novaEntrada, ...existente]));
      } catch {}

      try {
        api.cartas.enviar({
          titulo: tituloFinal,
          conteudo: cartaConteudo.trim(),
          remetente_anonimo: user?.nome || "Correspondent",
          categoria: cartaSelo.id,
          tipo_papel: sheetBgId,
          data_carta: dataFormatada,
        });
      } catch {}

      setMensagemSucesso(`Folder "${nova.nome}" created and letter archived successfully!`);
      setTimeout(() => setMensagemSucesso(""), 3500);
      setPendingSaveAfterCreation(false);
      setFolderPromptNotice(null);
    }

    setNewFolderTitle("");
    setNewFolderColor("marrom");
    setFolderDrawerOpen(false);
    playPaperSound();
    window.dispatchEvent(new Event(JOURNAL_UPDATED_EVENT));
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

  const getFontFamily = () => {
    const found = FONT_OPTIONS.find((f) => f.id === fontFamilyId);
    return found ? found.styleFamily : "'Caveat', cursive";
  };

  const renderCustomizationMenu = (isInFocus = false) => (
    <div className={`vintage-menu-wrapper ${isInFocus ? "is-focus-mode" : ""}`} ref={menuRef}>
      <button
        type="button"
        className={`vintage-menu-btn ${isInFocus ? "is-focus-mode" : ""}`}
        onClick={() => setCustomMenuOpen(!customMenuOpen)}
        aria-expanded={customMenuOpen}
        title="Customize paper, ink, and calligraphy"
      >
        <span>Menu</span>
        <span className="menu-caret">▾</span>
      </button>

      <AnimatePresence>
        {customMenuOpen && (
          <motion.div
            className={`floating-customization-menu ${isInFocus ? "is-focus-mode" : ""}`}
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
                    className={`paper-swatch ${sheetBgId === paper.id ? "active" : ""}`}
                    style={{ backgroundColor: paper.color }}
                    onClick={() => {
                      setSheetBgId(paper.id);
                      setSheetBgColor(paper.color);
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
                    className={`ink-swatch ${inkColorId === ink.id ? "active" : ""}`}
                    style={{ backgroundColor: ink.color }}
                    onClick={() => {
                      setInkColorId(ink.id);
                      setInkColor(ink.color);
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
                    className={`font-choice-btn ${fontFamilyId === font.id ? "active" : ""}`}
                    style={{ fontFamily: font.styleFamily }}
                    onClick={() => setFontFamilyId(font.id)}
                  >
                    <span>{font.name}</span>
                    {fontFamilyId === font.id && <span className="font-check">✓</span>}
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
      aria-label="Writing Desk and Correspondence"
    >
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

      <div className={`writing-desk-container ${activeTab === "carta" ? "is-mode-carta" : ""}`}>
        {/* Left Column: Notebook / Seals / Save Button */}
        <div className="desk-left-col">
          {activeTab === "caderno" ? (
            <div className="caderno-left-stack">
              {activeNotebook ? (
                (() => {
                  const theme = getNotebookTheme(activeNotebook.corCapa);
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
                      title="Click to switch or create new journals"
                    >
                      <div
                        className="leather-notebook-ribbon"
                        aria-hidden="true"
                        style={{ backgroundColor: theme.ribbonColor }}
                      />
                      <span className="leather-notebook-tag">RECORD VOLUME</span>
                      <span className="leather-notebook-title">{activeNotebook.nome}</span>
                      <span className="leather-notebook-author">{user?.nome || "PERSONAL ARCHIVE"}</span>
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
                  title="Click to create your first volume"
                >
                  <div className="leather-notebook-ribbon" aria-hidden="true" />
                  <span className="leather-notebook-tag">EMPTY SHELF</span>
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
                title="Activate Focus Mode (dark screen, total focus on paper and menu)"
                aria-label="Activate Focus Mode"
              >
                <EyeIcon className="focus-mode-eye-icon" />
                <span>FOCUS MODE</span>
              </button>
            </div>
          ) : (
            <div className="carta-left-column-inner">
              {activeLetterFolder ? (() => {
                const folderTheme = getFolderTheme(activeLetterFolder.cor);
                return (
                  <div
                    className={`postal-folder-selector-card postal-folder-color--${folderTheme.id}`}
                    onClick={() => {
                      setFolderPromptNotice(null);
                      setFolderDrawerOpen(true);
                    }}
                    role="button"
                    tabIndex={0}
                    title="Click to choose a folder for this letter or create a new folder"
                  >
                    <div className="postal-folder-selector-top">
                      <span className="postal-folder-tag">FILE IN FOLDER</span>
                      <span className="postal-folder-change-badge">Change ▾</span>
                    </div>
                    <div className="postal-folder-title-row">
                      <div className="postal-folder-img-frame" aria-hidden="true">
                        <img
                          src={folderTheme.imagem}
                          alt={activeLetterFolder.nome}
                          className="postal-folder-svg-img"
                        />
                      </div>
                      <div className="postal-folder-meta">
                        <span className="postal-folder-name" title={activeLetterFolder.nome}>
                          {activeLetterFolder.nome}
                        </span>
                        <span className="postal-folder-theme-tag">
                          {folderTheme.nome} · {folderTheme.etiqueta}
                        </span>
                      </div>
                    </div>
                    <div className="postal-folder-quota-line">
                      {letterFolders.length}/{isPro ? 10 : 3} folders created ({isPro ? "Premium" : "Standard"})
                    </div>
                  </div>
                );
              })() : (
                <div
                  className="postal-folder-selector-card is-empty-state"
                  onClick={() => {
                    setFolderPromptNotice(null);
                    setFolderDrawerOpen(true);
                  }}
                  role="button"
                  tabIndex={0}
                  title="Click to create your first postal folder"
                >
                  <div className="postal-folder-selector-top">
                    <span className="postal-folder-tag">POSTAL ARCHIVE</span>
                    <span className="postal-folder-change-badge">+ Create</span>
                  </div>
                  <div className="postal-folder-title-row">
                    <div className="postal-folder-img-frame is-empty" aria-hidden="true">
                      <img
                        src="/images/pastas/pasta-marrom.svg"
                        alt="Create folder"
                        className="postal-folder-svg-img is-ghost"
                      />
                    </div>
                    <div className="postal-folder-meta">
                      <span className="postal-folder-name">+ Create Postal Folder</span>
                      <span className="postal-folder-theme-tag">Physical letter folder</span>
                    </div>
                  </div>
                  <div className="postal-folder-quota-line">
                    0/{isPro ? 10 : 3} folders created ({isPro ? "Premium" : "Standard"})
                  </div>
                </div>
              )}

              <div className="postal-seals-card">
                <div className="postal-seals-header">
                  <span>POSTAL ARCHIVE</span>
                  <small>Sober classification</small>
                </div>
                <div className="postal-seals-grid">
                  {SEAL_OPTIONS.map((seal) => (
                    <button
                      key={seal.id}
                      type="button"
                      className={`seal-choice-btn ${cartaSelo.id === seal.id ? "selected" : ""}`}
                      style={{ "--seal-color": seal.color } as any}
                      onClick={() => {
                        setCartaSelo(seal);
                        playPaperSound();
                      }}
                      title={`Seal of ${seal.label}`}
                    >
                      <span className="seal-choice-code">{seal.code}</span>
                      <span className="seal-choice-label">{seal.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="desk-left-bottom">
            <button
              type="button"
              className="sober-save-btn"
              onClick={salvarPagina}
              disabled={salvando}
              title={activeTab === "caderno" ? "Save page in journal" : "Save letter in selected folder"}
            >
              {salvando ? "SAVING..." : (activeTab === "carta" ? "SAVE LETTER" : "SAVE JOURNAL PAGE")}
            </button>
          </div>
        </div>

        {/* Center Column: Top Tabs + Ruled / Letter Paper */}
        <div className="desk-center-col">
          <div className="notebook-tabs-container">
            <button
              type="button"
              className={`notebook-tab notebook-tab--caderno ${activeTab === "caderno" ? "active" : ""}`}
              onClick={() => mudarAba("caderno")}
            >
              Journal
            </button>
            <button
              type="button"
              className={`notebook-tab notebook-tab--carta ${activeTab === "carta" ? "active" : ""}`}
              onClick={() => mudarAba("carta")}
            >
              Letter
            </button>
          </div>

          <div className="sheet-stage-wrapper">
            <button
              type="button"
              className="sheet-nav-arrow sheet-nav-arrow--left"
              onClick={navegarAnterior}
              disabled={activeTab === "carta" || currentPageIndex === 0}
              title={activeTab === "carta" ? "Single correspondence sheet" : "Previous page (←)"}
              aria-label="Previous page"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <motion.div
              key={activeTab}
              className={`writing-sheet-card ${activeTab === "caderno" ? "mode-caderno" : "mode-carta"}`}
              style={{
                backgroundColor: sheetBgColor,
                color: inkColor,
                fontFamily: getFontFamily(),
              }}
              initial={{ opacity: 0.88, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
            >
              {activeTab === "caderno" ? (
                <div className="caderno-content-inner">
                  <div className="caderno-date-line">
                    <span>{dataFormatada || "Today"}</span>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      {isSheetFull(cadernoConteudo, textareaRef.current) && (
                        <span style={{ fontSize: "10px", color: "var(--color-red-sands, #ad5b30)", fontWeight: 700, letterSpacing: "0.08em" }}>
                          SHEET FULL
                        </span>
                      )}
                      {cadernoPaginas.length > 1 && (
                        <small className="caderno-page-counter">
                          page {currentPageIndex + 1} of {cadernoPaginas.length}
                        </small>
                      )}
                    </div>
                  </div>

                  <input
                    type="text"
                    className="caderno-title-input"
                    value={cadernoTitulo}
                    onChange={(e) => handleCadernoTituloChange(e.target.value)}
                    placeholder="(Optional title of memory)"
                  />

                  <textarea
                    ref={textareaRef}
                    className="caderno-textarea-ruled"
                    value={cadernoConteudo}
                    onChange={handleCadernoConteudoChange}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    onKeyUp={handleKeyUp}
                    placeholder="Write your words here..."
                    rows={MAX_LINES_PER_PAGE}
                  />

                  <div className="caderno-bottom-corner">
                    <motion.button
                      type="button"
                      className={`classic-stamp-favorite ${cadernoFavoritado ? "is-favorited" : ""}`}
                      onClick={toggleFavoritoCaderno}
                      whileTap={{ scale: 0.95 }}
                      title="Stamp page as favorite"
                    >
                      {cadernoFavoritado ? "FAVORITED ♥" : "FAVORITE ♥"}
                    </motion.button>
                  </div>
                </div>
              ) : (
                <div className="carta-content-inner">
                  <div className="affixed-postage-stamp" style={{ "--stamp-color": cartaSelo.color } as any}>
                    <div className="stamp-perforations">
                      <span className="stamp-symbol">{cartaSelo.code}</span>
                      <span className="stamp-text">{cartaSelo.label}</span>
                      <span className="stamp-denomination">US • ARCHIVE</span>
                    </div>
                    <div className="postmark-circle" aria-hidden="true">
                      <span>BETWEEN LETTERS</span>
                      <small>HISTORICAL MAIL</small>
                    </div>
                  </div>

                  <div className="carta-top-meta">
                    <span className="carta-date">{dataFormatada}</span>
                    <span className="carta-sentiment-badge">Classification: {cartaSelo.label}</span>
                  </div>

                  <input
                    type="text"
                    className="carta-recipient-input"
                    value={cartaTitulo}
                    onChange={(e) => setCartaTitulo(e.target.value)}
                    placeholder="To: (or formal title of correspondence)"
                  />

                  <textarea
                    className="carta-textarea-unruled"
                    value={cartaConteudo}
                    onChange={handleCartaConteudoChange}
                    placeholder="Write your letter here..."
                    rows={12}
                  />

                  <div className="carta-footer-meta">
                    <span className="carta-seal-status">
                      Postal seal: <b>{cartaSelo.label}</b>
                    </span>
                    <motion.button
                      type="button"
                      className={`classic-stamp-favorite ${cartaFavoritado ? "is-favorited" : ""}`}
                      onClick={toggleFavoritoCarta}
                      whileTap={{ scale: 0.95 }}
                      title="Stamp letter as favorite"
                    >
                      {cartaFavoritado ? "FAVORITED ♥" : "FAVORITE ♥"}
                    </motion.button>
                  </div>
                </div>
              )}
            </motion.div>

            <button
              type="button"
              className="sheet-nav-arrow sheet-nav-arrow--right"
              onClick={navegarProximo}
              disabled={activeTab === "carta" || !podeAvancarPagina}
              title={
                activeTab === "carta"
                  ? "Single correspondence sheet"
                  : podeAvancarPagina
                  ? "Next page (→)"
                  : "You can advance up to 3 blank pages after a written page. Write something on this page to advance further."
              }
              aria-label="Next page"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Right Column: Menu, Pull Inspiration, Pinned Theme */}
        <div className="desk-right-col">
          <div className="desk-right-tools">
            {!modoFoco && renderCustomizationMenu(false)}

            <button
              type="button"
              className="inspire-trigger-btn"
              onClick={sortearInspiracao}
              title="Pull an inspiring theme from the archive"
            >
              <span>Pull Inspiration</span>
            </button>

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

      {/* Notebook Drawer */}
      <AnimatePresence>
        {notebookDrawerOpen && (
          <div
            className="notebook-drawer-backdrop"
            onClick={() => {
              setNotebookDrawerOpen(false);
              setCadernoPromptNotice(null);
              setPendingSaveAfterCreation(false);
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
                }}
                title="Close"
              >
                ✕
              </button>
              <h3 className="drawer-title">Journal Shelf</h3>
              <p className="drawer-subtitle">
                Select a journal to write in or start a new record volume.
                <br />
                <span style={{ display: "inline-block", marginTop: "4px", fontSize: "11px", letterSpacing: "0.06em", color: "#8a6b2d", fontWeight: 700, textTransform: "uppercase" }}>
                  Quota: {notebooks.length}/{isPro ? 10 : 3} journals ({isPro ? "Premium Plan" : "Standard Plan"})
                </span>
              </p>

              {cadernoPromptNotice && (
                <div className="drawer-mandatory-alert">
                  <span className="drawer-alert-icon">⚠️</span>
                  <div className="drawer-alert-body">
                    <strong>Mandatory Creation:</strong>
                    <span>{cadernoPromptNotice}</span>
                  </div>
                </div>
              )}

              <div className="notebooks-list">
                {notebooks.length === 0 ? (
                  <div className="drawer-empty-state-hint">
                    <span className="empty-hint-title">No journals created yet.</span>
                    <p className="empty-hint-text">
                      Name your volume below to create it and archive your page safely.
                    </p>
                  </div>
                ) : (
                  notebooks.map((nb) => {
                    const theme = getNotebookTheme(nb.corCapa);
                    const totalPags = (nb.paginas || []).filter(
                      (p) => (p.conteudo && p.conteudo.trim().length > 0) || (p.titulo && p.titulo.trim().length > 0)
                    ).length;
                    return (
                      <div
                        key={nb.id}
                        className={`notebook-item-card ${activeNotebook?.id === nb.id ? "is-active" : ""}`}
                        onClick={() => selecionarCaderno(nb)}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
                          <div>
                            <span className="notebook-item-name">{nb.nome}</span>
                            <div className="notebook-item-count">
                              {totalPags} {totalPags === 1 ? "page written" : "pages written"}
                            </div>
                          </div>
                        </div>
                        {activeNotebook?.id === nb.id && (
                          <span style={{ color: "var(--color-pollen, #cfa96f)", fontWeight: 700, fontSize: "12px" }}>✓ Active</span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={criarNovoCaderno} className="new-notebook-form">
                <label className="new-notebook-label">JOURNAL TITLE</label>
                <input
                  type="text"
                  className="new-notebook-input"
                  placeholder="Name of new volume (e.g., Secret Diary, Memoirs)..."
                  value={newNotebookTitle}
                  onChange={(e) => setNewNotebookTitle(e.target.value)}
                  maxLength={50}
                  autoFocus
                />

                <label className="new-notebook-label" style={{ marginTop: "14px" }}>
                  CHOOSE COVER COLOR
                </label>
                <div className="notebook-color-picker-grid">
                  {NOTEBOOK_COLOR_OPTIONS.map((opt) => {
                    const isSelected = newNotebookCover === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        className={`notebook-color-option-card ${isSelected ? "is-selected" : ""}`}
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
                          {isSelected && <span className="notebook-color-check-badge">✓</span>}
                        </div>
                        <span className="notebook-color-opt-name">{opt.nome}</span>
                        <small className="notebook-color-opt-sub">{opt.etiqueta}</small>
                      </button>
                    );
                  })}
                </div>

                <button type="submit" className="new-notebook-btn" style={{ marginTop: "14px" }}>
                  + Create Journal
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Folder Drawer */}
      <AnimatePresence>
        {folderDrawerOpen && (
          <div
            className="notebook-drawer-backdrop"
            onClick={() => {
              setFolderDrawerOpen(false);
              setFolderPromptNotice(null);
              setPendingSaveAfterCreation(false);
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
                  setFolderDrawerOpen(false);
                  setFolderPromptNotice(null);
                  setPendingSaveAfterCreation(false);
                }}
                title="Close"
              >
                ✕
              </button>
              <h3 className="drawer-title">Correspondence Folders</h3>
              <p className="drawer-subtitle">
                Select which folder to file your letters in or create a new physical folder.
                <br />
                <span style={{ display: "inline-block", marginTop: "4px", fontSize: "11px", letterSpacing: "0.06em", color: "var(--color-pollen, #cfa96f)", fontWeight: 700, textTransform: "uppercase" }}>
                  Quota: {letterFolders.length}/{isPro ? 10 : 3} folders ({isPro ? "Premium Plan" : "Standard Plan"})
                </span>
              </p>

              {folderPromptNotice && (
                <div className="drawer-mandatory-alert">
                  <span className="drawer-alert-icon">⚠️</span>
                  <div className="drawer-alert-body">
                    <strong>Mandatory Creation:</strong>
                    <span>{folderPromptNotice}</span>
                  </div>
                </div>
              )}

              <div className="notebooks-list">
                {letterFolders.length === 0 ? (
                  <div className="drawer-empty-state-hint">
                    <span className="empty-hint-title">No folders created yet.</span>
                    <p className="empty-hint-text">
                      Name your folder below and choose a color to archive your letters safely.
                    </p>
                  </div>
                ) : (
                  letterFolders.map((fld) => {
                    const theme = getFolderTheme(fld.cor);
                    let countInFolder = 0;
                    try {
                      if (typeof window !== "undefined") {
                        const allEntries: JournalEntry[] = JSON.parse(window.localStorage.getItem(SAVED_ENTRIES_KEY) || "[]");
                        const defaultId = letterFolders[0]?.id;
                        countInFolder = allEntries.filter(
                          (l: JournalEntry) => l.pasta_id === fld.id || (!l.pasta_id && fld.id === defaultId)
                        ).length;
                      }
                    } catch {}

                    return (
                      <div
                        key={fld.id}
                        className={`notebook-item-card ${activeLetterFolder?.id === fld.id ? "is-active" : ""}`}
                        onClick={() => {
                          setActiveLetterFolderId(fld.id);
                          try {
                            window.localStorage.setItem(ACTIVE_LETTER_FOLDER_ID_KEY, fld.id);
                          } catch {}
                          setFolderDrawerOpen(false);
                          playPaperSound();
                          window.dispatchEvent(new Event(JOURNAL_UPDATED_EVENT));
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div className="mini-folder-thumb-box" aria-hidden="true">
                            <img
                              src={theme.imagem}
                              alt={fld.nome}
                              className="mini-folder-thumb-img"
                            />
                          </div>
                          <div>
                            <span className="notebook-item-name">{fld.nome}</span>
                            <div className="notebook-item-count">
                              {countInFolder} {countInFolder === 1 ? "letter archived" : "letters archived"} · {theme.nome}
                            </div>
                          </div>
                        </div>
                        {activeLetterFolder?.id === fld.id && (
                          <span style={{ color: "var(--color-pollen, #cfa96f)", fontWeight: 700, fontSize: "12px" }}>✓ Selected</span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={criarNovaPasta} className="new-notebook-form">
                <label className="new-notebook-label">FOLDER TITLE</label>
                <input
                  type="text"
                  className="new-notebook-input"
                  placeholder="Name of new folder (e.g., Confessions, Secrets)..."
                  value={newFolderTitle}
                  onChange={(e) => setNewFolderTitle(e.target.value)}
                  maxLength={40}
                  autoFocus
                />

                <label className="new-notebook-label" style={{ marginTop: "14px" }}>
                  CHOOSE FOLDER COLOR
                </label>
                <div className="notebook-color-picker-grid">
                  {FOLDER_COLOR_OPTIONS.map((opt) => {
                    const isSelected = newFolderColor === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        className={`notebook-color-option-card ${isSelected ? "is-selected" : ""}`}
                        onClick={() => {
                          setNewFolderColor(opt.id);
                          playPaperSound();
                        }}
                      >
                        <div
                          className="folder-color-swatch-box"
                          style={{
                            background: opt.cardGradient,
                            borderColor: opt.cardBorder,
                          }}
                        >
                          <img
                            src={opt.imagem}
                            alt={opt.nome}
                            className="swatch-folder-img"
                          />
                          {isSelected && <span className="notebook-color-check-badge">✓</span>}
                        </div>
                        <span className="notebook-color-opt-name">{opt.nome}</span>
                        <small className="notebook-color-opt-sub">{opt.etiqueta}</small>
                      </button>
                    );
                  })}
                </div>

                <button type="submit" className="new-notebook-btn" style={{ marginTop: "14px" }}>
                  + Create Folder
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Writing Inspiration Modal */}
      <AnimatePresence>
        {inspiracaoModal && cartaInspiracao && (
          <div className="inspiration-modal-backdrop" onClick={() => setInspiracaoModal(false)}>
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
                <span className="excerpt-label">Excerpt from “{cartaInspiracao.title}”:</span>
                <blockquote>“{cartaInspiracao.excerpt}”</blockquote>
                <span className="excerpt-author">— {cartaInspiracao.sender}</span>
              </div>

              <div className="inspiration-modal-actions">
                <button
                  type="button"
                  className="btn-shuffle-inspire"
                  onClick={sortearInspiracao}
                >
                  Pull another letter
                </button>

                <button
                  type="button"
                  className="primary-cta"
                  onClick={aplicarInspiracao}
                >
                  <span>Write about this theme</span>
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
