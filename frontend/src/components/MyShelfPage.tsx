"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/services/api";
import MyJournalCollection from "@/components/MyJournalCollection";
import MyLettersCollection from "@/components/MyLettersCollection";
import { GuestAccountPromptCard } from "@/components/GuestSavePromptModal";
import {
  BookVolumeIcon,
  CloseIcon,
  EnvelopeIcon,
  QuillIcon,
  SearchIcon,
  SortArrowsIcon,
} from "@/components/my-shelf/ShelfIcons";
import {
  JOURNAL_UPDATED_EVENT,
  filterWrittenPages,
  getNotebookTheme,
  loadLetterFolders,
  loadSavedLetters,
  loadTrashLetters,
  loadUserNotebooks,
  playPaperSound,
  type JournalEntry,
  type LetterFolder,
  type Notebook,
} from "@/lib/journal-storage";
import "./my-shelf/my-shelf.css";

type ShelfSection = "all" | "journals" | "letters";
type ShelfSort = "recent" | "oldest" | "title";

function parseTimestamp(isoOrDate?: string): number {
  if (!isoOrDate) return 0;
  const parsed = Date.parse(isoOrDate);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export default function MyShelfPage({ showPageChrome = false }: { showPageChrome?: boolean } = {}) {
  const { user, loading: authLoading, isPro } = useAuth();
  const prefersReducedMotion = useReducedMotion();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [activeSection, setActiveSection] = useState<ShelfSection>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<ShelfSort>("recent");

  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [lettersWritten, setLettersWritten] = useState<JournalEntry[]>([]);
  const [letterFolders, setLetterFolders] = useState<LetterFolder[]>([]);
  const [trashLetters, setTrashLetters] = useState<JournalEntry[]>([]);

  const limiteCadernos = isPro ? 10 : 3;
  const limiteCartas = isPro ? 30 : 10;
  const limitePastas = isPro ? 10 : 3;

  const carregarDadosEstante = useCallback(() => {
    if (authLoading || !user) return;
    const userNbs = loadUserNotebooks(user?.id).map((n) => ({
      ...n,
      paginas: filterWrittenPages(n.paginas),
    }));
    setNotebooks(userNbs);

    const descartadas = loadTrashLetters(user?.id);
    setTrashLetters(descartadas);
    const trashIds = new Set(descartadas.map((d) => String(d.id)));
    const trashRemoteIds = new Set(
      descartadas.filter((d) => d.remote_id).map((d) => String(d.remote_id))
    );

    const cartasLocais = loadSavedLetters(user?.id);
    setLettersWritten(cartasLocais);

    const foldersLocais = loadLetterFolders(user?.id);
    setLetterFolders(foldersLocais);

    api.cartas
      .minhas()
      .then((res: any) => {
        if (res && Array.isArray(res.cartas) && res.cartas.length > 0) {
          const remotas: JournalEntry[] = res.cartas.map((c: any) => ({
            id: String(c.id),
            remote_id: c.id,
            titulo: c.titulo,
            destinatario: c.destinatario_anonimo || undefined,
            assinatura: c.remetente_anonimo || undefined,
            conteudo: c.conteudo,
            humor: c.categoria || "desabafo",
            data_formatada:
              c.data_carta ||
              new Date(c.criado_em).toLocaleDateString("en-US"),
            criado_em: c.criado_em,
            atualizado_em: c.criado_em,
            tipo_papel: c.tipo_papel || "marfim",
            selo_carta: c.categoria ? c.categoria.toUpperCase() : "LETTER",
            status: "completed",
            usuario_id: c.usuario_id || user?.id,
          }));

          setLettersWritten((atuais) => {
            const idsAtuais = new Set(atuais.map((e) => String(e.id)));
            const remoteIdsAtuais = new Set(
              atuais.filter((e) => e.remote_id).map((e) => String(e.remote_id))
            );
            const novas = remotas.filter(
              (r) =>
                !idsAtuais.has(String(r.id)) &&
                !remoteIdsAtuais.has(String(r.id)) &&
                !trashIds.has(String(r.id)) &&
                !trashRemoteIds.has(String(r.id))
            );
            return [...atuais, ...novas];
          });
        }
      })
      .catch(() => {});
  }, [user, authLoading]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const params = new URLSearchParams(window.location.search);
        const sec = params.get("section");
        if (sec === "journals" || sec === "journal") {
          setActiveSection("journals");
        } else if (sec === "letters" || sec === "letter") {
          setActiveSection("letters");
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    carregarDadosEstante();
    window.addEventListener(JOURNAL_UPDATED_EVENT, carregarDadosEstante);
    window.addEventListener("storage", carregarDadosEstante);
    return () => {
      window.removeEventListener(JOURNAL_UPDATED_EVENT, carregarDadosEstante);
      window.removeEventListener("storage", carregarDadosEstante);
    };
  }, [authLoading, user, carregarDadosEstante]);

  // Press '/' to focus the archive search input
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable) {
        return;
      }
      e.preventDefault();
      searchInputRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredNotebooks = useMemo(() => {
    const list = normalizedQuery
      ? notebooks.filter((nb) => {
          const theme = getNotebookTheme(nb.corCapa);
          const matchesMeta =
            nb.nome.toLowerCase().includes(normalizedQuery) ||
            theme.nome.toLowerCase().includes(normalizedQuery) ||
            theme.etiqueta.toLowerCase().includes(normalizedQuery);
          if (matchesMeta) return true;
          return (nb.paginas || []).some(
            (p) =>
              (p.titulo || "").toLowerCase().includes(normalizedQuery) ||
              (p.conteudo || "").toLowerCase().includes(normalizedQuery)
          );
        })
      : [...notebooks];

    list.sort((a, b) => {
      if (sortBy === "title") {
        return a.nome.localeCompare(b.nome);
      }
      const timeA = parseTimestamp(a.atualizadoEm || a.criadoEm);
      const timeB = parseTimestamp(b.atualizadoEm || b.criadoEm);
      return sortBy === "oldest" ? timeA - timeB : timeB - timeA;
    });

    return list;
  }, [notebooks, normalizedQuery, sortBy]);

  const filteredLetters = useMemo(() => {
    const folderNameById = new Map(letterFolders.map((f) => [f.id, f.nome]));
    const list = normalizedQuery
      ? lettersWritten.filter((letter) => {
          const folderName =
            letter.pasta_nome ||
            (letter.pasta_id ? folderNameById.get(letter.pasta_id) : "") ||
            "";
          return (
            (letter.titulo || "").toLowerCase().includes(normalizedQuery) ||
            (letter.destinatario || "").toLowerCase().includes(normalizedQuery) ||
            (letter.conteudo || "").toLowerCase().includes(normalizedQuery) ||
            (letter.selo_carta || "").toLowerCase().includes(normalizedQuery) ||
            folderName.toLowerCase().includes(normalizedQuery)
          );
        })
      : [...lettersWritten];

    list.sort((a, b) => {
      if (sortBy === "title") {
        return (a.titulo || "Untitled").localeCompare(b.titulo || "Untitled");
      }
      const timeA = parseTimestamp(a.atualizado_em || a.criado_em);
      const timeB = parseTimestamp(b.atualizado_em || b.criado_em);
      return sortBy === "oldest" ? timeA - timeB : timeB - timeA;
    });

    return list;
  }, [lettersWritten, letterFolders, normalizedQuery, sortBy]);

  if (authLoading) {
    return (
      <div className="guest-shelf-gate-wrap">
        <span
          style={{
            fontFamily: "var(--serif, Georgia, serif)",
            fontSize: "16px",
            fontStyle: "italic",
            color: "var(--text-secondary, #b8a995)",
          }}
        >
          Opening archive…
        </span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="guest-shelf-gate-wrap">
        <GuestAccountPromptCard variant="shelf" />
      </div>
    );
  }

  const isShelfCompletelyEmpty =
    notebooks.length === 0 && lettersWritten.length === 0;
  const hasActiveSearch = normalizedQuery.length > 0;
  const isSearchEmpty =
    !isShelfCompletelyEmpty &&
    hasActiveSearch &&
    filteredNotebooks.length === 0 &&
    filteredLetters.length === 0;

  const journalPct = Math.min(100, Math.round((notebooks.length / limiteCadernos) * 100));
  const letterPct = Math.min(100, Math.round((lettersWritten.length / limiteCartas) * 100));
  const folderPct = Math.min(100, Math.round((letterFolders.length / limitePastas) * 100));

  const tabs: { id: ShelfSection; label: string; count: number }[] = [
    { id: "all", label: "All Archive", count: filteredNotebooks.length + filteredLetters.length },
    { id: "journals", label: "My Journal", count: filteredNotebooks.length },
    { id: "letters", label: "My Letters", count: filteredLetters.length },
  ];

  return (
    <>
      <div className="study-cabinet-shell" id="my-shelf-archive">
        {/* Collector's Study Cabinet Masthead */}
        <motion.header
          className="cabinet-masthead"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="cabinet-masthead-top">
            <div className="cabinet-title-block">
              <h1 id="my-shelf-page-title" className="cabinet-title">
                My <em>Shelf.</em>
              </h1>
              <p className="cabinet-subtitle">
                Every leather-bound journal and personal letter you have written rests here—catalogued, preserved, and ready to reopen whenever memory calls.
              </p>
            </div>

            <div className="cabinet-quick-actions">
              <Link href="/journal?create=1" className="cabinet-primary-btn">
                <BookVolumeIcon size={15} />
                <span>Create a Journal</span>
              </Link>
              <Link href="/letters" className="cabinet-secondary-btn">
                <QuillIcon size={15} />
                <span>Write a Letter</span>
              </Link>
            </div>
          </div>

          {/* Collector's Ledger Strip */}
          <div className="cabinet-ledger-strip" aria-label="Archive capacity and membership">
            <div className="cabinet-ledger-meters">
              <div className="cabinet-meter">
                <div className="cabinet-meter-head">
                  <span className="cabinet-meter-label">Journals</span>
                  <span className="cabinet-meter-value">
                    {notebooks.length}/{limiteCadernos}
                  </span>
                </div>
                <div className="cabinet-meter-track" aria-hidden="true">
                  <div
                    className={`cabinet-meter-fill ${notebooks.length >= limiteCadernos ? "is-full" : ""}`}
                    style={{ width: `${journalPct}%` }}
                  />
                </div>
              </div>

              <div className="cabinet-meter">
                <div className="cabinet-meter-head">
                  <span className="cabinet-meter-label">Letters</span>
                  <span className="cabinet-meter-value">
                    {lettersWritten.length}/{limiteCartas}
                  </span>
                </div>
                <div className="cabinet-meter-track" aria-hidden="true">
                  <div
                    className={`cabinet-meter-fill ${lettersWritten.length >= limiteCartas ? "is-full" : ""}`}
                    style={{ width: `${letterPct}%` }}
                  />
                </div>
              </div>

              <div className="cabinet-meter">
                <div className="cabinet-meter-head">
                  <span className="cabinet-meter-label">Folders</span>
                  <span className="cabinet-meter-value">
                    {letterFolders.length}/{limitePastas}
                  </span>
                </div>
                <div className="cabinet-meter-track" aria-hidden="true">
                  <div
                    className={`cabinet-meter-fill ${letterFolders.length >= limitePastas ? "is-full" : ""}`}
                    style={{ width: `${folderPct}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="cabinet-plan-cluster">
              <span className={`cabinet-plan-badge ${isPro ? "is-pro" : ""}`}>
                {isPro ? "Pro Sender" : "Standard Plan"}
              </span>
              {!isPro && (
                <Link href="/clube-pro" className="cabinet-upgrade-link">
                  Upgrade to Pro Club ↗
                </Link>
              )}
            </div>
          </div>
        </motion.header>

        {/* Cataloguing Desk Toolbar */}
        <div className="catalog-toolbar" role="region" aria-label="Archive navigation and search">
          <div className="catalog-tabs" role="tablist" aria-label="My Shelf sections">
            {tabs.map((tab) => {
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`catalog-tab-btn ${isActive ? "is-active" : ""}`}
                  onClick={() => {
                    playPaperSound();
                    setActiveSection(tab.id);
                  }}
                >
                  {isActive && (
                    <motion.span
                      layoutId="shelfTabPill"
                      className="catalog-tab-pill"
                      transition={
                        prefersReducedMotion
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 420, damping: 34 }
                      }
                    />
                  )}
                  <span className="catalog-tab-label">{tab.label}</span>
                  <span className="catalog-tab-count">{tab.count}</span>
                </button>
              );
            })}
          </div>

          <div className="catalog-controls">
            <div className="catalog-search-box">
              <span className="catalog-search-icon">
                <SearchIcon size={15} />
              </span>
              <input
                ref={searchInputRef}
                type="search"
                className="catalog-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search journals, letters, recipients…"
                aria-label="Search journals and letters"
              />
              {searchQuery ? (
                <button
                  type="button"
                  className="catalog-search-clear"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  title="Clear search"
                >
                  <CloseIcon size={12} />
                </button>
              ) : (
                <span className="catalog-search-kbd" aria-hidden="true">
                  /
                </span>
              )}
            </div>

            <div className="catalog-sort-wrap">
              <span className="catalog-sort-icon">
                <SortArrowsIcon size={14} />
              </span>
              <select
                className="catalog-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as ShelfSort)}
                aria-label="Sort archive items"
              >
                <option value="recent">Recently Updated</option>
                <option value="oldest">Oldest First</option>
                <option value="title">Title (A–Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Overall My Shelf Empty State */}
        {isShelfCompletelyEmpty && (
          <motion.section
            className="cabinet-empty-state"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            aria-label="Empty shelf invitation"
          >
            <div className="my-shelf-master-empty-state__art" aria-hidden="true">
              <div className="mini-leather-emblem">
                <span className="mini-leather-emblem__ribbon" />
                <span className="mini-leather-emblem__glyph">
                  <QuillIcon size={18} />
                </span>
              </div>
              <div className="envelope envelope--sealed">
                <div className="envelope__flap" />
                <div className="envelope__seal">
                  <EnvelopeIcon size={14} />
                </div>
              </div>
            </div>

            <h2 className="cabinet-empty-title">Your shelf is waiting for memories.</h2>
            <p className="cabinet-empty-desc">
              Begin a leather-bound journal or compose a personal letter—every volume and keepsake will be catalogued here.
            </p>

            <div className="my-shelf-master-empty-state__actions">
              <Link href="/journal?create=1" className="cabinet-primary-btn">
                Create a Journal
              </Link>
              <Link href="/letters" className="cabinet-secondary-btn">
                Write a Letter
              </Link>
            </div>
          </motion.section>
        )}

        {/* Search No-Match State */}
        {isSearchEmpty && (
          <section className="cabinet-empty-state" aria-live="polite">
            <h2 className="cabinet-empty-title">No keepsakes match “{searchQuery.trim()}”</h2>
            <p className="cabinet-empty-desc">
              Try a different title, recipient, or phrase—or clear the search to browse your full study cabinet.
            </p>
            <button
              type="button"
              className="cabinet-secondary-btn"
              onClick={() => setSearchQuery("")}
            >
              Clear Search
            </button>
          </section>
        )}

        {/* Section 1: MY JOURNAL */}
        {!isSearchEmpty && (activeSection === "all" || activeSection === "journals") && (
          <MyJournalCollection
            notebooks={filteredNotebooks}
            totalCount={notebooks.length}
            limiteCadernos={limiteCadernos}
            searchQuery={searchQuery}
            onClearSearch={() => setSearchQuery("")}
            onRefresh={carregarDadosEstante}
          />
        )}

        {/* Section 2: MY LETTERS */}
        {!isSearchEmpty && (activeSection === "all" || activeSection === "letters") && (
          <MyLettersCollection
            lettersWritten={filteredLetters}
            totalLettersCount={lettersWritten.length}
            letterFolders={letterFolders}
            trashLetters={trashLetters}
            limiteCartas={limiteCartas}
            limitePastas={limitePastas}
            searchQuery={searchQuery}
            onClearSearch={() => setSearchQuery("")}
            onRefresh={carregarDadosEstante}
          />
        )}
      </div>

      {showPageChrome && (
        <section className="closing-note" aria-label="A note for the collector">
          <span className="closing-note__ornament" aria-hidden="true">❧</span>
          <p>What is written with care never truly fades.</p>
          <span className="closing-note__sign">
            — Between Letters <span aria-hidden="true">✦</span>
          </span>
        </section>
      )}
    </>
  );
}
