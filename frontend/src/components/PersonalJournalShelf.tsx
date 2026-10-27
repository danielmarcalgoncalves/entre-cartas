"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import {
  ACTIVE_NOTEBOOK_ID_KEY,
  JOURNAL_UPDATED_EVENT,
  LETTER_FOLDERS_STORAGE_KEY,
  getNotebookTheme,
  getFolderTheme,
  type JournalEntry,
  type LetterFolder,
  type Notebook,
} from "@/components/JournalEditor";
import { api } from "@/services/api";
import Folder from "@/components/ReactBitsFolder/Folder";
import PostalTrashCan from "@/components/PostalTrashCan";

const SAVED_ENTRIES_KEY = "entre-cartas:journal:entries";
const NOTEBOOKS_STORAGE_KEY = "entre-cartas:notebooks:v2";
const TRASH_STORAGE_KEY = "entre-cartas:journal:trash";

export default function PersonalJournalShelf() {
  const { user, isPro } = useAuth();
  const { theme } = useTheme();

  // State
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [lettersWritten, setLettersWritten] = useState<JournalEntry[]>([]);
  const [letterFolders, setLetterFolders] = useState<LetterFolder[]>([]);
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);

  // Trash Station
  const trashCanRef = useRef<HTMLDivElement>(null);
  const [isTrashHovered, setIsTrashHovered] = useState(false);
  const [isTrashShaking, setIsTrashShaking] = useState(false);
  const [trashLetters, setTrashLetters] = useState<JournalEntry[]>([]);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
  const [trashFeedback, setTrashFeedback] = useState<string | null>(null);

  // Dark Reading Room for Journals
  const [readingNotebook, setReadingNotebook] = useState<Notebook | null>(null);
  const [readingPageIndex, setReadingPageIndex] = useState<number>(0);
  const [isDeleteNotebookModalOpen, setIsDeleteNotebookModalOpen] = useState(false);

  // Letter Reader Modal
  const [readingLetter, setReadingLetter] = useState<JournalEntry | null>(null);

  const limiteCadernos = isPro ? 10 : 3;
  const limiteCartas = isPro ? 30 : 10;

  const carregarDadosEstante = () => {
    try {
      const storedNb = window.localStorage.getItem(NOTEBOOKS_STORAGE_KEY);
      if (storedNb) {
        const parsedNb = JSON.parse(storedNb);
        if (Array.isArray(parsedNb)) {
          const reais = parsedNb
            .filter(
              (n: Notebook) => n.id !== "default-caderno" && n.id !== "caderno-noturno"
            )
            .map((n: Notebook) => ({
              ...n,
              paginas: (n.paginas || []).filter(
                (p: any) =>
                  (p.conteudo && p.conteudo.trim().length > 0) ||
                  (p.titulo && p.titulo.trim().length > 0)
              ),
            }));
          setNotebooks(reais);
        } else {
          setNotebooks([]);
        }
      } else {
        setNotebooks([]);
      }
    } catch {
      setNotebooks([]);
    }

    let descartadas: JournalEntry[] = [];
    try {
      const rawTrash = window.localStorage.getItem(TRASH_STORAGE_KEY);
      if (rawTrash) {
        const parsedTrash = JSON.parse(rawTrash);
        if (Array.isArray(parsedTrash)) {
          descartadas = parsedTrash;
          setTrashLetters(descartadas);
        }
      }
    } catch {}
    const trashIds = new Set(descartadas.map((d) => String(d.id)));

    let cartasLocais: JournalEntry[] = [];
    try {
      const raw = window.localStorage.getItem(SAVED_ENTRIES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          cartasLocais = parsed.filter(
            (e: any) =>
              (Boolean(e.selo_carta) || e.humor !== "reflexao") &&
              !trashIds.has(String(e.id))
          );
          setLettersWritten(cartasLocais);
        }
      }
    } catch {}

    api.cartas
      .minhas()
      .then((res: any) => {
        if (res && res.cartas && Array.isArray(res.cartas) && res.cartas.length > 0) {
          const remotas: JournalEntry[] = res.cartas.map((c: any) => ({
            id: String(c.id),
            titulo: c.titulo,
            conteudo: c.conteudo,
            humor: c.categoria || "desabafo",
            data_formatada: c.data_carta || new Date(c.criado_em).toLocaleDateString("en-US"),
            criado_em: c.criado_em,
            tipo_papel: c.tipo_papel || "envelhecido",
            selo_carta: c.categoria ? c.categoria.toUpperCase() : "LETTER",
          }));

          setLettersWritten((atuais) => {
            const idsAtuais = new Set(atuais.map((e) => String(e.id)));
            const novas = remotas.filter((r) => !idsAtuais.has(String(r.id)) && !trashIds.has(String(r.id)));
            return [...atuais, ...novas];
          });
        }
      })
      .catch(() => {});

    try {
      const storedFld = window.localStorage.getItem(LETTER_FOLDERS_STORAGE_KEY);
      if (storedFld) {
        const parsedFld = JSON.parse(storedFld);
        if (Array.isArray(parsedFld)) {
          const reais = parsedFld.filter(
            (f: LetterFolder) => f.id !== "pasta-principal"
          );
          setLetterFolders(reais);
        } else {
          setLetterFolders([]);
        }
      } else {
        setLetterFolders([]);
      }
    } catch {
      setLetterFolders([]);
    }
  };

  const descartarCarta = (carta: JournalEntry) => {
    // 1. Grava na lixeira de forma síncrona ANTES de qualquer evento para garantir persistência imediata
    let currentTrash: JournalEntry[] = [];
    try {
      const rawTrash = window.localStorage.getItem(TRASH_STORAGE_KEY);
      if (rawTrash) {
        const parsedTrash = JSON.parse(rawTrash);
        if (Array.isArray(parsedTrash)) {
          currentTrash = parsedTrash;
        }
      }
    } catch {}

    const updatedTrash = [carta, ...currentTrash.filter((t) => String(t.id) !== String(carta.id))];
    try {
      window.localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(updatedTrash));
    } catch {}
    setTrashLetters(updatedTrash);

    // 2. Remove das cartas arquivadas de forma síncrona
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
    setLettersWritten((prev) => prev.filter((l) => String(l.id) !== String(carta.id)));

    // 3. Efeito puramente físico de tremer para indicar ao usuário que foi adicionada
    setIsTrashShaking(true);
    setTimeout(() => {
      setIsTrashShaking(false);
    }, 750);

    // 4. Smooth notification
    setTrashFeedback(`"${carta.titulo || "Letter"}" was moved to postal discards.`);
    setTimeout(() => setTrashFeedback(null), 4000);

    // 5. Notifica todos os ouvintes após os dados já estarem seguros no localStorage
    window.dispatchEvent(new Event(JOURNAL_UPDATED_EVENT));
  };

  const restaurarCarta = (carta: JournalEntry) => {
    // 1. Remove da lixeira de forma síncrona
    let currentTrash: JournalEntry[] = [];
    try {
      const rawTrash = window.localStorage.getItem(TRASH_STORAGE_KEY);
      if (rawTrash) {
        const parsedTrash = JSON.parse(rawTrash);
        if (Array.isArray(parsedTrash)) {
          currentTrash = parsedTrash;
        }
      }
    } catch {}

    const updatedTrash = currentTrash.filter((t) => String(t.id) !== String(carta.id));
    try {
      window.localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(updatedTrash));
    } catch {}
    setTrashLetters(updatedTrash);

    // 2. Retorna para as cartas locais salvas
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
    setLettersWritten(updatedSaved);

    setTrashFeedback(`"${carta.titulo || "Letter"}" was restored to its folder.`);
    setTimeout(() => setTrashFeedback(null), 4000);

    window.dispatchEvent(new Event(JOURNAL_UPDATED_EVENT));
  };

  const excluirCartaPermanentemente = (carta: JournalEntry) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete "${
          carta.titulo || "Letter"
        }"? This action cannot be undone.`
      )
    ) {
      return;
    }

    let currentTrash: JournalEntry[] = [];
    try {
      const rawTrash = window.localStorage.getItem(TRASH_STORAGE_KEY);
      if (rawTrash) {
        const parsedTrash = JSON.parse(rawTrash);
        if (Array.isArray(parsedTrash)) {
          currentTrash = parsedTrash;
        }
      }
    } catch {}

    const updatedTrash = currentTrash.filter((t) => String(t.id) !== String(carta.id));
    try {
      window.localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(updatedTrash));
    } catch {}
    setTrashLetters(updatedTrash);

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

    setTrashFeedback(`"${carta.titulo || "Letter"}" was permanently deleted.`);
    setTimeout(() => setTrashFeedback(null), 4000);

    window.dispatchEvent(new Event(JOURNAL_UPDATED_EVENT));
  };

  const esvaziarLixeiraPermanentemente = () => {
    if (trashLetters.length === 0) return;
    if (
      !window.confirm(
        `Are you sure you want to permanently delete all ${trashLetters.length} letters from the trash? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      window.localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify([]));
    } catch {}
    setTrashLetters([]);

    setTrashFeedback("Postal discards emptied permanently.");
    setTimeout(() => setTrashFeedback(null), 4000);

    window.dispatchEvent(new Event(JOURNAL_UPDATED_EVENT));
  };

  const handleItemDrag = (info: { index: number; clientX: number; clientY: number; item: any }) => {
    if (!trashCanRef.current) return false;
    const rect = trashCanRef.current.getBoundingClientRect();
    const pad = 50;
    const isOver =
      info.clientX >= rect.left - pad &&
      info.clientX <= rect.right + pad &&
      info.clientY >= rect.top - pad &&
      info.clientY <= rect.bottom + pad;

    setIsTrashHovered(isOver);
    return isOver;
  };

  const handleItemDragEnd = (
    info: { index: number; clientX: number; clientY: number; item: any; inside: boolean },
    cartasDaPasta: JournalEntry[]
  ) => {
    setIsTrashHovered(false);
    if (!trashCanRef.current) return false;
    const rect = trashCanRef.current.getBoundingClientRect();
    const pad = 50;
    const isOver =
      info.clientX >= rect.left - pad &&
      info.clientX <= rect.right + pad &&
      info.clientY >= rect.top - pad &&
      info.clientY <= rect.bottom + pad;

    if (isOver) {
      const carta = cartasDaPasta[info.index];
      if (carta && !carta.id.startsWith("placeholder-")) {
        descartarCarta(carta);
        return true;
      }
    }
    return false;
  };

  useEffect(() => {
    carregarDadosEstante();
    window.addEventListener(JOURNAL_UPDATED_EVENT, carregarDadosEstante);
    window.addEventListener("storage", carregarDadosEstante);

    return () => {
      window.removeEventListener(JOURNAL_UPDATED_EVENT, carregarDadosEstante);
      window.removeEventListener("storage", carregarDadosEstante);
    };
  }, []);

  const abrirCadernoParaLeitura = (nb: Notebook) => {
    setReadingNotebook(nb);
    setReadingPageIndex(0);
  };

  const handleEditarPagina = () => {
    if (!readingNotebook) return;

    window.dispatchEvent(
      new CustomEvent("entre-cartas:abrir-edicao-caderno", {
        detail: {
          notebookId: readingNotebook.id,
          pageIndex: readingPageIndex,
        },
      })
    );

    setReadingNotebook(null);
  };

  const confirmarExclusaoCaderno = () => {
    if (!readingNotebook) return;
    const idParaExcluir = readingNotebook.id;

    try {
      const storedNb = window.localStorage.getItem(NOTEBOOKS_STORAGE_KEY);
      if (storedNb) {
        const parsed = JSON.parse(storedNb);
        if (Array.isArray(parsed)) {
          const restantes = parsed.filter((n: Notebook) => n.id !== idParaExcluir);
          window.localStorage.setItem(NOTEBOOKS_STORAGE_KEY, JSON.stringify(restantes));
          setNotebooks(restantes.filter((n: Notebook) => n.id !== "default-caderno" && n.id !== "caderno-noturno"));
        }
      }
    } catch {}

    try {
      const activeId = window.localStorage.getItem(ACTIVE_NOTEBOOK_ID_KEY);
      if (activeId === idParaExcluir) {
        window.localStorage.removeItem(ACTIVE_NOTEBOOK_ID_KEY);
      }
    } catch {}

    window.dispatchEvent(new Event(JOURNAL_UPDATED_EVENT));

    setIsDeleteNotebookModalOpen(false);
    setReadingNotebook(null);
  };

  const paginaAnteriorLeitura = () => {
    if (readingPageIndex > 0) {
      setReadingPageIndex(readingPageIndex - 1);
    }
  };

  const proximaPaginaLeitura = () => {
    if (readingNotebook && readingPageIndex < readingNotebook.paginas.length - 1) {
      setReadingPageIndex(readingPageIndex + 1);
    }
  };

  const paginaAtual = readingNotebook?.paginas[readingPageIndex];

  return (
    <section className="personal-journal-shelf-wrap" aria-labelledby="shelf-title">
      {/* Shelf Header */}
      <div className="shelf-header">
        <div>
          <span className="section-kicker">PERSONAL SHELF · MY ARCHIVE</span>
          <h2 id="shelf-title">My Journals</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", padding: "4px 8px", background: "rgba(35, 27, 20, 0.75)", border: "1px solid rgba(207, 169, 111, 0.3)", borderRadius: "3px", color: "var(--color-birch-paper, #ece1c9)" }}>
              JOURNALS: {notebooks.length}/{limiteCadernos}
            </span>
            <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", padding: "4px 8px", background: "rgba(35, 27, 20, 0.75)", border: "1px solid rgba(207, 169, 111, 0.3)", borderRadius: "3px", color: "var(--color-birch-paper, #ece1c9)" }}>
              LETTERS: {lettersWritten.length}/{limiteCartas}
            </span>
            <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", padding: "4px 8px", background: isPro ? "var(--color-red-sands, #ad5b30)" : "rgba(81, 76, 52, 0.65)", color: "#fcfbf7", borderRadius: "3px" }}>
              {isPro ? "★ PREMIUM" : "STANDARD"}
            </span>
          </div>
          {!isPro && (
            <Link href="/clube-pro" style={{ fontSize: "11px", color: "var(--color-pollen, #cfa96f)", textDecoration: "underline", fontWeight: 600 }}>
              Expand to 10 journals and 30 letters with Pro Club ↗
            </Link>
          )}
        </div>
      </div>

      {/* 1. Journals Section (Hardbound Volumes) */}
      {notebooks.length === 0 ? (
        <div className="empty-journal-box">
          <span className="empty-pen-icon" aria-hidden="true">✎</span>
          <h3>No journals created yet.</h3>
          <p>Write at the desk above to begin your first volume of memories.</p>
        </div>
      ) : (
        <div className="shelf-tomes-grid">
          {notebooks.map((nb) => {
            const totalPaginas = (nb.paginas || []).filter(
              (p) => (p.conteudo && p.conteudo.trim().length > 0) || (p.titulo && p.titulo.trim().length > 0)
            ).length;
            const primeiraData = nb.paginas?.[0]?.dataFormatada || "Active record";
            const theme = getNotebookTheme(nb.corCapa);

            return (
              <motion.article
                key={nb.id}
                className={`tome-book-item tome-book-color--${theme.id}`}
                style={{ backgroundColor: theme.shelfBg }}
                onClick={() => abrirCadernoParaLeitura(nb)}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.2 }}
                title={`Click to read journal "${nb.nome}"`}
              >
                <div className="tome-book-spine-line" aria-hidden="true" />
                <div
                  className="tome-book-ribbon"
                  aria-hidden="true"
                  style={{ backgroundColor: theme.ribbonColor }}
                />

                <div className="tome-book-top">
                  <span className="tome-book-tag">RECORD VOLUME</span>
                  <h3 className="tome-book-title">{nb.nome}</h3>
                </div>

                <div className="tome-book-bottom">
                  <div className="tome-book-stats">
                    <span className="tome-book-page-count">
                      {totalPaginas} {totalPaginas === 1 ? "page written" : "pages written"}
                    </span>
                    <span className="tome-book-date">{primeiraData}</span>
                  </div>
                  <span className="tome-book-read-pill">Read Journal ↗</span>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      {/* 2. Letters Archive Section (3D Folders & Vintage Postal Bin) */}
      <section className="letters-archive-section" aria-labelledby="letters-section-title">
        <div className="shelf-header">
          <div>
            <span className="section-kicker">CORRESPONDENCE & CONFESSIONS</span>
            <h2 id="letters-section-title">My Letters</h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <span style={{ fontSize: "12px", fontFamily: "var(--serif, serif)", color: "#776550" }}>
              {lettersWritten.length} of {limiteCartas} letters archived • {letterFolders.length} of {limiteCadernos} folders
            </span>
            {trashLetters.length > 0 && (
              <button
                type="button"
                className="postal-trash-counter-badge"
                onClick={() => setIsTrashModalOpen(true)}
                title="Open Postal Discard Bin"
              >
                🗑 {trashLetters.length} discarded
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {trashFeedback && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="postal-trash-toast"
              role="status"
              aria-live="polite"
            >
              <span className="postal-trash-toast-icon">🗑️</span>
              <span className="postal-trash-toast-text">{trashFeedback}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="letters-archive-layout">
          {letterFolders.length === 0 ? (
            <div className="empty-journal-box" style={{ maxWidth: "480px", margin: "20px auto" }}>
              <span className="empty-pen-icon" aria-hidden="true">✉</span>
              <h3>No letter folders created yet.</h3>
              <p>Write a letter at the desk above to create your first postal folder.</p>
            </div>
          ) : (
            <div className="letters-folders-3d-row">
              {letterFolders.map((folder) => {
                const defaultId = letterFolders[0]?.id;
                const cartasDaPasta = lettersWritten.filter(
                  (carta) =>
                    carta.pasta_id === folder.id ||
                    (!carta.pasta_id && folder.id === defaultId)
                );

                const pastelPalette = [
                  "#faf6ee",
                  "#f3efe6",
                  "#ebf1ec",
                  "#f6ece8",
                  "#eaf1f5",
                  "#efe8da",
                ];

                const folderItems = (
                  cartasDaPasta.length > 0
                    ? cartasDaPasta.slice(0, 6)
                    : [
                        {
                          id: `placeholder-${folder.id}`,
                          titulo: "Empty Folder",
                          conteudo: `This folder (${folder.nome}) does not have any archived letters yet. Write a letter at the desk above to store it here.`,
                          data_formatada: "Personal Archive",
                          selo_carta: "ARCHIVE",
                        } as JournalEntry,
                      ]
                ).map((letter, idx) => {
                  const cardPastelColor =
                    letter.tipo_papel === "marfim"
                      ? "#fcfbf7"
                      : letter.tipo_papel === "pergaminho"
                      ? "#f7f3ea"
                      : letter.tipo_papel === "kraft"
                      ? "#efe8da"
                      : letter.tipo_papel === "branco"
                      ? "#faf9f5"
                      : pastelPalette[idx % pastelPalette.length];

                  return {
                    title: letter.titulo || "Correspondence",
                    description: letter.conteudo,
                    date: letter.data_formatada,
                    seal: letter.selo_carta,
                    bgColor: cardPastelColor,
                    paperColor: cardPastelColor,
                  };
                });

                const isOpen = openFolderId === folder.id;
                const folderTheme = getFolderTheme(folder.cor);

                return (
                  <div
                    key={folder.id}
                    className={`letter-folder-3d-item ${isOpen ? "is-open" : "is-closed"}`}
                    style={{
                      zIndex: isOpen ? 85 : 10,
                    }}
                  >
                    <Folder
                      label={folder.nome.toUpperCase()}
                      tabPosition="right"
                      mode="flap"
                      variant="solid"
                      color={folderTheme.corHex}
                      paperColor="#fcfbf7"
                      theme={theme}
                      size={1.35}
                      items={folderItems}
                      open={isOpen}
                      onOpenChange={(nextOpen: boolean) => {
                        setOpenFolderId(nextOpen ? folder.id : null);
                      }}
                      onItemDrag={(info: any) => handleItemDrag(info)}
                      onItemDragEnd={(info: any) => handleItemDragEnd(info, cartasDaPasta)}
                      onItemDragCancel={() => setIsTrashHovered(false)}
                      onItemClick={(_item: any, index: number) => {
                        const carta = cartasDaPasta[index];
                        if (carta && !carta.id.startsWith("placeholder-")) {
                          setReadingLetter(carta);
                        }
                      }}
                    />
                    <div className="letter-folder-caption">
                      <span className="letter-folder-caption-name">{folder.nome}</span>
                      <span className="letter-folder-caption-count">
                        {cartasDaPasta.length} {cartasDaPasta.length === 1 ? "letter archived" : "letters archived"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <PostalTrashCan
            innerRef={trashCanRef}
            isOpen={isTrashHovered}
            isShaking={isTrashShaking}
            count={trashLetters.length}
            onClick={() => setIsTrashModalOpen(true)}
          />
        </div>
      </section>

      {/* 3. Dark Reading Room for Journal */}
      <AnimatePresence>
        {readingNotebook && paginaAtual && (
          <motion.div
            className="dark-reading-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setReadingNotebook(null)}
          >
            <div className="dark-reading-topbar" onClick={(e) => e.stopPropagation()}>
              <div className="dark-reading-meta">
                <span className="dark-reading-tome-name">{readingNotebook.nome}</span>
                <span className="dark-reading-page-indicator">
                  Reading · Page {readingPageIndex + 1} of {readingNotebook.paginas.length}
                </span>
              </div>

              <div className="dark-reading-actions">
                <button
                  type="button"
                  className="dark-reading-edit-btn"
                  onClick={handleEditarPagina}
                  title="Open this page on the desk to edit"
                >
                  <span>✎ EDIT</span>
                </button>

                <button
                  type="button"
                  className="dark-reading-delete-btn"
                  onClick={() => setIsDeleteNotebookModalOpen(true)}
                  title="Permanently delete this journal"
                >
                  <span>🗑 DELETE</span>
                </button>

                <button
                  type="button"
                  className="dark-reading-close-btn"
                  onClick={() => setReadingNotebook(null)}
                  title="Close reading"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            <div className="dark-reading-sheet-wrapper" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="dark-reading-nav-arrow dark-reading-nav-arrow--left"
                onClick={paginaAnteriorLeitura}
                disabled={readingPageIndex === 0}
                title="Previous page (←)"
                aria-label="Previous page"
              >
                ←
              </button>

              <motion.article
                key={readingPageIndex}
                className="dark-reading-sheet"
                initial={{ opacity: 0.85, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <div className="dark-reading-date-badge">
                  <span>{paginaAtual.dataFormatada || "Literary entry"}</span>
                  {paginaAtual.favoritado && (
                    <span style={{ color: "var(--color-red-sands, #ad5b30)", fontWeight: 700, letterSpacing: "0.08em" }}>
                      FAVORITED ♥
                    </span>
                  )}
                </div>

                {paginaAtual.titulo ? (
                  <h3 className="dark-reading-title">{paginaAtual.titulo}</h3>
                ) : (
                  <div style={{ height: "28px" }} />
                )}

                <div className="dark-reading-body">
                  {paginaAtual.conteudo || (
                    <em style={{ color: "#8a7c6c" }}>This page does not have written notes yet.</em>
                  )}
                </div>

                <div className="dark-reading-footer">
                  <span>Volume: {readingNotebook.nome}</span>
                  <span>
                    Page {readingPageIndex + 1} of {readingNotebook.paginas.length}
                  </span>
                </div>
              </motion.article>

              <button
                type="button"
                className="dark-reading-nav-arrow dark-reading-nav-arrow--right"
                onClick={proximaPaginaLeitura}
                disabled={readingPageIndex === readingNotebook.paginas.length - 1}
                title="Next page (→)"
                aria-label="Next page"
              >
                →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Single Letter Reading Modal */}
      <AnimatePresence>
        {readingLetter && (
          <div
            className="entry-modal-backdrop"
            onClick={() => setReadingLetter(null)}
          >
            <motion.article
              className="entry-modal-sheet"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.92, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 15 }}
            >
              <div className="entry-modal-header">
                <div>
                  <span className="entry-modal-kicker">ARCHIVED LETTER</span>
                  <h2>{readingLetter.titulo}</h2>
                  <span className="entry-modal-date">{readingLetter.data_formatada}</span>
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setReadingLetter(null)}
                >
                  ✕
                </button>
              </div>

              <div className="entry-modal-body">
                <div className="entry-modal-text">
                  {readingLetter.conteudo.split("\n").map((paragrafo: string, idx: number) => (
                    <p key={idx}>{paragrafo}</p>
                  ))}
                </div>
              </div>

              <div className="entry-modal-footer">
                <span style={{ fontFamily: "var(--serif, serif)", fontSize: "12px", color: "var(--color-pollen, #cfa96f)", fontWeight: 700 }}>
                  SEAL: {readingLetter.selo_carta || "CORRESPONDENCE"}
                </span>
                <button
                  type="button"
                  className="entry-modal-close"
                  onClick={() => setReadingLetter(null)}
                >
                  Close letter
                </button>
              </div>
            </motion.article>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Postal Trash Bin Modal */}
      <AnimatePresence>
        {isTrashModalOpen && (
          <div
            className="entry-modal-backdrop"
            onClick={() => setIsTrashModalOpen(false)}
          >
            <motion.div
              className="postal-trash-modal"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.94, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 15 }}
              transition={{ duration: 0.2 }}
            >
              <div className="postal-trash-modal-header">
                <div>
                  <span className="entry-modal-kicker">DISCARD ARCHIVE</span>
                  <h2 style={{ fontFamily: "var(--serif-title, var(--serif))", margin: "4px 0", fontSize: "22px", color: "#2b231a" }}>
                    Postal Discards
                  </h2>
                  <p className="postal-trash-modal-sub">
                    Discarded letters are never permanently lost. You can restore them to your folder at any time.
                  </p>
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setIsTrashModalOpen(false)}
                >
                  ✕
                </button>
              </div>

              <div className="postal-trash-modal-body">
                {trashLetters.length === 0 ? (
                  <div className="postal-trash-empty">
                    <div style={{ width: "100px", height: "125px", pointerEvents: "none", marginBottom: "8px" }}>
                      <PostalTrashCan isOpen={false} count={0} onClick={() => {}} />
                    </div>
                    <p className="postal-trash-empty-title">The postal trash is empty</p>
                    <p className="postal-trash-empty-desc">
                      Drag and drop any letter from a folder onto the metal trash bin to discard it here.
                    </p>
                  </div>
                ) : (
                  <div className="postal-trash-letters-grid">
                    {trashLetters.map((carta) => (
                      <div key={carta.id} className="postal-trash-letter-card">
                        <div className="postal-trash-card-top">
                          <span className="postal-trash-card-date">{carta.data_formatada || "Archived date"}</span>
                          <span className="postal-trash-card-seal">{carta.selo_carta || "DISCARDED"}</span>
                        </div>
                        <h4 className="postal-trash-card-title">{carta.titulo || "Untitled"}</h4>
                        <p className="postal-trash-card-snippet">{carta.conteudo}</p>
                        <div className="postal-trash-card-actions">
                          <button
                            type="button"
                            className="postal-restore-btn"
                            onClick={() => restaurarCarta(carta)}
                            title="Restore and return to its origin folder"
                          >
                            ↺ Restore
                          </button>
                          <button
                            type="button"
                            className="postal-read-btn"
                            onClick={() => {
                              setIsTrashModalOpen(false);
                              setReadingLetter(carta);
                            }}
                            title="Read complete letter"
                          >
                            Read
                          </button>
                          <button
                            type="button"
                            className="postal-delete-perm-btn"
                            onClick={() => excluirCartaPermanentemente(carta)}
                            title="Permanently delete from trash"
                          >
                            🗑 Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="postal-trash-modal-footer">
                <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
                  <span className="postal-trash-footer-info">
                    {trashLetters.length} {trashLetters.length === 1 ? "letter preserved in trash" : "letters preserved in trash"}
                  </span>
                  {trashLetters.length > 0 && (
                    <button
                      type="button"
                      className="postal-empty-trash-btn"
                      onClick={esvaziarLixeiraPermanentemente}
                      title="Permanently delete all letters from trash"
                    >
                      🗑 Empty trash
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  className="entry-modal-close"
                  onClick={() => setIsTrashModalOpen(false)}
                >
                  Close trash
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Journal Confirmation Modal */}
      <AnimatePresence>
        {isDeleteNotebookModalOpen && readingNotebook && (
          <div
            className="delete-notebook-modal-backdrop"
            onClick={() => setIsDeleteNotebookModalOpen(false)}
          >
            <motion.div
              className="delete-notebook-modal-sheet"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ duration: 0.2 }}
            >
              <div className="delete-modal-warning-header">
                <span className="delete-modal-icon" aria-hidden="true">⚠️</span>
                <h3 className="delete-modal-title">Permanently Delete Journal</h3>
              </div>

              <div className="delete-modal-body">
                <p className="delete-modal-notice-text">
                  You are about to delete the journal <strong>“{readingNotebook.nome}”</strong> and all its{" "}
                  <strong>
                    {readingNotebook.paginas.length}{" "}
                    {readingNotebook.paginas.length === 1 ? "written page" : "written pages"}
                  </strong>.
                </p>

                <div className="delete-modal-danger-box">
                  <strong>PERMANENT DELETION WARNING:</strong>
                  <p>
                    This journal and all its memories will be permanently deleted from the system. This action cannot be undone.
                  </p>
                </div>

                <p className="delete-modal-question">
                  Are you sure you want to delete this journal?
                </p>
              </div>

              <div className="delete-modal-actions">
                <button
                  type="button"
                  className="delete-modal-cancel-btn"
                  onClick={() => setIsDeleteNotebookModalOpen(false)}
                >
                  No, Keep Journal
                </button>

                <button
                  type="button"
                  className="delete-modal-confirm-btn"
                  onClick={confirmarExclusaoCaderno}
                >
                  Yes, Delete Permanently
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
