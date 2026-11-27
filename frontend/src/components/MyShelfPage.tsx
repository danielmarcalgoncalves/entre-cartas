"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import MyJournalCollection from "@/components/MyJournalCollection";
import { GuestAccountPromptCard } from "@/components/GuestSavePromptModal";
import {
  BookVolumeIcon,
  CloseIcon,
  QuillIcon,
  SearchIcon,
  SortArrowsIcon,
} from "@/components/my-shelf/ShelfIcons";
import {
  JOURNAL_UPDATED_EVENT,
  filterWrittenPages,
  getNotebookTheme,
  loadUserNotebooks,
  type Notebook,
} from "@/lib/journal-storage";
import "./my-shelf/my-shelf.css";

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

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<ShelfSort>("recent");

  const [notebooks, setNotebooks] = useState<Notebook[]>([]);

  const limiteCadernos = isPro ? 10 : 3;

  const carregarDadosEstante = useCallback(() => {
    if (authLoading || !user) return;
    const userNbs = loadUserNotebooks(user?.id).map((n) => ({
      ...n,
      paginas: filterWrittenPages(n.paginas),
    }));
    setNotebooks(userNbs);
  }, [user, authLoading]);

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

  const isShelfCompletelyEmpty = notebooks.length === 0;
  const hasActiveSearch = normalizedQuery.length > 0;
  const isSearchEmpty =
    !isShelfCompletelyEmpty &&
    hasActiveSearch &&
    filteredNotebooks.length === 0;

  const journalPct = Math.min(100, Math.round((notebooks.length / limiteCadernos) * 100));

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
                Every leather-bound journal volume you have created rests here—catalogued, preserved, and ready to reopen whenever memory calls.
              </p>
            </div>

            <div className="cabinet-quick-actions">
              <Link href="/journal?create=1" className="cabinet-primary-btn">
                <BookVolumeIcon size={15} />
                <span>Create a Journal</span>
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
          <div className="catalog-tabs" aria-label="Archive section">
            <span className="catalog-tab-btn is-active" style={{ cursor: "default" }}>
              <span className="catalog-tab-pill" aria-hidden="true" />
              <span className="catalog-tab-label">My Journals</span>
              <span className="catalog-tab-count">{filteredNotebooks.length}</span>
            </span>
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
                placeholder="Search journals, titles, or pages…"
                aria-label="Search journals"
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
            </div>

            <h2 className="cabinet-empty-title">Your shelf is waiting for memories.</h2>
            <p className="cabinet-empty-desc">
              Begin a leather-bound journal—every volume and page you write will be catalogued here.
            </p>

            <div className="my-shelf-master-empty-state__actions">
              <Link href="/journal?create=1" className="cabinet-primary-btn">
                Create a Journal
              </Link>
            </div>
          </motion.section>
        )}

        {/* Search No-Match State */}
        {isSearchEmpty && (
          <section className="cabinet-empty-state" aria-live="polite">
            <h2 className="cabinet-empty-title">No journals match “{searchQuery.trim()}”</h2>
            <p className="cabinet-empty-desc">
              Try a different journal title or phrase—or clear the search to browse your full collection.
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

        {/* MY JOURNAL Collection */}
        {!isSearchEmpty && (
          <MyJournalCollection
            notebooks={filteredNotebooks}
            totalCount={notebooks.length}
            limiteCadernos={limiteCadernos}
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
