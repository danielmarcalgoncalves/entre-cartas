"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ACTIVE_NOTEBOOK_ID_KEY,
  ACTIVE_NOTEBOOK_PAGE_KEY,
  deleteUserNotebook,
  filterWrittenPages,
  getFontFamilyById,
  getInkColorById,
  getNotebookDates,
  getNotebookTheme,
  getPaperColorById,
  playPaperSound,
  renameUserNotebook,
  type Notebook,
} from "@/lib/journal-storage";

interface MyJournalCollectionProps {
  notebooks: Notebook[];
  limiteCadernos: number;
  onRefresh: () => void;
}

export default function MyJournalCollection({
  notebooks,
  limiteCadernos,
  onRefresh,
}: MyJournalCollectionProps) {
  const router = useRouter();

  // Dark Reading Room State
  const [readingNotebook, setReadingNotebook] = useState<Notebook | null>(null);
  const [readingPageIndex, setReadingPageIndex] = useState<number>(0);

  // Rename Modal State
  const [renamingNotebook, setRenamingNotebook] = useState<Notebook | null>(null);
  const [renameInput, setRenameInput] = useState("");

  // Delete Confirmation Modal State
  const [notebookToDelete, setNotebookToDelete] = useState<Notebook | null>(null);

  const abrirCadernoParaLeitura = (nb: Notebook) => {
    playPaperSound();
    setReadingNotebook(nb);
    setReadingPageIndex(0);
  };

  const continuarEscrevendoCaderno = (nb: Notebook, pageIndex?: number) => {
    playPaperSound();
    const written = filterWrittenPages(nb.paginas);
    const targetPage =
      typeof pageIndex === "number"
        ? pageIndex
        : written.length > 0
        ? written.length - 1
        : 0;

    try {
      window.localStorage.setItem(ACTIVE_NOTEBOOK_ID_KEY, nb.id);
      window.localStorage.setItem(ACTIVE_NOTEBOOK_PAGE_KEY, String(targetPage));
    } catch {}

    setReadingNotebook(null);
    router.push(`/journal?notebook=${encodeURIComponent(nb.id)}&page=${targetPage}`);
  };

  const abrirModalRenomear = (nb: Notebook, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playPaperSound();
    setRenamingNotebook(nb);
    setRenameInput(nb.nome);
  };

  const confirmarRenomear = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingNotebook || !renameInput.trim()) return;
    renameUserNotebook(renamingNotebook.id, renameInput.trim());
    if (readingNotebook && readingNotebook.id === renamingNotebook.id) {
      setReadingNotebook({ ...readingNotebook, nome: renameInput.trim() });
    }
    setRenamingNotebook(null);
    setRenameInput("");
    playPaperSound();
    onRefresh();
  };

  const abrirModalExclusao = (nb: Notebook, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playPaperSound();
    setNotebookToDelete(nb);
  };

  const confirmarExclusaoCaderno = () => {
    if (!notebookToDelete) return;
    deleteUserNotebook(notebookToDelete.id);
    if (readingNotebook && readingNotebook.id === notebookToDelete.id) {
      setReadingNotebook(null);
    }
    setNotebookToDelete(null);
    playPaperSound();
    onRefresh();
  };

  const paginaAnteriorLeitura = () => {
    if (readingPageIndex > 0) {
      playPaperSound();
      setReadingPageIndex(readingPageIndex - 1);
    }
  };

  const proximaPaginaLeitura = () => {
    if (
      readingNotebook &&
      readingPageIndex < Math.max(readingNotebook.paginas.length - 1, 0)
    ) {
      playPaperSound();
      setReadingPageIndex(readingPageIndex + 1);
    }
  };

  const paginasLeitura =
    readingNotebook && readingNotebook.paginas.length > 0
      ? readingNotebook.paginas
      : [
          {
            id: "empty-preview",
            titulo: "",
            conteudo: "",
            dataFormatada: "Blank Volume",
            favoritado: false,
            criadoEm: "",
          },
        ];

  const paginaAtual = paginasLeitura[readingPageIndex] || paginasLeitura[0];

  return (
    <section
      className="my-journal-collection-section"
      id="my-journal"
      aria-labelledby="my-journal-heading"
    >
      <div className="shelf-header">
        <div>
          <span className="section-kicker">HARDBOUND VOLUMES · PERSONAL NOTEBOOKS</span>
          <h2 id="my-journal-heading">My Journal</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: "12px",
              fontFamily: "var(--serif, serif)",
              color: "var(--text-secondary)",
            }}
          >
            {notebooks.length} of {limiteCadernos} journals created
          </span>
          <Link href="/journal?create=1" className="stamp-button">
            + Create a Journal
          </Link>
        </div>
      </div>

      {notebooks.length === 0 ? (
        <div className="empty-journal-box">
          <div className="mini-leather-emblem" style={{ margin: "0 auto 14px" }} aria-hidden="true">
            <span className="mini-leather-emblem__ribbon" />
            <span className="mini-leather-emblem__glyph">✎</span>
          </div>
          <h3>Your story begins here.</h3>
          <p style={{ marginBottom: "18px" }}>
            Create a journal and give your thoughts a place to live.
          </p>
          <Link href="/journal?create=1" className="sober-save-btn" style={{ width: "auto" }}>
            Create a Journal
          </Link>
        </div>
      ) : (
        <div className="shelf-tomes-grid">
          {notebooks.map((nb) => {
            const totalPaginas = filterWrittenPages(nb.paginas).length;
            const dates = getNotebookDates(nb);
            const theme = getNotebookTheme(nb.corCapa);

            return (
              <motion.article
                key={nb.id}
                className={`tome-book-item tome-book-color--${theme.id}`}
                style={{ backgroundColor: theme.shelfBg }}
                onClick={() => abrirCadernoParaLeitura(nb)}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <div className="tome-book-spine-line" aria-hidden="true" />
                <div
                  className="tome-book-ribbon"
                  aria-hidden="true"
                  style={{ backgroundColor: theme.ribbonColor }}
                />

                <div className="tome-book-top">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingRight: "28px",
                    }}
                  >
                    <span className="tome-book-tag">
                      {theme.nome.toUpperCase()} · {theme.etiqueta.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="tome-book-title">{nb.nome}</h3>
                </div>

                <div className="tome-book-bottom-extended">
                  <div className="tome-book-stats">
                    <span className="tome-book-page-count">
                      {totalPaginas}{" "}
                      {totalPaginas === 1 ? "page written" : "pages written"}
                    </span>
                    <span className="tome-book-date">
                      Created: {dates.created}
                    </span>
                    <span className="tome-book-date">
                      Modified: {dates.updated}
                    </span>
                  </div>

                  {/* Journal Card Actions */}
                  <div
                    className="tome-book-actions-bar"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="tome-action-btn tome-action-btn--primary"
                      onClick={() => abrirCadernoParaLeitura(nb)}
                      title={`Open and read "${nb.nome}"`}
                    >
                      Open Journal
                    </button>
                    <button
                      type="button"
                      className="tome-action-btn"
                      onClick={() => continuarEscrevendoCaderno(nb)}
                      title={`Continue writing in "${nb.nome}"`}
                    >
                      Continue Writing ↗
                    </button>
                    <button
                      type="button"
                      className="tome-action-btn"
                      onClick={(e) => abrirModalRenomear(nb, e)}
                      title={`Rename "${nb.nome}"`}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      className="tome-action-btn tome-action-btn--danger"
                      onClick={(e) => abrirModalExclusao(nb, e)}
                      title={`Delete "${nb.nome}"`}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      {/* Dark Reading Room Modal for Opening & Reading a Journal */}
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
            <div
              className="dark-reading-topbar"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="dark-reading-meta">
                <span className="dark-reading-tome-name">
                  {readingNotebook.nome}
                </span>
                <span className="dark-reading-page-indicator">
                  Reading · Page {readingPageIndex + 1} of{" "}
                  {Math.max(readingNotebook.paginas.length, 1)}
                </span>
              </div>

              <div className="dark-reading-actions" style={{ flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="dark-reading-edit-btn"
                  onClick={() =>
                    continuarEscrevendoCaderno(readingNotebook, readingPageIndex)
                  }
                  title="Open this journal on the writing desk to continue writing"
                >
                  <span>✎ CONTINUE WRITING</span>
                </button>

                <button
                  type="button"
                  className="dark-reading-close-btn"
                  onClick={() => abrirModalRenomear(readingNotebook)}
                  title="Rename this journal"
                >
                  Rename
                </button>

                <button
                  type="button"
                  className="dark-reading-delete-btn"
                  onClick={() => abrirModalExclusao(readingNotebook)}
                  title="Permanently delete this journal"
                >
                  <span>DELETE</span>
                </button>

                <button
                  type="button"
                  className="dark-reading-close-btn"
                  onClick={() => setReadingNotebook(null)}
                  title="Close reading room"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            <div
              className="dark-reading-sheet-wrapper"
              onClick={(e) => e.stopPropagation()}
            >
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
                style={{
                  backgroundColor: getPaperColorById(paginaAtual.tipoPapel),
                  color: getInkColorById(paginaAtual.corTinta),
                }}
                initial={{ opacity: 0.85, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <div className="dark-reading-date-badge">
                  <span>{paginaAtual.dataFormatada || "Journal entry"}</span>
                  {paginaAtual.favoritado && (
                    <span
                      style={{
                        color: "var(--color-red-sands, #ad5b30)",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                      }}
                    >
                      FAVORITED ♥
                    </span>
                  )}
                </div>

                {paginaAtual.titulo ? (
                  <h3 className="dark-reading-title">{paginaAtual.titulo}</h3>
                ) : (
                  <div style={{ height: "28px" }} />
                )}

                <div
                  className="dark-reading-body"
                  style={{
                    fontFamily: getFontFamilyById(paginaAtual.fonte || "garamond"),
                    color: getInkColorById(paginaAtual.corTinta),
                  }}
                >
                  {paginaAtual.conteudo || (
                    <em style={{ color: "#8a7c6c" }}>
                      This journal has no written entries yet. Click &ldquo;Continue Writing&rdquo; to begin your first page.
                    </em>
                  )}
                </div>

                <div className="dark-reading-footer">
                  <span>Volume: {readingNotebook.nome}</span>
                  <span>
                    Page {readingPageIndex + 1} of{" "}
                    {Math.max(readingNotebook.paginas.length, 1)}
                  </span>
                </div>
              </motion.article>

              <button
                type="button"
                className="dark-reading-nav-arrow dark-reading-nav-arrow--right"
                onClick={proximaPaginaLeitura}
                disabled={
                  readingPageIndex >= Math.max(readingNotebook.paginas.length - 1, 0)
                }
                title="Next page (→)"
                aria-label="Next page"
              >
                →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rename Journal Modal */}
      <AnimatePresence>
        {renamingNotebook && (
          <div
            className="notebook-drawer-backdrop"
            onClick={() => setRenamingNotebook(null)}
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
                onClick={() => setRenamingNotebook(null)}
                title="Close"
              >
                ✕
              </button>
              <h3 className="drawer-title">Rename Journal</h3>
              <p className="drawer-subtitle">
                Enter a new title for the journal volume &ldquo;{renamingNotebook.nome}&rdquo;.
              </p>

              <form onSubmit={confirmarRenomear} className="new-notebook-form">
                <label className="new-notebook-label">JOURNAL TITLE</label>
                <input
                  type="text"
                  className="new-notebook-input"
                  value={renameInput}
                  onChange={(e) => setRenameInput(e.target.value)}
                  placeholder="Enter journal title..."
                  maxLength={50}
                  autoFocus
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "10px",
                    marginTop: "14px",
                  }}
                >
                  <button
                    type="button"
                    className="stamp-button"
                    onClick={() => setRenamingNotebook(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="new-notebook-btn">
                    Save Title
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Journal Confirmation Modal */}
      <AnimatePresence>
        {notebookToDelete && (
          <div
            className="delete-notebook-modal-backdrop"
            onClick={() => setNotebookToDelete(null)}
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
                <span className="delete-modal-icon" aria-hidden="true">
                  !
                </span>
                <h3 className="delete-modal-title">Permanently Delete Journal</h3>
              </div>

              <div className="delete-modal-body">
                <p className="delete-modal-notice-text">
                  You are about to delete the journal{" "}
                  <strong>“{notebookToDelete.nome}”</strong> and all its{" "}
                  <strong>
                    {filterWrittenPages(notebookToDelete.paginas).length}{" "}
                    {filterWrittenPages(notebookToDelete.paginas).length === 1
                      ? "written page"
                      : "written pages"}
                  </strong>
                  .
                </p>

                <div className="delete-modal-danger-box">
                  <strong>PERMANENT DELETION WARNING:</strong>
                  <p>
                    This journal and all its memories will be permanently deleted from your shelf. This action cannot be undone.
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
                  onClick={() => setNotebookToDelete(null)}
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
