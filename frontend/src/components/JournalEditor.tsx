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

// Limite exato de linhas visíveis por folha (23 linhas pautadas no textarea + 1 para cabeçalho = 24 linhas)
const MAX_LINES_PER_PAGE = 23;
// Limite máximo de caracteres físicos que cabem sem transbordar o box da página
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

export interface PostalSeal {
  id: string;
  label: string;
  code: string;
  color: string;
  postmark: string;
}

// Selos postais sóbrios de arquivo (tons de vinho, sépia e azul-noite)
const SEAL_OPTIONS: PostalSeal[] = [
  { id: "amor", label: "Amor", code: "I. AM", color: "#8B1E1E", postmark: "CORREIO AFETIVO" },
  { id: "saudade", label: "Saudade", code: "II. SD", color: "#1C2A39", postmark: "REMETENTE DISTANTE" },
  { id: "desabafo", label: "Desabafo", code: "III. DB", color: "#4A3E31", postmark: "CONFISSÃO LIVRE" },
  { id: "nunca-enviada", label: "Não Enviada", code: "IV. NE", color: "#2B3A2E", postmark: "SEM ENDEREÇO" },
  { id: "silencio", label: "Silêncio", code: "V. SL", color: "#3D3935", postmark: "TEMPO SILENCIOSO" },
  { id: "historica", label: "Histórica", code: "VI. HS", color: "#6A5432", postmark: "ARQUIVO PERMANENTE" },
];

const PAPER_OPTIONS = [
  { id: "marfim", name: "Algodão & Marfim", color: "#FCFBF7" },
  { id: "pergaminho", name: "Pergaminho Suave", color: "#F7F3EA" },
  { id: "kraft", name: "Linho Cru Nobre", color: "#EFE8DA" },
  { id: "branco", name: "Papel de Carta Clássico", color: "#FAF9F5" },
];

const INK_OPTIONS = [
  { id: "nanquim", name: "Nanquim Suave", color: "#262626" },
  { id: "azul-noite", name: "Azul-Noite Profundo", color: "#1C2A39" },
  { id: "sepia", name: "Sépia de Arquivo", color: "#4A3E31" },
  { id: "grafite", name: "Grafite Sóbrio", color: "#3A3A3A" },
];

const FONT_OPTIONS = [
  { id: "caveat", name: "Caligrafia Tinteiro", styleFamily: "'Caveat', cursive" },
  { id: "literary", name: "Itálico Literário", styleFamily: "var(--literary-italic, 'EB Garamond', Georgia, serif)" },
  { id: "garamond", name: "Serifada Clássica", styleFamily: "var(--serif, 'EB Garamond', serif)" },
  { id: "typewriter", name: "Datilografia Histórica", styleFamily: "'Special Elite', monospace" },
];

