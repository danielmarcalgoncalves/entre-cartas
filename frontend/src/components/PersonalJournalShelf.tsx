"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import {
  JOURNAL_UPDATED_EVENT,
  LETTER_FOLDERS_STORAGE_KEY,
  type JournalEntry,
  type LetterFolder,
  type Notebook,
} from "@/components/JournalEditor";
import { api } from "@/services/api";
import Folder from "@/components/ReactBitsFolder/Folder";

const SAVED_ENTRIES_KEY = "entre-cartas:journal:entries";
const NOTEBOOKS_STORAGE_KEY = "entre-cartas:notebooks:v2";

export default function PersonalJournalShelf() {
  const { user, isPro } = useAuth();

  // Estados dos Cadernos e Cartas
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [lettersWritten, setLettersWritten] = useState<JournalEntry[]>([]);
  const [letterFolders, setLetterFolders] = useState<LetterFolder[]>([]);

  // Leitura Imersiva Noturna de Caderno
  const [readingNotebook, setReadingNotebook] = useState<Notebook | null>(null);
  const [readingPageIndex, setReadingPageIndex] = useState<number>(0);

  // Leitura de Carta Aberta
  const [readingLetter, setReadingLetter] = useState<JournalEntry | null>(null);

  const limiteCadernos = isPro ? 10 : 3;
  const limiteCartas = isPro ? 30 : 10;

  const carregarDadosEstante = () => {
    // 1. Carrega todos os cadernos inteiros do LocalStorage
    try {
      const storedNb = window.localStorage.getItem(NOTEBOOKS_STORAGE_KEY);
      if (storedNb) {
        const parsedNb = JSON.parse(storedNb);
        if (Array.isArray(parsedNb) && parsedNb.length > 0) {
          setNotebooks(parsedNb);
        }
      }
    } catch {}

    // 2. Carrega as cartas escritas pelo usuário (locais e backend)
    let cartasLocais: JournalEntry[] = [];
    try {
      const raw = window.localStorage.getItem(SAVED_ENTRIES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          cartasLocais = parsed.filter(
            (e: any) => Boolean(e.selo_carta) || e.humor !== "reflexao"
          );
          setLettersWritten(cartasLocais);
        }
      }
    } catch {}

    // 3. Mescla com cartas do backend MariaDB
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
            const novas = remotas.filter((r) => !idsAtuais.has(r.id));
            return [...atuais, ...novas];
          });
        }
      })
      .catch(() => {});

    // 4. Carrega as pastas de correspondência do LocalStorage
    try {
      const storedFld = window.localStorage.getItem(LETTER_FOLDERS_STORAGE_KEY);
      if (storedFld) {
        const parsedFld = JSON.parse(storedFld);
        if (Array.isArray(parsedFld) && parsedFld.length > 0) {
          setLetterFolders(parsedFld);
        } else {
          setLetterFolders([
            { id: "pasta-principal", nome: "Correspondências", cor: "#5a3820", criadoEm: new Date().toISOString() },
          ]);
        }
      } else {
        setLetterFolders([
          { id: "pasta-principal", nome: "Correspondências", cor: "#5a3820", criadoEm: new Date().toISOString() },
        ]);
      }
    } catch {
      setLetterFolders([
        { id: "pasta-principal", nome: "Correspondências", cor: "#5a3820", criadoEm: new Date().toISOString() },
      ]);
    }
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
          <span style={{ fontSize: "12px", fontFamily: "var(--serif, serif)", color: "#776550" }}>
            {lettersWritten.length} de {limiteCartas} cartas arquivadas • {letterFolders.length} de {limiteCadernos} pastas
          </span>
        </div>

        {/* Linha de Pastas 3D limpas diretamente sobre a estante, sem nenhum frame em volta */}
        <div className="letters-folders-3d-row">
          {(letterFolders.length > 0
            ? letterFolders
            : [
                {
                  id: "pasta-principal",
                  nome: "Correspondências",
                  cor: "#5a3820",
                  criadoEm: new Date().toISOString(),
                },
              ]
          ).map((folder) => {
            const defaultId = letterFolders[0]?.id || "pasta-principal";
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

            return (
              <div key={folder.id} className="letter-folder-3d-item">
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
                  onItemClick={(_item: any, index: number) => {
                    const carta = cartasDaPasta[index];
                    if (carta) {
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
    </section>
  );
}
