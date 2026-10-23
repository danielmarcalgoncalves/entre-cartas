"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import {
  ACTIVE_NOTEBOOK_ID_KEY,
  JOURNAL_UPDATED_EVENT,
  LETTER_FOLDERS_STORAGE_KEY,
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

  // Estados dos Cadernos e Cartas
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [lettersWritten, setLettersWritten] = useState<JournalEntry[]>([]);
  const [letterFolders, setLetterFolders] = useState<LetterFolder[]>([]);
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);

  // Lixeira Postal Metálica Vintage
  const trashCanRef = useRef<HTMLDivElement>(null);
  const [isTrashHovered, setIsTrashHovered] = useState(false);
  const [trashLetters, setTrashLetters] = useState<JournalEntry[]>([]);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
  const [trashFeedback, setTrashFeedback] = useState<string | null>(null);

  // Leitura Imersiva Noturna de Caderno
  const [readingNotebook, setReadingNotebook] = useState<Notebook | null>(null);
  const [readingPageIndex, setReadingPageIndex] = useState<number>(0);
  const [isDeleteNotebookModalOpen, setIsDeleteNotebookModalOpen] = useState(false);

  // Leitura de Carta Aberta
  const [readingLetter, setReadingLetter] = useState<JournalEntry | null>(null);

  const limiteCadernos = isPro ? 10 : 3;
  const limiteCartas = isPro ? 30 : 10;

  const carregarDadosEstante = () => {
    // 1. Carrega todos os cadernos inteiros do LocalStorage (apenas criados pelo usuário)
    try {
      const storedNb = window.localStorage.getItem(NOTEBOOKS_STORAGE_KEY);
      if (storedNb) {
        const parsedNb = JSON.parse(storedNb);
        if (Array.isArray(parsedNb)) {
          const reais = parsedNb.filter(
            (n: Notebook) => n.id !== "default-caderno" && n.id !== "caderno-noturno"
          );
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

    // 2. Carrega lixeira postal
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
    const trashIds = new Set(descartadas.map((d) => d.id));

    // 3. Carrega as cartas escritas pelo usuário (locais e backend)
    let cartasLocais: JournalEntry[] = [];
    try {
      const raw = window.localStorage.getItem(SAVED_ENTRIES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          cartasLocais = parsed.filter(
            (e: any) =>
              (Boolean(e.selo_carta) || e.humor !== "reflexao") &&
              !trashIds.has(e.id)
          );
          setLettersWritten(cartasLocais);
        }
      }
    } catch {}

    // 4. Mescla com cartas do backend MariaDB
    api.cartas
      .minhas()
      .then((res: any) => {
        if (res && res.cartas && Array.isArray(res.cartas) && res.cartas.length > 0) {
          const remotas: JournalEntry[] = res.cartas.map((c: any) => ({
            id: String(c.id),
            titulo: c.titulo,
            conteudo: c.conteudo,
            humor: c.categoria || "desabafo",
            data_formatada: c.data_carta || new Date(c.criado_em).toLocaleDateString("pt-BR"),
            criado_em: c.criado_em,
            tipo_papel: c.tipo_papel || "envelhecido",
            selo_carta: c.categoria ? c.categoria.toUpperCase() : "CARTA",
          }));

          setLettersWritten((atuais) => {
            const idsAtuais = new Set(atuais.map((e) => e.id));
            const novas = remotas.filter((r) => !idsAtuais.has(r.id) && !trashIds.has(r.id));
            return [...atuais, ...novas];
          });
        }
      })
      .catch(() => {});

    // 5. Carrega as pastas de correspondência do LocalStorage (apenas criadas pelo usuário)
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
    // 1. Remove da estante ativa
    setLettersWritten((prev) => prev.filter((l) => l.id !== carta.id));

    // Remove do LocalStorage de entradas ativas
    try {
      const raw = window.localStorage.getItem(SAVED_ENTRIES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const rest = parsed.filter((p: any) => p.id !== carta.id);
          window.localStorage.setItem(SAVED_ENTRIES_KEY, JSON.stringify(rest));
        }
      }
    } catch {}

    // 2. Guarda na lixeira postal
    setTrashLetters((prev) => {
      const updated = [carta, ...prev.filter((t) => t.id !== carta.id)];
      try {
        window.localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setTrashFeedback(`"${carta.titulo || "Carta"}" foi guardada na lixeira postal.`);
    setTimeout(() => setTrashFeedback(null), 4500);

    window.dispatchEvent(new Event(JOURNAL_UPDATED_EVENT));
  };

  const restaurarCarta = (carta: JournalEntry) => {
    // 1. Remove da lixeira
    setTrashLetters((prev) => {
      const updated = prev.filter((t) => t.id !== carta.id);
      try {
        window.localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // 2. Devolve para as cartas ativas
    setLettersWritten((prev) => {
      const updated = [carta, ...prev.filter((l) => l.id !== carta.id)];
      try {
        const raw = window.localStorage.getItem(SAVED_ENTRIES_KEY);
        let list = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(list)) list = [];
        list = [carta, ...list.filter((l: any) => l.id !== carta.id)];
        window.localStorage.setItem(SAVED_ENTRIES_KEY, JSON.stringify(list));
      } catch {}
      return updated;
    });

    setTrashFeedback(`"${carta.titulo || "Carta"}" foi restaurada para a pasta.`);
    setTimeout(() => setTrashFeedback(null), 4500);

    window.dispatchEvent(new Event(JOURNAL_UPDATED_EVENT));
  };

  const handleItemDrag = (info: { index: number; clientX: number; clientY: number; item: any }) => {
    if (!trashCanRef.current) return false;
    const rect = trashCanRef.current.getBoundingClientRect();
    const pad = 40;
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
    const pad = 40;
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

  // Abrir Caderno no Ambiente Escuro de Leitura
  const abrirCadernoParaLeitura = (nb: Notebook) => {
    setReadingNotebook(nb);
    setReadingPageIndex(0);
  };

  // Botão discreto "EDITAR" que fecha a leitura e volta para o editor
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

  // Exclusão Permanente do Caderno Selecionado
  const confirmarExclusaoCaderno = () => {
    if (!readingNotebook) return;
    const idParaExcluir = readingNotebook.id;

    // 1. Atualiza lista de cadernos no LocalStorage
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

    // 2. Se o caderno ativo for este, limpa o ID ativo
    try {
      const activeId = window.localStorage.getItem(ACTIVE_NOTEBOOK_ID_KEY);
      if (activeId === idParaExcluir) {
        window.localStorage.removeItem(ACTIVE_NOTEBOOK_ID_KEY);
      }
    } catch {}

    // 3. Dispara evento global de atualização
    window.dispatchEvent(new Event(JOURNAL_UPDATED_EVENT));

    // 4. Fecha modal de confirmação e fecha leitura
    setIsDeleteNotebookModalOpen(false);
    setReadingNotebook(null);
  };

  // Navegar entre páginas no modo leitura
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
      {/* ============================================================ */}
      {/* CABEÇALHO DA ESTANTE COM COTAS                               */}
      {/* ============================================================ */}
      <div className="shelf-header">
        <div>
          <span className="section-kicker">ESTANTE PESSOAL · MEU ARQUIVO</span>
          <h2 id="shelf-title">Meus Cadernos</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", padding: "4px 8px", background: "#f0ebe1", border: "1px solid #dcd4c5", borderRadius: "3px", color: "#3a2c20" }}>
              CADERNOS: {notebooks.length}/{limiteCadernos}
            </span>
            <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", padding: "4px 8px", background: "#f0ebe1", border: "1px solid #dcd4c5", borderRadius: "3px", color: "#3a2c20" }}>
              CARTAS: {lettersWritten.length}/{limiteCartas}
            </span>
            <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", padding: "4px 8px", background: isPro ? "#8b1e1e" : "#4a3e31", color: "#fcfbf7", borderRadius: "3px" }}>
              {isPro ? "★ PREMIUM" : "NORMAL"}
            </span>
          </div>
          {!isPro && (
            <Link href="/clube-pro" style={{ fontSize: "11px", color: "#8b1e1e", textDecoration: "underline", fontWeight: 600 }}>
              Expandir para 10 cadernos e 30 cartas no Clube Pro ↗
            </Link>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1. SEÇÃO CADERNOS (LIVROS/TOMOS COMPLETOS)                    */}
      {/* ============================================================ */}
      {notebooks.length === 0 ? (
        <div className="empty-journal-box">
          <span className="empty-pen-icon" aria-hidden="true">✎</span>
          <h3>Nenhum caderno criado ainda.</h3>
          <p>Escreva na mesa acima para dar início ao seu primeiro tomo de memórias.</p>
        </div>
      ) : (
        <div className="shelf-tomes-grid">
          {notebooks.map((nb) => {
            const totalPaginas = nb.paginas?.length || 1;
            const primeiraData = nb.paginas?.[0]?.dataFormatada || "Registro ativo";

            return (
              <motion.article
                key={nb.id}
                className="tome-book-item"
                style={{ backgroundColor: nb.corCapa || "#1e1512" }}
                onClick={() => abrirCadernoParaLeitura(nb)}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.2 }}
                title="Clique para ler este caderno"
              >
                <div className="tome-book-spine-line" aria-hidden="true" />
                <div className="tome-book-ribbon" aria-hidden="true" />

                <div className="tome-book-top">
                  <span className="tome-book-tag">TOMO DE REGISTRO</span>
                  <h3 className="tome-book-title">{nb.nome}</h3>
                </div>

                <div className="tome-book-bottom">
                  <div className="tome-book-stats">
                    <span className="tome-book-page-count">
                      {totalPaginas} {totalPaginas === 1 ? "página escrita" : "páginas escritas"}
                    </span>
                    <span className="tome-book-date">{primeiraData}</span>
                  </div>
                  <span className="tome-book-read-pill">Ler Caderno ↗</span>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. SEÇÃO SEPARADA: CARTAS (PASTAS 3D DINÂMICAS SEM FRAME)    */}
      {/* ============================================================ */}
      <section className="letters-archive-section" aria-labelledby="letters-section-title">
        <div className="shelf-header">
          <div>
            <span className="section-kicker">CORRESPONDÊNCIA & CONFISSÕES</span>
            <h2 id="letters-section-title">Minhas Cartas</h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <span style={{ fontSize: "12px", fontFamily: "var(--serif, serif)", color: "#776550" }}>
              {lettersWritten.length} de {limiteCartas} cartas arquivadas • {letterFolders.length} de {limiteCadernos} pastas
            </span>
            {trashLetters.length > 0 && (
              <button
                type="button"
                className="postal-trash-counter-badge"
                onClick={() => setIsTrashModalOpen(true)}
                title="Abrir Lixeira Postal"
              >
                🗑 {trashLetters.length} descartada{trashLetters.length === 1 ? "" : "s"}
              </button>
            )}
          </div>
        </div>

        {/* Feedback visual discreto de descarte/restauração */}
        <AnimatePresence>
          {trashFeedback && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="postal-trash-toast"
            >
              <span>{trashFeedback}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="letters-archive-layout">
          {/* Se nenhuma pasta foi criada ainda pelo usuário */}
          {letterFolders.length === 0 ? (
            <div className="empty-journal-box" style={{ maxWidth: "480px", margin: "20px auto" }}>
              <span className="empty-pen-icon" aria-hidden="true">✉</span>
              <h3>Nenhuma pasta de cartas criada ainda.</h3>
              <p>Escreva uma carta na escrivaninha acima para criar sua primeira pasta postal.</p>
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
                "#faf6ee", // Creme marfim pastel
                "#f3efe6", // Pergaminho suave
                "#ebf1ec", // Sálvia pastel suave
                "#f6ece8", // Rosa blush vintage pastel
                "#eaf1f5", // Azul névoa suave pastel
                "#efe8da", // Linho cru clássico
              ];

              const folderItems = (
                cartasDaPasta.length > 0
                  ? cartasDaPasta.slice(0, 6)
                  : [
                      {
                        id: `placeholder-${folder.id}`,
                        titulo: "Pasta Vazia",
                        conteudo: `Esta pasta (${folder.nome}) ainda não possui cartas arquivadas. Escreva uma carta na escrivaninha acima para guardá-la aqui.`,
                        data_formatada: "Arquivo Pessoal",
                        selo_carta: "ARQUIVO",
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
                  title: letter.titulo || "Correspondência",
                  description: letter.conteudo,
                  date: letter.data_formatada,
                  seal: letter.selo_carta,
                  bgColor: cardPastelColor,
                  paperColor: cardPastelColor,
                };
              });

              const isOpen = openFolderId === folder.id;

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
                    color={folder.cor || "#5a3820"}
                    paperColor="#fcfbf7"
                    theme="dark"
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
                      {cartasDaPasta.length} {cartasDaPasta.length === 1 ? "carta arquivada" : "cartas arquivadas"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

          {/* Nova Lixeira Postal Metálica Vintage 3D com Tampa Interativa */}
          <PostalTrashCan
            innerRef={trashCanRef}
            isOpen={isTrashHovered}
            count={trashLetters.length}
            onClick={() => setIsTrashModalOpen(true)}
          />
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. AMBIENTE ESCURO DE LEITURA DO CADERNO (FOCO NO PAPEL)     */}
      {/* ============================================================ */}
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
            {/* Barra superior de controle */}
            <div className="dark-reading-topbar" onClick={(e) => e.stopPropagation()}>
              <div className="dark-reading-meta">
                <span className="dark-reading-tome-name">{readingNotebook.nome}</span>
                <span className="dark-reading-page-indicator">
                  Leitura · Página {readingPageIndex + 1} de {readingNotebook.paginas.length}
                </span>
              </div>

              <div className="dark-reading-actions">
                <button
                  type="button"
                  className="dark-reading-edit-btn"
                  onClick={handleEditarPagina}
                  title="Abrir esta página na mesa de escrita para editar"
                >
                  <span>✎ EDITAR</span>
                </button>

                {/* Botão de Excluir Caderno */}
                <button
                  type="button"
                  className="dark-reading-delete-btn"
                  onClick={() => setIsDeleteNotebookModalOpen(true)}
                  title="Excluir este caderno permanentemente"
                >
                  <span>🗑 EXCLUIR</span>
                </button>

                <button
                  type="button"
                  className="dark-reading-close-btn"
                  onClick={() => setReadingNotebook(null)}
                  title="Fechar leitura"
                >
                  ✕ Fechar
                </button>
              </div>
            </div>

            {/* Palco com Foco de Luz e Folha Iluminada */}
            <div className="dark-reading-sheet-wrapper" onClick={(e) => e.stopPropagation()}>
              {/* Seta Anterior ← */}
              <button
                type="button"
                className="dark-reading-nav-arrow dark-reading-nav-arrow--left"
                onClick={paginaAnteriorLeitura}
                disabled={readingPageIndex === 0}
                title="Página anterior (←)"
                aria-label="Página anterior"
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
                  <span>{paginaAtual.dataFormatada || "Registro literário"}</span>
                  {paginaAtual.favoritado && (
                    <span style={{ color: "#8b1e1e", fontWeight: 700, letterSpacing: "0.08em" }}>
                      FAVORITADA ♥
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
                    <em style={{ color: "#8a7c6c" }}>Esta página ainda não contém anotações escritas.</em>
                  )}
                </div>

                <div className="dark-reading-footer">
                  <span>Tomo: {readingNotebook.nome}</span>
                  <span>
                    Página {readingPageIndex + 1} de {readingNotebook.paginas.length}
                  </span>
                </div>
              </motion.article>

              {/* Seta Próxima → */}
              <button
                type="button"
                className="dark-reading-nav-arrow dark-reading-nav-arrow--right"
                onClick={proximaPaginaLeitura}
                disabled={readingPageIndex === readingNotebook.paginas.length - 1}
                title="Próxima página (→)"
                aria-label="Próxima página"
              >
                →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* 4. MODAL DE LEITURA DE CARTA INDIVIDUAL                      */}
      {/* ============================================================ */}
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
                  <span className="entry-modal-kicker">CARTA ARQUIVADA</span>
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
                <span style={{ fontFamily: "var(--serif, serif)", fontSize: "12px", color: "#8b1e1e", fontWeight: 700 }}>
                  SELO: {readingLetter.selo_carta || "CORRESPONDÊNCIA"}
                </span>
                <button
                  type="button"
                  className="entry-modal-close"
                  onClick={() => setReadingLetter(null)}
                >
                  Fechar carta
                </button>
              </div>
            </motion.article>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* 5. MODAL DA LIXEIRA POSTAL (RECUPERAR CARTAS DESCARTADAS)    */}
      {/* ============================================================ */}
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
                  <span className="entry-modal-kicker">ARQUIVO DE DESCARTES</span>
                  <h2 style={{ fontFamily: "var(--serif-title, var(--serif))", margin: "4px 0", fontSize: "22px", color: "#2b231a" }}>
                    Lixeira Postal
                  </h2>
                  <p className="postal-trash-modal-sub">
                    As cartas descartadas nunca somem permanentemente. Você pode restaurá-las para a sua pasta a qualquer momento.
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
                    <p className="postal-trash-empty-title">A lixeira postal está vazia</p>
                    <p className="postal-trash-empty-desc">
                      Puxe e arraste qualquer carta de uma pasta até a lata de lixo metálica para descartá-la aqui.
                    </p>
                  </div>
                ) : (
                  <div className="postal-trash-letters-grid">
                    {trashLetters.map((carta) => (
                      <div key={carta.id} className="postal-trash-letter-card">
                        <div className="postal-trash-card-top">
                          <span className="postal-trash-card-date">{carta.data_formatada || "Data arquivada"}</span>
                          <span className="postal-trash-card-seal">{carta.selo_carta || "DESCARTADA"}</span>
                        </div>
                        <h4 className="postal-trash-card-title">{carta.titulo || "Sem título"}</h4>
                        <p className="postal-trash-card-snippet">{carta.conteudo}</p>
                        <div className="postal-trash-card-actions">
                          <button
                            type="button"
                            className="postal-restore-btn"
                            onClick={() => restaurarCarta(carta)}
                            title="Recuperar e colocar de volta na sua pasta de origem"
                          >
                            ↺ Restaurar
                          </button>
                          <button
                            type="button"
                            className="postal-read-btn"
                            onClick={() => {
                              setIsTrashModalOpen(false);
                              setReadingLetter(carta);
                            }}
                            title="Ler carta completa"
                          >
                            Ler
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="postal-trash-modal-footer">
                <span className="postal-trash-footer-info">
                  {trashLetters.length} {trashLetters.length === 1 ? "carta preservada na lixeira" : "cartas preservadas na lixeira"}
                </span>
                <button
                  type="button"
                  className="entry-modal-close"
                  onClick={() => setIsTrashModalOpen(false)}
                >
                  Fechar lixeira
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DEFINITIVA DO CADERNO       */}
      {/* ============================================================ */}
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
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ duration: 0.2 }}
            >
              <div className="delete-modal-warning-header">
                <span className="delete-modal-icon" aria-hidden="true">⚠️</span>
                <h3 className="delete-modal-title">Excluir Caderno Definitivamente</h3>
              </div>

              <div className="delete-modal-body">
                <p className="delete-modal-notice-text">
                  Você está prestes a excluir o caderno <strong>“{readingNotebook.nome}”</strong> e todas as suas{" "}
                  <strong>
                    {readingNotebook.paginas.length}{" "}
                    {readingNotebook.paginas.length === 1 ? "página escrita" : "páginas escritas"}
                  </strong>.
                </p>

                <div className="delete-modal-danger-box">
                  <strong>AVISO DE EXCLUSÃO PERMANENTE:</strong>
                  <p>
                    Este caderno e todas as suas memórias serão apagados permanentemente do sistema. Esta ação não poderá ser desfeita.
                  </p>
                </div>

                <p className="delete-modal-question">
                  Tem certeza de que deseja excluir este caderno?
                </p>
              </div>

              <div className="delete-modal-actions">
                <button
                  type="button"
                  className="delete-modal-cancel-btn"
                  onClick={() => setIsDeleteNotebookModalOpen(false)}
                >
                  Não, Manter Caderno
                </button>

                <button
                  type="button"
                  className="delete-modal-confirm-btn"
                  onClick={confirmarExclusaoCaderno}
                >
                  Sim, Excluir Definitivamente
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