const PROMPTS = [
  "Escreva sobre um detalhe do seu dia que ninguém além de você percebeu.",
  "Qual foi a última vez que você esperou por algo com o coração na boca?",
  "Se pudesse deixar um bilhete na janela para o seu 'eu' de cinco anos atrás, o que estaria escrito?",
  "Descreva o cheiro ou o som de um lugar que já foi casa para você.",
  "Existe alguma palavra que você engoliu recentemente e que merecia ter sido dita?",
  "O que você gostaria de esquecer devagar, sem pressa nem mágoa?",
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

export default function JournalEditor() {
  const { user, isPro } = useAuth();

  // Abas de Alternância: 'caderno' | 'carta'
  const [activeTab, setActiveTab] = useState<"caderno" | "carta">("caderno");

  // Estado dos Cadernos e Páginas
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [activeNotebookId, setActiveNotebookId] = useState<string>("default-caderno");
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [notebookDrawerOpen, setNotebookDrawerOpen] = useState(false);
  const [newNotebookTitle, setNewNotebookTitle] = useState("");

  // Conteúdo ativo (título opcional no topo em negrito)
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [dataFormatada, setDataFormatada] = useState("");
  const [favoritado, setFavoritado] = useState(false);

  // Modo Carta: Selo Selecionado
  const [cartaSelo, setCartaSelo] = useState<PostalSeal>(SEAL_OPTIONS[0]);

  // Modo Carta: Pastas de Correspondência (limite de 3 pastas no Normal, 10 no Pro)
  const [letterFolders, setLetterFolders] = useState<LetterFolder[]>([]);
  const [activeLetterFolderId, setActiveLetterFolderId] = useState<string>("pasta-principal");
  const [folderDrawerOpen, setFolderDrawerOpen] = useState(false);
  const [newFolderTitle, setNewFolderTitle] = useState("");

  const activeLetterFolder =
    letterFolders.find((f) => f.id === activeLetterFolderId) || letterFolders[0];

  // Tema Salvo/Fixado à direita (abaixo do botão de inspiração)
  const [temaSalvo, setTemaSalvo] = useState<string>("");

  // Menu de Personalização (Papel, Tinta, Fonte)
  const [customMenuOpen, setCustomMenuOpen] = useState(false);
  const [sheetBgId, setSheetBgId] = useState("marfim");
  const [sheetBgColor, setSheetBgColor] = useState("#FBF7EF");
  const [inkColorId, setInkColorId] = useState("nanquim");
  const [inkColor, setInkColor] = useState("#2B2B2B");
  const [fontFamilyId, setFontFamilyId] = useState("caveat");

  // Inspiração
  const [inspiracaoModal, setInspiracaoModal] = useState(false);
  const [cartaInspiracao, setCartaInspiracao] = useState<Letter | null>(null);
  const [promptTexto, setPromptTexto] = useState("");

  // Feedback & Salvamento
  const [salvando, setSalvando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState("");

  const menuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Data atual formatada por extenso em português
  useEffect(() => {
    const hoje = new Date();
    const opcoes: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    const dataExtenso = hoje.toLocaleDateString("pt-BR", opcoes);
    const dataCapitalizada = dataExtenso.charAt(0).toUpperCase() + dataExtenso.slice(1);
    setDataFormatada(dataCapitalizada);

    // Carrega tema fixado se existir no localStorage
    try {
      const temaSalvoStorage = window.localStorage.getItem(PINNED_THEME_STORAGE_KEY);
      if (temaSalvoStorage) setTemaSalvo(temaSalvoStorage);
    } catch {}
  }, []);

  // Fechar menu de personalização ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setCustomMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Inicialização dos Cadernos a partir do LocalStorage
  useEffect(() => {
    const dataInicial = "Sexta-feira, 23 de outubro de 2026";
    const initialNotebooks: Notebook[] = [
      {
        id: "default-caderno",
        nome: "Diário de Memórias",
        corCapa: "#3a221b",
        paginas: [
          {
            id: "pag-1",
            titulo: "",
            conteudo: "",
            dataFormatada: dataInicial,
            favoritado: false,
            criadoEm: new Date().toISOString(),
          },
        ],
      },
      {
        id: "caderno-noturno",
        nome: "Pensamentos Noturnos",
        corCapa: "#1d261e",
        paginas: [
          {
            id: "pag-noturna-1",
            titulo: "",
            conteudo: "Nas horas em que a cidade dorme, os sentimentos encontram espaço para respirar...",
            dataFormatada: dataInicial,
            favoritado: true,
            criadoEm: new Date().toISOString(),
          },
        ],
      },
    ];

    try {
      const stored = window.localStorage.getItem(NOTEBOOKS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setNotebooks(parsed);
          const savedActiveId = window.localStorage.getItem(ACTIVE_NOTEBOOK_ID_KEY);
          const targetActiveId = parsed.some((n: Notebook) => n.id === savedActiveId)
            ? (savedActiveId as string)
            : parsed[0].id;
          setActiveNotebookId(targetActiveId);

          const active = parsed.find((n: Notebook) => n.id === targetActiveId) || parsed[0];
          if (active && active.paginas && active.paginas[0]) {
            setTitulo(active.paginas[0].titulo || "");
            setConteudo(active.paginas[0].conteudo || "");
            setFavoritado(Boolean(active.paginas[0].favoritado));
          }
          return;
        }
      }
    } catch {}

    setNotebooks(initialNotebooks);
    setActiveNotebookId("default-caderno");

    // Inicialização das Pastas de Carta a partir do LocalStorage
    const initialFolders: LetterFolder[] = [
      { id: "pasta-principal", nome: "Correspondências", cor: "#5a3820", criadoEm: new Date().toISOString() },
    ];
    try {
      const storedFolders = window.localStorage.getItem(LETTER_FOLDERS_STORAGE_KEY);
      if (storedFolders) {
        const parsedFolders = JSON.parse(storedFolders);
        if (Array.isArray(parsedFolders) && parsedFolders.length > 0) {
          setLetterFolders(parsedFolders);
          const savedActiveFolderId = window.localStorage.getItem(ACTIVE_LETTER_FOLDER_ID_KEY);
          if (savedActiveFolderId && parsedFolders.some((f: LetterFolder) => f.id === savedActiveFolderId)) {
            setActiveLetterFolderId(savedActiveFolderId);
          } else {
            setActiveLetterFolderId(parsedFolders[0].id);
          }
          return;
        }
      }
    } catch {}

    setLetterFolders(initialFolders);
    setActiveLetterFolderId("pasta-principal");
  }, []);

  // Escutar evento global de "EDITAR" vindo da estante de leitura
  useEffect(() => {
    const handleEditRequest = (e: any) => {
      const { notebookId, pageIndex } = e.detail || {};
      if (!notebookId) return;

      setActiveTab("caderno");
      setActiveNotebookId(notebookId);

      const targetNb = notebooks.find((n) => n.id === notebookId);
      if (targetNb && targetNb.paginas) {
        const idx = typeof pageIndex === "number" && targetNb.paginas[pageIndex] ? pageIndex : 0;
        setCurrentPageIndex(idx);
        const pag = targetNb.paginas[idx];
        if (pag) {
          setTitulo(pag.titulo || "");
          setConteudo(pag.conteudo || "");
          setFavoritado(Boolean(pag.favoritado));
        }
      }

      // Rola suavemente até a mesa de escrita
      const deskElem = document.getElementById("mesa-de-escrita");
      if (deskElem) {
        deskElem.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      // Foca na folha após rolagem
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

  // Caderno ativo
  const activeNotebook =
    notebooks.find((n) => n.id === activeNotebookId) ||
    notebooks[0] || {
      id: "default-caderno",
      nome: "Diário de Memórias",
      corCapa: "#3a221b",
      paginas: [],
    };

  const paginasCaderno = activeNotebook.paginas || [];

  // Ao alternar página no caderno, carrega o conteúdo daquela página
  const carregarPagina = (index: number, nb: Notebook = activeNotebook) => {
    if (!nb.paginas || nb.paginas.length === 0) return;
    const pag = nb.paginas[index];
    if (pag) {
      setCurrentPageIndex(index);
      setTitulo(pag.titulo || "");
      setConteudo(pag.conteudo || "");
      setFavoritado(Boolean(pag.favoritado));
      playPaperSound();
    }
  };

  // Atualizar rascunho da página atual no caderno
  const atualizarRascunhoAtual = (novoTexto?: string, novoTitulo?: string, novoFav?: boolean) => {
    if (activeTab !== "caderno") return;
    const textoSalvar = novoTexto !== undefined ? novoTexto : conteudo;
    const tituloSalvar = novoTitulo !== undefined ? novoTitulo : titulo;
    const favSalvar = novoFav !== undefined ? novoFav : favoritado;

    const notebooksAtualizados = notebooks.map((nb) => {
      if (nb.id === activeNotebook.id) {
        const paginas = [...nb.paginas];
        if (paginas[currentPageIndex]) {
          paginas[currentPageIndex] = {
            ...paginas[currentPageIndex],
            titulo: tituloSalvar,
            conteudo: textoSalvar,
            favoritado: favSalvar,
          };
        }
        return { ...nb, paginas };
      }
      return nb;
    });

    setNotebooks(notebooksAtualizados);
    try {
      window.localStorage.setItem(NOTEBOOKS_STORAGE_KEY, JSON.stringify(notebooksAtualizados));
    } catch {}
  };

  // Avançar para a próxima página ou criar nova página automaticamente quando as linhas acabam
  // Salva automaticamente a página anterior sem necessidade de clicar em Salvar
  const avancarParaProximaPaginaComTexto = (textoExcedente: string, textoAtualPreenchido?: string) => {
    playPaperSound();

    const textoAtual = textoAtualPreenchido !== undefined ? textoAtualPreenchido : conteudo;
    const tituloAtual = titulo;

    if (currentPageIndex < paginasCaderno.length - 1) {
      // Já existe uma próxima página: salva a atual e avança
      const proximoIndex = currentPageIndex + 1;
      const proximaPag = paginasCaderno[proximoIndex];
      const textoFinalProxima = textoExcedente
        ? (proximaPag.conteudo ? textoExcedente + "\n" + proximaPag.conteudo : textoExcedente)
        : proximaPag.conteudo;

      const notebooksAtualizados = notebooks.map((nb) => {
        if (nb.id === activeNotebook.id) {
          const paginas = [...nb.paginas];
          // 1. Salva automaticamente a página anterior
          if (paginas[currentPageIndex]) {
            paginas[currentPageIndex] = {
              ...paginas[currentPageIndex],
              titulo: tituloAtual,
              conteudo: textoAtual,
              favoritado: favoritado,
            };
          }
          // 2. Prepara a próxima página
          paginas[proximoIndex] = {
            ...paginas[proximoIndex],
            conteudo: textoFinalProxima,
          };
          return { ...nb, paginas };
        }
        return nb;
      });

      setNotebooks(notebooksAtualizados);
      setCurrentPageIndex(proximoIndex);
      setTitulo(proximaPag.titulo || "");
      setConteudo(textoFinalProxima);
      setFavoritado(Boolean(proximaPag.favoritado));

      try {
        window.localStorage.setItem(NOTEBOOKS_STORAGE_KEY, JSON.stringify(notebooksAtualizados));
      } catch {}

      window.dispatchEvent(new Event(JOURNAL_UPDATED_EVENT));
      setMensagemSucesso("Página anterior salva automaticamente.");
      setTimeout(() => setMensagemSucesso(""), 2200);
    } else {
      // Cria uma nova página em branco automaticamente e continua nela
      const novaPagina: NotebookPage = {
        id: "pag-" + Date.now(),
        titulo: "",
        conteudo: textoExcedente,
        dataFormatada: dataFormatada || "Hoje",
        favoritado: false,
        criadoEm: new Date().toISOString(),
      };

      const notebooksAtualizados = notebooks.map((nb) => {
        if (nb.id === activeNotebook.id) {
          const paginas = [...nb.paginas];
          // 1. Salva automaticamente a página anterior
          if (paginas[currentPageIndex]) {
            paginas[currentPageIndex] = {
              ...paginas[currentPageIndex],
              titulo: tituloAtual,
              conteudo: textoAtual,
              favoritado: favoritado,
            };
          }
          return {
            ...nb,
            paginas: [...paginas, novaPagina],
          };
        }
        return nb;
      });

      setNotebooks(notebooksAtualizados);
      setCurrentPageIndex(paginasCaderno.length);
      setTitulo("");
      setConteudo(textoExcedente);
      setFavoritado(false);

      try {
        window.localStorage.setItem(NOTEBOOKS_STORAGE_KEY, JSON.stringify(notebooksAtualizados));
      } catch {}

      window.dispatchEvent(new Event(JOURNAL_UPDATED_EVENT));
      setMensagemSucesso("Página concluída salva automaticamente.");
      setTimeout(() => setMensagemSucesso(""), 2200);
    }

    // Foca o cursor no textarea da nova folha
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(textoExcedente.length, textoExcedente.length);
      }
    }, 50);
  };

  // Verifica se a folha do caderno atingiu a capacidade máxima física
  const isSheetFull = (text: string, textareaEl?: HTMLTextAreaElement | null): boolean => {
    if (text.length >= MAX_CHARS_PER_PAGE) return true;
    const linhas = text.split("\n");
    if (linhas.length >= MAX_LINES_PER_PAGE) return true;
    if (textareaEl) {
      if (textareaEl.scrollHeight > textareaEl.clientHeight + 2) return true;
    }
    return false;
  };

  // Bloqueio rigoroso ao esgotar a página:
  // Não permite inserir mais caracteres na folha cheia (apenas apagar com Backspace/Delete).
  // Ao digitar qualquer novo caractere em folha cheia, avança automaticamente para a próxima página com o caractere.
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

    // Se estiver apagando ou navegando, permite sempre sem restrição
    if (isDeleteKey || isNavKey || isShortcut) {
      return;
    }

    // Se há texto selecionado que será substituído, permite
    const textarea = textareaRef.current;
    if (textarea && textarea.selectionStart !== textarea.selectionEnd) {
      return;
    }

    // Verifica se a página atual já está no limite máximo de capacidade
    const folhaCheia = isSheetFull(conteudo, textarea);

    if (folhaCheia) {
      // Bloqueia a inserção de mais texto nesta folha cheia
      e.preventDefault();

      // Salva a folha atual e pula automaticamente para a próxima página com o caractere digitado
      const charInserido = e.key === "Enter" ? "\n" : e.key.length === 1 ? e.key : "";
      avancarParaProximaPaginaComTexto(charInserido);
    }
  };

  // Tratamento de colagem (paste) para não permitir transbordamento da folha
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (activeTab !== "caderno") return;
    const pastedText = e.clipboardData.getData("text");
    if (!pastedText) return;

    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? conteudo.length;
    const end = textarea?.selectionEnd ?? conteudo.length;
    const textoProjetado = conteudo.slice(0, start) + pastedText + conteudo.slice(end);

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

      setConteudo(textoQueCabe);
      atualizarRascunhoAtual(textoQueCabe);
      avancarParaProximaPaginaComTexto(textoExcedente);
    }
  };

  // Controle de digitação no caderno com paginação automática e corte rigoroso no limite
  const handleConteudoChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const novoTexto = e.target.value;

    if (activeTab === "caderno") {
      const linhas = novoTexto.split("\n");

      // Se excedeu o número de linhas da página
      if (linhas.length > MAX_LINES_PER_PAGE) {
        const linhasPaginaAtual = linhas.slice(0, MAX_LINES_PER_PAGE).join("\n");
        const linhasExcedentes = linhas.slice(MAX_LINES_PER_PAGE).join("\n");

        setConteudo(linhasPaginaAtual);
        atualizarRascunhoAtual(linhasPaginaAtual);
        avancarParaProximaPaginaComTexto(linhasExcedentes);
        return;
      }

      // Se excedeu a contagem física máxima de caracteres por página
      if (novoTexto.length > MAX_CHARS_PER_PAGE) {
        const textoPaginaAtual = novoTexto.slice(0, MAX_CHARS_PER_PAGE);
        const textoExcedente = novoTexto.slice(MAX_CHARS_PER_PAGE);

        setConteudo(textoPaginaAtual);
        atualizarRascunhoAtual(textoPaginaAtual);
        avancarParaProximaPaginaComTexto(textoExcedente);
        return;
      }
    }

    setConteudo(novoTexto);
    atualizarRascunhoAtual(novoTexto);
  };

  // Detecção de transbordamento de texto por scroll durante digitação contínua
  const handleKeyUp = () => {
    if (activeTab !== "caderno") return;
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Se o texto digitado ultrapassou a altura física das linhas da página
    if (textarea.scrollHeight > textarea.clientHeight + 2) {
      const texto = textarea.value;
      const palavras = texto.split(" ");
      if (palavras.length > 1) {
        const ultimaPalavra = palavras.pop() || "";
        const textoQueCabe = palavras.join(" ");

        setConteudo(textoQueCabe);
        atualizarRascunhoAtual(textoQueCabe);
        avancarParaProximaPaginaComTexto(ultimaPalavra);
      }
    }
  };

  // Navegação ← Página Anterior
  const navegarAnterior = () => {
    if (activeTab === "carta") return;
    if (currentPageIndex > 0) {
      atualizarRascunhoAtual();
      carregarPagina(currentPageIndex - 1);
    }
  };

  // Navegação → Próxima Página ou Nova Página em Branco
  const navegarProximo = () => {
    if (activeTab === "carta") return;
    atualizarRascunhoAtual();

    if (currentPageIndex < paginasCaderno.length - 1) {
      carregarPagina(currentPageIndex + 1);
    } else {
      avancarParaProximaPaginaComTexto("");
    }
  };

  // Alternar Favorito
  const toggleFavorito = () => {
    playPaperSound();
    const novoStatus = !favoritado;
    setFavoritado(novoStatus);
    atualizarRascunhoAtual(undefined, undefined, novoStatus);
  };

  // Salvar Página / Arquivar Correspondência
  const salvarPagina = async () => {
    if (!conteudo.trim() && !titulo.trim()) {
      alert("Escreva pelo menos algumas palavras antes de arquivar.");
      return;
    }

    // Regra de Negócio: Limite de cartas escritas (10 Normal vs 30 Premium)
    if (activeTab === "carta") {
      const limiteCartas = isPro ? 30 : 10;
      let totalCartasLocais = 0;
      try {
        const existente = JSON.parse(window.localStorage.getItem(SAVED_ENTRIES_KEY) || "[]");
        totalCartasLocais = existente.filter((e: any) => e.selo_carta || e.humor !== "reflexao").length;
      } catch {}

      if (totalCartasLocais >= limiteCartas) {
        alert(
          isPro
            ? `Você atingiu o limite máximo de ${limiteCartas} cartas escritas do Plano Premium.`
            : `Você atingiu o limite de ${limiteCartas} cartas do Plano Normal. Assine o Clube Premium para escrever e arquivar até 30 cartas!`
        );
        return;
      }
    }

    setSalvando(true);
    playPaperSound();

    const tituloFinal =
      titulo.trim() ||
      (activeTab === "caderno"
        ? `Memória de ${dataFormatada || "Hoje"}`
        : `Carta: ${cartaSelo.label}`);

    // 1. Salva no caderno ativo
    if (activeTab === "caderno") {
      atualizarRascunhoAtual(conteudo, tituloFinal, favoritado);
    }

    // 2. Registra na estante geral do diário
    try {
      const existente = JSON.parse(window.localStorage.getItem(SAVED_ENTRIES_KEY) || "[]");
      const novaEntrada: JournalEntry = {
        id: "entry-" + Date.now(),
        titulo: tituloFinal,
        conteudo: conteudo.trim(),
        humor: activeTab === "caderno" ? "reflexao" : cartaSelo.id,
        data_formatada: dataFormatada || "Hoje",
        criado_em: new Date().toISOString(),
        tipo_papel: sheetBgId,
        favoritado,
        caderno_origem: activeTab === "caderno" ? activeNotebook.nome : undefined,
        selo_carta: activeTab === "carta" ? cartaSelo.label : undefined,
        pasta_id: activeTab === "carta" ? (activeLetterFolder?.id || "pasta-principal") : undefined,
        pasta_nome: activeTab === "carta" ? (activeLetterFolder?.nome || "Correspondências") : undefined,
      };
      window.localStorage.setItem(SAVED_ENTRIES_KEY, JSON.stringify([novaEntrada, ...existente]));
    } catch {}

    // 3. Se autenticado, envia também para o backend MariaDB
    try {
      await api.cartas.enviar({
        titulo: tituloFinal,
        conteudo: conteudo.trim(),
        remetente_anonimo: user?.nome ? user.nome : activeNotebook.nome,
        categoria: activeTab === "carta" ? cartaSelo.id : "memorias",
        tipo_papel: sheetBgId,
        data_carta: dataFormatada,
      });
    } catch (err: any) {
      if (err?.error && err?.isLimitReached) {
        alert(err.error);
      }
    }

    window.dispatchEvent(new Event(JOURNAL_UPDATED_EVENT));

    setSalvando(false);
    setMensagemSucesso(
      activeTab === "caderno"
        ? `Página guardada com sucesso no ${activeNotebook.nome}!`
        : `Carta arquivada com sucesso na pasta "${activeLetterFolder?.nome || "Correspondências"}"!`
    );

    setTimeout(() => {
      setMensagemSucesso("");
    }, 3200);
  };

  // Alternar Caderno Ativo via Estante/Drawer
  const selecionarCaderno = (nb: Notebook) => {
    setActiveNotebookId(nb.id);
    setCurrentPageIndex(0);
    try {
      window.localStorage.setItem(ACTIVE_NOTEBOOK_ID_KEY, nb.id);
    } catch {}
    if (nb.paginas && nb.paginas[0]) {
      setTitulo(nb.paginas[0].titulo || "");
      setConteudo(nb.paginas[0].conteudo || "");
      setFavoritado(Boolean(nb.paginas[0].favoritado));
    } else {
      setTitulo("");
      setConteudo("");
      setFavoritado(false);
    }
    setNotebookDrawerOpen(false);
    playPaperSound();
  };

  // Criar Novo Caderno — Regra de Negócio: 3 Cadernos (Normal) vs 10 Cadernos (Premium)
  const criarNovoCaderno = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotebookTitle.trim()) return;

    const limiteCadernos = isPro ? 10 : 3;
    if (notebooks.length >= limiteCadernos) {
      alert(
        isPro
          ? `Você atingiu o limite máximo de ${limiteCadernos} cadernos do Plano Premium.`
          : `Você atingiu o limite de ${limiteCadernos} cadernos do Plano Normal. Assine o Clube Premium para ter até 10 cadernos!`
      );
      return;
    }

    const novo: Notebook = {
      id: "caderno-" + Date.now(),
      nome: newNotebookTitle.trim(),
      corCapa: "#2c1d18",
      paginas: [
        {
          id: "pag-" + Date.now(),
          titulo: "",
          conteudo: "",
          dataFormatada: dataFormatada || "Hoje",
          favoritado: false,
          criadoEm: new Date().toISOString(),
        },
      ],
    };

    const atualizados = [...notebooks, novo];
    setNotebooks(atualizados);
    try {
      window.localStorage.setItem(NOTEBOOKS_STORAGE_KEY, JSON.stringify(atualizados));
    } catch {}

    setNewNotebookTitle("");
    selecionarCaderno(novo);
  };

  // Criação de nova pasta de cartas (com limite equivalente ao de cadernos: 3 no Normal e 10 no Pro)
  const criarNovaPasta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderTitle.trim()) return;

    const limitePastas = isPro ? 10 : 3;
    if (letterFolders.length >= limitePastas) {
      alert(
        isPro
          ? `Você atingiu o limite de ${limitePastas} pastas do Plano Premium.`
          : `Você atingiu o limite de ${limitePastas} pastas do Plano Normal. Assine o Clube Premium para ter até 10 pastas!`
      );
      return;
    }

    const nova: LetterFolder = {
      id: "pasta-" + Date.now(),
      nome: newFolderTitle.trim(),
      cor: "#5a3820",
      criadoEm: new Date().toISOString(),
    };

    const atualizadas = [...letterFolders, nova];
    setLetterFolders(atualizadas);
    setActiveLetterFolderId(nova.id);
    try {
      window.localStorage.setItem(LETTER_FOLDERS_STORAGE_KEY, JSON.stringify(atualizadas));
      window.localStorage.setItem(ACTIVE_LETTER_FOLDER_ID_KEY, nova.id);
    } catch {}

    setNewFolderTitle("");
    setFolderDrawerOpen(false);
    playPaperSound();
    window.dispatchEvent(new Event(JOURNAL_UPDATED_EVENT));
  };

  // Sorteia carta e prompt de inspiração
  const sortearInspiracao = () => {
    const carta = letters[Math.floor(Math.random() * letters.length)];
    const prompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
    setCartaInspiracao(carta);
    setPromptTexto(prompt);
    setInspiracaoModal(true);
    playPaperSound();
  };

  // Ao clicar em "escrever sobre o tema", salva o tema à direita da tela, logo abaixo do botão
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

  return (
    <section className="writing-desk-wrap" id="mesa-de-escrita" aria-label="Mesa de Escrita e Correspondência">
      <div className={`writing-desk-container ${activeTab === "carta" ? "is-mode-carta" : ""}`}>
        {/* ============================================================ */}
        {/* COLUNA ESQUERDA: CADERNO 3D (OU SELOS) + BOTÃO SALVAR PÁGINA */}
        {/* ============================================================ */}
        <div className="desk-left-col">
          {activeTab === "caderno" ? (
            /* Modo Caderno: Lombada e Capa em Couro Nobre */
            <div
              className="leather-notebook-card"
              onClick={() => setNotebookDrawerOpen(true)}
              role="button"
              tabIndex={0}
              title="Clique para alternar ou criar novos cadernos"
            >
              <div className="leather-notebook-ribbon" aria-hidden="true" />
              <span className="leather-notebook-tag">TOMO DE REGISTRO</span>
              <span className="leather-notebook-title">{activeNotebook.nome}</span>
              <span className="leather-notebook-author">{user?.nome || "ARQUIVO PESSOAL"}</span>
            </div>
          ) : (
            /* Modo Carta: Suporte de Pasta Postal de Destino + Selos */
            <div className="carta-left-column-inner">
              <div
                className="postal-folder-selector-card"
                onClick={() => setFolderDrawerOpen(true)}
                role="button"
                tabIndex={0}
                title="Clique para escolher em qual pasta arquivar esta carta ou criar uma nova pasta"
              >
                <div className="postal-folder-selector-top">
                  <span className="postal-folder-tag">ARQUIVAR NA PASTA</span>
                  <span className="postal-folder-change-badge">Trocar ▾</span>
                </div>
                <div className="postal-folder-title-row">
                  <span className="postal-folder-icon" aria-hidden="true">📁</span>
                  <span className="postal-folder-name">{activeLetterFolder?.nome || "Correspondências"}</span>
                </div>
                <div className="postal-folder-quota-line">
                  {letterFolders.length}/{isPro ? 10 : 3} pastas criadas ({isPro ? "Premium" : "Normal"})
                </div>
              </div>

              <div className="postal-seals-card">
                <div className="postal-seals-header">
                  <span>ARQUIVO POSTAL</span>
                  <small>Classificação sóbria</small>
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
                      title={`Selo de ${seal.label}`}
                    >
                      <span className="seal-choice-code">{seal.code}</span>
                      <span className="seal-choice-label">{seal.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Botão Salvar na quina inferior esquerda (dinâmico entre Caderno e Carta) */}
          <div className="desk-left-bottom">
            <button
              type="button"
              className="sober-save-btn"
              onClick={salvarPagina}
              disabled={salvando}
              title={activeTab === "caderno" ? "Salvar página no caderno" : "Salvar carta na pasta selecionada"}
            >
              {salvando ? "SALVANDO..." : (activeTab === "carta" ? "SALVAR CARTA" : "SALVAR PÁGINA")}
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* COLUNA CENTRAL: ABAS DE TOPO + PALCO DA FOLHA COM SETAS ← →  */}
        {/* ============================================================ */}
        <div className="desk-center-col">
          {/* Abas no Topo da Folha */}
          <div className="notebook-tabs-container">
            <button
              type="button"
              className={`notebook-tab notebook-tab--caderno ${activeTab === "caderno" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("caderno");
                playPaperSound();
              }}
            >
              Caderno
            </button>
            <button
              type="button"
              className={`notebook-tab notebook-tab--carta ${activeTab === "carta" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("carta");
                playPaperSound();
              }}
            >
              Carta
            </button>
          </div>

          {/* Palco com Setas Flutuantes ← e → */}
          <div className="sheet-stage-wrapper">
            {/* Seta Esquerda ← */}
            <button
              type="button"
              className="sheet-nav-arrow sheet-nav-arrow--left"
              onClick={navegarAnterior}
              disabled={activeTab === "carta" || currentPageIndex === 0}
              title="Página anterior (←)"
              aria-label="Página anterior"
            >
              ←
            </button>

            {/* Folha Física Central (mais comprida e no tamanho de um caderno real) */}
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
                /* ======================================= */
                /* CONTEÚDO NO MODO CADERNO                */
                /* ======================================= */
                <div className="caderno-content-inner">
                  {/* Cabeçalho automático com data por extenso (ocupando exatamente a linha 1) */}
                  <div className="caderno-date-line">
                    <span>{dataFormatada || "Sexta-feira, 23 de outubro de 2026"}</span>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      {isSheetFull(conteudo, textareaRef.current) && (
                        <span style={{ fontSize: "10px", color: "#8b1e1e", fontWeight: 700, letterSpacing: "0.08em" }}>
                          FOLHA COMPLETA
                        </span>
                      )}
                      {paginasCaderno.length > 1 && (
                        <small className="caderno-page-counter">
                          página {currentPageIndex + 1} de {paginasCaderno.length}
                        </small>
                      )}
                    </div>
                  </div>

                  {/* Campo de Título opcional em negrito (ocupando exatamente a linha 2) */}
                  <input
                    type="text"
                    className="caderno-title-input"
                    value={titulo}
                    onChange={(e) => {
                      setTitulo(e.target.value);
                      atualizarRascunhoAtual(undefined, e.target.value);
                    }}
                    placeholder="(Título opcional)"
                  />

                  {/* Textarea onde o texto senta exatamente sobre as linhas da folha */}
                  <textarea
                    ref={textareaRef}
                    className="caderno-textarea-ruled"
                    value={conteudo}
                    onChange={handleConteudoChange}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    onKeyUp={handleKeyUp}
                    placeholder="Escreva aqui suas palavras..."
                    rows={MAX_LINES_PER_PAGE}
                  />

                  {/* Quina Inferior Direita: Ação sutil de carimbo FAVORITAR ♥ */}
                  <div className="caderno-bottom-corner">
                    <motion.button
                      type="button"
                      className={`classic-stamp-favorite ${favoritado ? "is-favorited" : ""}`}
                      onClick={toggleFavorito}
                      whileTap={{ scale: 0.95 }}
                      title="Marcar como favorita"
                    >
                      {favoritado ? "FAVORITADO ♥" : "FAVORITAR ♥"}
                    </motion.button>
                  </div>
                </div>
              ) : (
                /* ======================================= */
                /* CONTEÚDO NO MODO CARTA                  */
                /* ======================================= */
                <div className="carta-content-inner">
                  {/* Selo Postal de arquivo afixado na quina superior direita com carimbo postal sóbrio */}
                  <div className="affixed-postage-stamp" style={{ "--stamp-color": cartaSelo.color } as any}>
                    <div className="stamp-perforations">
                      <span className="stamp-symbol">{cartaSelo.code}</span>
                      <span className="stamp-text">{cartaSelo.label}</span>
                      <span className="stamp-denomination">BR • ARQUIVO</span>
                    </div>
                    <div className="postmark-circle" aria-hidden="true">
                      <span>ENTRE CARTAS</span>
                      <small>CORREIO HISTÓRICO</small>
                    </div>
                  </div>

                  <div className="carta-top-meta">
                    <span className="carta-date">{dataFormatada}</span>
                    <span className="carta-sentiment-badge">Classificação: {cartaSelo.label}</span>
                  </div>

                  <input
                    type="text"
                    className="carta-recipient-input"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Para: (ou título solene da correspondência)"
                  />

                  <textarea
                    className="carta-textarea-unruled"
                    value={conteudo}
                    onChange={(e) => setConteudo(e.target.value)}
                    placeholder="Escreva a sua carta aqui..."
                    rows={12}
                  />

                  <div className="carta-footer-meta">
                    <span className="carta-seal-status">
                      Selo postal: <b>{cartaSelo.label}</b>
                    </span>
                    <motion.button
                      type="button"
                      className={`classic-stamp-favorite ${favoritado ? "is-favorited" : ""}`}
                      onClick={toggleFavorito}
                      whileTap={{ scale: 0.95 }}
                      title="Marcar como favorita"
                    >
                      {favoritado ? "FAVORITADO ♥" : "FAVORITAR ♥"}
                    </motion.button>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Seta Direita → */}
            <button
              type="button"
              className="sheet-nav-arrow sheet-nav-arrow--right"
              onClick={navegarProximo}
              disabled={activeTab === "carta"}
              title={
                currentPageIndex === paginasCaderno.length - 1
                  ? "Avançar para uma nova página em branco (→)"
                  : "Próxima página (→)"
              }
              aria-label="Próxima página"
            >
              →
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* COLUNA DIREITA: MENU ▾, PUXAR INSPIRAÇÃO E TEMA SALVO        */}
        {/* ============================================================ */}
        <div className="desk-right-col">
          <div className="desk-right-tools">
            {/* Botão Superior Direito Menu ▾ */}
            <div className="vintage-menu-wrapper" ref={menuRef}>
              <button
                type="button"
                className="vintage-menu-btn"
                onClick={() => setCustomMenuOpen(!customMenuOpen)}
                aria-expanded={customMenuOpen}
              >
                <span>Menu</span>
                <span className="menu-caret">▾</span>
              </button>

              {/* PAINEL FLUTUANTE DE PERSONALIZAÇÃO VISUAL */}
              <AnimatePresence>
                {customMenuOpen && (
                  <motion.div
                    className="floating-customization-menu"
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.16 }}
                  >
                    {/* 1. Cor de Fundo da Folha */}
                    <div className="menu-group">
                      <span className="menu-group-title">Fundo da Folha</span>
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

                    {/* 2. Cor da Tinta / Letra */}
                    <div className="menu-group">
                      <span className="menu-group-title">Cor da Tinta</span>
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

                    {/* 3. Família da Fonte */}
                    <div className="menu-group">
                      <span className="menu-group-title">Caligrafia & Tipografia</span>
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

            {/* Botão de Puxar Inspiração (sem emoji) */}
            <button
              type="button"
              className="inspire-trigger-btn"
              onClick={sortearInspiracao}
              title="Puxar um tema inspirador do acervo"
            >
              <span>Puxar Inspiração</span>
            </button>

            {/* Tema Salvo/Fixado logo abaixo do botão (somente a frase) */}
            {temaSalvo && (
              <div className="pinned-theme-box">
                <div className="pinned-theme-top">
                  <span className="pinned-theme-label">TEMA DE HOJE</span>
                  <button
                    type="button"
                    className="pinned-theme-clear"
                    onClick={() => {
                      setTemaSalvo("");
                      try {
                        window.localStorage.removeItem(PINNED_THEME_STORAGE_KEY);
                      } catch {}
                    }}
                    title="Remover tema"
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

      {/* ============================================================ */}
      {/* MODAL / GAVETA DE CADERNOS (CLIQUE NA CAPA DO CADERNO)       */}
      {/* ============================================================ */}
      <AnimatePresence>
        {notebookDrawerOpen && (
          <div className="notebook-drawer-backdrop" onClick={() => setNotebookDrawerOpen(false)}>
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
                onClick={() => setNotebookDrawerOpen(false)}
                title="Fechar"
              >
                ✕
              </button>
              <h3 className="drawer-title">Estante de Cadernos</h3>
              <p className="drawer-subtitle">
                Selecione um caderno para escrever ou inicie um novo tomo de registro.
                <br />
                <span style={{ display: "inline-block", marginTop: "4px", fontSize: "11px", letterSpacing: "0.06em", color: "#8a6b2d", fontWeight: 700, textTransform: "uppercase" }}>
                  Cota: {notebooks.length}/{isPro ? 10 : 3} cadernos ({isPro ? "Plano Premium" : "Plano Normal"})
                </span>
              </p>

              <div className="notebooks-list">
                {notebooks.map((nb) => (
                  <div
                    key={nb.id}
                    className={`notebook-item-card ${activeNotebook.id === nb.id ? "is-active" : ""}`}
                    onClick={() => selecionarCaderno(nb)}
                  >
                    <div>
                      <span className="notebook-item-name">{nb.nome}</span>
                      <div className="notebook-item-count">
                        {nb.paginas?.length || 1} {(nb.paginas?.length || 1) === 1 ? "página" : "páginas"}
                      </div>
                    </div>
                    {activeNotebook.id === nb.id && <span style={{ color: "#8b1e1e", fontWeight: 700 }}>✓ Ativo</span>}
                  </div>
                ))}
              </div>

              <form onSubmit={criarNovoCaderno} className="new-notebook-form">
                <input
                  type="text"
                  className="new-notebook-input"
                  placeholder="Nome do novo caderno..."
                  value={newNotebookTitle}
                  onChange={(e) => setNewNotebookTitle(e.target.value)}
                  maxLength={50}
                />
                <button type="submit" className="new-notebook-btn">
                  + Criar Caderno
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* MODAL / GAVETA DE PASTAS DE CARTA (CLIQUE NA PASTA)          */}
      {/* ============================================================ */}
      <AnimatePresence>
        {folderDrawerOpen && (
          <div className="notebook-drawer-backdrop" onClick={() => setFolderDrawerOpen(false)}>
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
                onClick={() => setFolderDrawerOpen(false)}
                title="Fechar"
              >
                ✕
              </button>
              <h3 className="drawer-title">Pastas de Correspondências</h3>
              <p className="drawer-subtitle">
                Selecione em qual pasta arquivar suas cartas ou crie uma nova pasta física.
                <br />
                <span style={{ display: "inline-block", marginTop: "4px", fontSize: "11px", letterSpacing: "0.06em", color: "#8a6b2d", fontWeight: 700, textTransform: "uppercase" }}>
                  Cota: {letterFolders.length}/{isPro ? 10 : 3} pastas ({isPro ? "Plano Premium" : "Plano Normal"})
                </span>
              </p>

              <div className="notebooks-list">
                {letterFolders.map((fld) => (
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
                    }}
                  >
                    <div>
                      <span className="notebook-item-name">📁 {fld.nome}</span>
                      <div className="notebook-item-count">Pasta física de correspondências</div>
                    </div>
                    {activeLetterFolder?.id === fld.id && (
                      <span style={{ color: "#8b1e1e", fontWeight: 700 }}>✓ Selecionada</span>
                    )}
                  </div>
                ))}
              </div>

              <form onSubmit={criarNovaPasta} className="new-notebook-form">
                <input
                  type="text"
                  className="new-notebook-input"
                  placeholder="Nome da nova pasta (ex: Confissões, Segredos)..."
                  value={newFolderTitle}
                  onChange={(e) => setNewFolderTitle(e.target.value)}
                  maxLength={40}
                />
                <button type="submit" className="new-notebook-btn">
                  + Criar Pasta
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* MODAL DE INSPIRAÇÃO DE ESCRITA                               */}
      {/* ============================================================ */}
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
                <span className="modal-kicker">INSPIRAÇÃO DO ACERVO</span>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setInspiracaoModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="inspiration-prompt-box">
                <small className="prompt-label">PROMPT DE ESCRITA</small>
                <p className="prompt-text">“{promptTexto}”</p>
              </div>

              <div className="inspiration-letter-excerpt">
                <span className="excerpt-label">Trecho de “{cartaInspiracao.title}”:</span>
                <blockquote>“{cartaInspiracao.excerpt}”</blockquote>
                <span className="excerpt-author">— {cartaInspiracao.sender}</span>
              </div>

              <div className="inspiration-modal-actions">
                <button
                  type="button"
                  className="btn-shuffle-inspire"
                  onClick={sortearInspiracao}
                >
                  Puxar outra carta
                </button>

                <button
                  type="button"
                  className="primary-cta"
                  onClick={aplicarInspiracao}
                >
                  <span>Escrever sobre este tema</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Feedback (sem emojis) */}
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
