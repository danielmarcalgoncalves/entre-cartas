"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import VintageFolderDrawer from "@/components/VintageFolderDrawer";
import PostalTrashCan from "@/components/PostalTrashCan";
import {
  EnvelopeIcon,
  FolderIcon,
  GridViewIcon,
  LedgerListIcon,
  TrashBinIcon,
} from "@/components/my-shelf/ShelfIcons";
import { api } from "@/services/api";
import {
  ACTIVE_LETTER_EDIT_ID_KEY,
  ACTIVE_LETTER_FOLDER_ID_KEY,
  emptyAllPostalTrash,
  formatShortDate,
  getFontFamilyById,
  getInkColorById,
  getPaperColorById,
  getSealByIdOrLabel,
  moveLetterToFolder,
  moveLetterToPostalTrash,
  permanentlyDeleteLetterFromStorage,
  playPaperSound,
  renameUserLetter,
  restoreLetterFromPostalTrash,
  type JournalEntry,
  type LetterFolder,
} from "@/lib/journal-storage";

interface MyLettersCollectionProps {
  lettersWritten: JournalEntry[];
  totalLettersCount?: number;
  letterFolders: LetterFolder[];
  trashLetters: JournalEntry[];
  limiteCartas: number;
  limitePastas: number;
  searchQuery?: string;
  onClearSearch?: () => void;
  onRefresh: () => void;
}

export default function MyLettersCollection({
  lettersWritten,
  totalLettersCount,
  letterFolders,
  trashLetters,
  limiteCartas,
  limitePastas,
  searchQuery = "",
  onClearSearch,
  onRefresh,
}: MyLettersCollectionProps) {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const effectiveTotalLetters =
    typeof totalLettersCount === "number" ? totalLettersCount : lettersWritten.length;

  // Filter & View state for Correspondence Index
  const [filterMode, setFilterMode] = useState<"all" | "completed" | "draft">("all");
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"cards" | "ledger">("cards");

  // Opened Folder Full View
  const [inspectedFolder, setInspectedFolder] = useState<LetterFolder | null>(null);

  // Trash Bin State
  const trashCanRef = useRef<HTMLDivElement>(null);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
  const [trashFeedback, setTrashFeedback] = useState<string | null>(null);

  // In-app Permanent Delete / Empty Trash Confirmation State
  const [confirmPermanentTarget, setConfirmPermanentTarget] = useState<
    { type: "single"; letter: JournalEntry } | { type: "all" } | null
  >(null);

  // Letter Reader Modal
  const [readingLetter, setReadingLetter] = useState<JournalEntry | null>(null);

  // Rename Letter Modal
  const [renamingLetter, setRenamingLetter] = useState<JournalEntry | null>(null);
  const [renameTitleInput, setRenameTitleInput] = useState("");
  const [renameRecipientInput, setRenameRecipientInput] = useState("");

  // Move Letter Modal
  const [movingLetter, setMovingLetter] = useState<JournalEntry | null>(null);
  const [targetFolderId, setTargetFolderId] = useState("");

  // Escape key closes reading modal
  useEffect(() => {
    if (!readingLetter) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setReadingLetter(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [readingLetter]);

  const handleContinueEditing = (carta: JournalEntry) => {
    playPaperSound();
    try {
      window.localStorage.setItem(ACTIVE_LETTER_EDIT_ID_KEY, String(carta.id));
    } catch {}
    setReadingLetter(null);
    router.push(`/letters?edit=${encodeURIComponent(String(carta.id))}`);
  };

  const handleOpenRename = (carta: JournalEntry, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playPaperSound();
    setRenamingLetter(carta);
    setRenameTitleInput(carta.titulo || "");
    setRenameRecipientInput(carta.destinatario || "");
  };

  const handleConfirmRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingLetter || !renameTitleInput.trim()) return;

    renameUserLetter(
      String(renamingLetter.id),
      renameTitleInput.trim(),
      renameRecipientInput.trim()
    );

    const remoteId =
      renamingLetter.remote_id ||
      (!String(renamingLetter.id).startsWith("entry-")
        ? renamingLetter.id
        : null);

    if (remoteId) {
      try {
        await api.cartas.atualizar(remoteId, {
          titulo: renameTitleInput.trim(),
          destinatario_anonimo: renameRecipientInput.trim() || null,
        });
      } catch {}
    }

    setTrashFeedback(`Letter renamed to "${renameTitleInput.trim()}".`);
    setTimeout(() => setTrashFeedback(null), 3000);
    setRenamingLetter(null);
    onRefresh();
  };

  const handleDiscardToTrash = (carta: JournalEntry) => {
    playPaperSound();
    moveLetterToPostalTrash(carta);
    setReadingLetter(null);
    setTrashFeedback(`"${carta.titulo || "Letter"}" moved to Postal Discards.`);
    setTimeout(() => setTrashFeedback(null), 3500);
    onRefresh();
  };

  const handleRestoreFromTrash = (carta: JournalEntry) => {
    playPaperSound();
    restoreLetterFromPostalTrash(carta);
    setTrashFeedback(`"${carta.titulo || "Letter"}" restored to archive.`);
    setTimeout(() => setTrashFeedback(null), 3500);
    onRefresh();
  };

  const executePermanentDelete = async () => {
    if (!confirmPermanentTarget) return;

    if (confirmPermanentTarget.type === "all") {
      emptyAllPostalTrash();
      setConfirmPermanentTarget(null);
      setTrashFeedback("Postal discards emptied permanently.");
      setTimeout(() => setTrashFeedback(null), 3500);
      onRefresh();
      return;
    }

    const carta = confirmPermanentTarget.letter;
    permanentlyDeleteLetterFromStorage(String(carta.id));
    const remoteId =
      carta.remote_id ||
      (!String(carta.id).startsWith("entry-") ? carta.id : null);
    if (remoteId) {
      try {
        await api.cartas.excluir(remoteId);
      } catch {}
    }

    setConfirmPermanentTarget(null);
    setTrashFeedback(`"${carta.titulo || "Letter"}" permanently deleted.`);
    setTimeout(() => setTrashFeedback(null), 3500);
    onRefresh();
  };

  const handleConfirmMove = (e: React.FormEvent) => {
    e.preventDefault();
    if (!movingLetter || !targetFolderId) return;
    const dest = letterFolders.find((f) => f.id === targetFolderId);
    if (!dest) return;
    moveLetterToFolder(String(movingLetter.id), dest.id, dest.nome);
    setMovingLetter(null);
    playPaperSound();
    setTrashFeedback(`Moved to "${dest.nome}".`);
    setTimeout(() => setTrashFeedback(null), 3000);
    onRefresh();
  };

  const handleWriteInFolder = (folder: LetterFolder) => {
    playPaperSound();
    try {
      window.localStorage.setItem(ACTIVE_LETTER_FOLDER_ID_KEY, folder.id);
    } catch {}
    router.push("/letters");
  };

  const filteredLetters = lettersWritten.filter((carta) => {
    if (filterMode === "draft" && carta.status !== "draft") return false;
    if (filterMode === "completed" && carta.status === "draft") return false;
    if (selectedFolderFilter !== "all") {
      const defaultFolderId = letterFolders[0]?.id;
      const matches =
        carta.pasta_id === selectedFolderFilter ||
        (!carta.pasta_id && selectedFolderFilter === defaultFolderId);
      if (!matches) return false;
    }
    return true;
  });

  const hasSearch = searchQuery.trim().length > 0;

  return (
    <section
      className="cabinet-section"
      id="my-letters"
      aria-labelledby="letters-section-title"
    >
      {/* Top Header */}
      <div className="cabinet-section-header">
        <div className="cabinet-section-title-wrap">
          <span className="cabinet-section-emblem" aria-hidden="true">
            <EnvelopeIcon size={17} />
          </span>
          <h2 id="letters-section-title" className="cabinet-section-title">
            My Letters
          </h2>
        </div>

        <div className="cabinet-section-meta">
          <span className="cabinet-count-note">
            {hasSearch
              ? `${lettersWritten.length} matching of ${effectiveTotalLetters} letters`
              : `${effectiveTotalLetters} of ${limiteCartas} letters · ${letterFolders.length} of ${limitePastas} folders`}
          </span>
          {trashLetters.length > 0 && (
            <button
              type="button"
              className="postal-trash-counter-badge"
              onClick={() => setIsTrashModalOpen(true)}
              title="Open Postal Discards"
            >
              <TrashBinIcon size={12} />
              <span>{trashLetters.length} discarded</span>
            </button>
          )}
          <Link href="/letters" className="cabinet-inline-btn">
            + Write a Letter
          </Link>
        </div>
      </div>

      {/* Toast Feedback */}
      <AnimatePresence>
        {trashFeedback && (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: -10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="postal-trash-toast"
            role="status"
          >
            <span className="postal-trash-toast-icon" aria-hidden="true">✦</span>
            <span className="postal-trash-toast-text">{trashFeedback}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Study Cabinet: Either Opened Folder View or Interactive Vintage Filing Drawer + Discard Station */}
      {inspectedFolder ? (
        <div className="opened-folder-view">
          <div className="opened-folder-banner">
            <button
              type="button"
              className="back-to-drawer-btn"
              onClick={() => {
                playPaperSound();
                setInspectedFolder(null);
              }}
            >
              ← Back to Filing Drawer
            </button>

            <div className="opened-folder-heading">
              <span className="opened-folder-kicker">PHYSICAL CORRESPONDENCE FOLDER</span>
              <h3>{inspectedFolder.nome}</h3>
              <p>
                {lettersWritten.filter((l) => l.pasta_id === inspectedFolder.id).length} letters archived in this folder.
              </p>
            </div>

            <button
              type="button"
              className="cabinet-primary-btn"
              onClick={() => handleWriteInFolder(inspectedFolder)}
            >
              + Write Letter in this Folder
            </button>
          </div>

          {lettersWritten.filter((l) => l.pasta_id === inspectedFolder.id).length === 0 ? (
            <div className="empty-journal-box" style={{ margin: "28px 0" }}>
              <p>No correspondence in &ldquo;{inspectedFolder.nome}&rdquo; yet.</p>
              <button
                type="button"
                className="cabinet-primary-btn"
                style={{ margin: "14px auto 0" }}
                onClick={() => handleWriteInFolder(inspectedFolder)}
              >
                Write First Letter Here
              </button>
            </div>
          ) : (
            <div className="my-letters-stationery-grid">
              {lettersWritten
                .filter((l) => l.pasta_id === inspectedFolder.id)
                .map((carta) => {
                  const seal = getSealByIdOrLabel(carta.selo_carta || carta.humor);
                  const isDraft = carta.status === "draft";

                  return (
                    <motion.article
                      key={carta.id}
                      className="stationery-letter-card"
                      whileHover={prefersReducedMotion ? undefined : { y: -4 }}
                      transition={{ duration: 0.18 }}
                      onClick={() => setReadingLetter(carta)}
                    >
                      <div className="stationery-letter-card-seal-bar">
                        <span className="stationery-card-seal-tag" style={{ color: seal.color }}>
                          {isDraft ? "DRAFT" : seal.code}
                        </span>
                        {isDraft && <span className="stationery-card-draft-badge">Draft</span>}
                      </div>

                      <h3 className="stationery-letter-card-title">
                        {carta.titulo || "Untitled Letter"}
                      </h3>

                      {carta.destinatario && (
                        <p className="stationery-letter-card-recipient">To: {carta.destinatario}</p>
                      )}

                      <p className="stationery-letter-card-snippet">
                        {carta.conteudo ? carta.conteudo.slice(0, 110) + "…" : "Blank letter sheet."}
                      </p>

                      <div
                        className="stationery-letter-card-footer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="stationery-letter-card-date">
                          {formatShortDate(carta.criado_em || carta.data_formatada)}
                        </span>
                        <div className="card-actions-row">
                          <button
                            type="button"
                            className="card-mini-btn"
                            onClick={() => handleContinueEditing(carta)}
                            title="Edit letter"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="card-mini-btn"
                            onClick={() => {
                              setMovingLetter(carta);
                              setTargetFolderId(inspectedFolder.id);
                            }}
                            title="Move to another folder"
                          >
                            Move
                          </button>
                          <button
                            type="button"
                            className="card-mini-btn danger"
                            onClick={() => handleDiscardToTrash(carta)}
                            title="Discard letter"
                          >
                            Discard
                          </button>
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
            </div>
          )}
        </div>
      ) : (
        <div className="cabinet-stage-grid">
          <div className="cabinet-drawer-frame">
            <VintageFolderDrawer
              folders={letterFolders}
              letters={lettersWritten}
              quotaLimit={limitePastas}
              onOpenFolderView={(f) => {
                playPaperSound();
                setInspectedFolder(f);
              }}
              onReadLetter={(letter) => setReadingLetter(letter)}
              onDiscardLetter={(letter) => handleDiscardToTrash(letter)}
              onRefresh={onRefresh}
            />
          </div>

          <div className="cabinet-discard-station" ref={trashCanRef}>
            <span className="cabinet-discard-plate">DISCARD STATION</span>
            <PostalTrashCan
              isOpen={false}
              count={trashLetters.length}
              onClick={() => setIsTrashModalOpen(true)}
            />
            <span className="postal-trash-label">
              {trashLetters.length === 0
                ? "Bin Empty"
                : `${trashLetters.length} ${trashLetters.length === 1 ? "Letter" : "Letters"} Discarded`}
            </span>
            <button
              type="button"
              className="postal-trash-open-btn"
              onClick={() => setIsTrashModalOpen(true)}
            >
              Inspect Discards
            </button>
          </div>
        </div>
      )}

      {/* Correspondence Index (Stationery Cards or Archival Ledger) */}
      {!inspectedFolder && lettersWritten.length > 0 && (
        <div className="letters-overview-section">
          <div className="correspondence-index-bar">
            <div className="correspondence-filter-groups">
              <div className="correspondence-pill-group" role="tablist" aria-label="Filter letters by status">
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterMode === "all"}
                  className={`correspondence-pill ${filterMode === "all" ? "is-active" : ""}`}
                  onClick={() => setFilterMode("all")}
                >
                  All ({lettersWritten.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterMode === "completed"}
                  className={`correspondence-pill ${filterMode === "completed" ? "is-active" : ""}`}
                  onClick={() => setFilterMode("completed")}
                >
                  Sealed ({lettersWritten.filter((l) => l.status !== "draft").length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterMode === "draft"}
                  className={`correspondence-pill ${filterMode === "draft" ? "is-active" : ""}`}
                  onClick={() => setFilterMode("draft")}
                >
                  Drafts ({lettersWritten.filter((l) => l.status === "draft").length})
                </button>
              </div>

              {letterFolders.length > 0 && (
                <div className="correspondence-pill-group" aria-label="Filter by folder">
                  <button
                    type="button"
                    className={`correspondence-pill ${selectedFolderFilter === "all" ? "is-active" : ""}`}
                    onClick={() => setSelectedFolderFilter("all")}
                  >
                    All Folders
                  </button>
                  {letterFolders.map((folder) => (
                    <button
                      key={folder.id}
                      type="button"
                      className={`correspondence-pill ${
                        selectedFolderFilter === folder.id ? "is-active" : ""
                      }`}
                      onClick={() => setSelectedFolderFilter(folder.id)}
                    >
                      <FolderIcon size={12} />
                      <span>{folder.nome}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="view-mode-switch" role="group" aria-label="Letter layout view">
              <button
                type="button"
                className={`view-mode-btn ${viewMode === "cards" ? "is-active" : ""}`}
                onClick={() => setViewMode("cards")}
                aria-pressed={viewMode === "cards"}
              >
                <GridViewIcon size={13} />
                <span>Cards</span>
              </button>
              <button
                type="button"
                className={`view-mode-btn ${viewMode === "ledger" ? "is-active" : ""}`}
                onClick={() => setViewMode("ledger")}
                aria-pressed={viewMode === "ledger"}
              >
                <LedgerListIcon size={13} />
                <span>Ledger</span>
              </button>
            </div>
          </div>

          {filteredLetters.length === 0 ? (
            <div className="empty-journal-box">
              <p>No letters match the current status or folder filter.</p>
              <button
                type="button"
                className="cabinet-secondary-btn"
                style={{ marginTop: "12px" }}
                onClick={() => {
                  setFilterMode("all");
                  setSelectedFolderFilter("all");
                  if (onClearSearch && hasSearch) onClearSearch();
                }}
              >
                Reset Letter Filters
              </button>
            </div>
          ) : viewMode === "cards" ? (
            <div className="my-letters-stationery-grid">
              {filteredLetters.map((carta) => {
                const seal = getSealByIdOrLabel(carta.selo_carta || carta.humor);
                const folderName =
                  carta.pasta_nome ||
                  letterFolders.find((f) => f.id === carta.pasta_id)?.nome ||
                  letterFolders[0]?.nome ||
                  "General";
                const isDraft = carta.status === "draft";

                return (
                  <motion.article
                    key={carta.id}
                    className="stationery-letter-card"
                    whileHover={prefersReducedMotion ? undefined : { y: -4 }}
                    transition={{ duration: 0.18 }}
                    onClick={() => setReadingLetter(carta)}
                  >
                    <div className="stationery-letter-card-seal-bar">
                      <span className="stationery-card-seal-tag" style={{ color: seal.color }}>
                        {isDraft ? "DRAFT" : seal.code}
                      </span>
                      <span className="stationery-card-folder-badge">
                        <FolderIcon size={11} />
                        <span>{folderName}</span>
                      </span>
                      {isDraft && <span className="stationery-card-draft-badge">Draft</span>}
                    </div>

                    <h3 className="stationery-letter-card-title">
                      {carta.titulo || "Untitled Letter"}
                    </h3>

                    {carta.destinatario && (
                      <p className="stationery-letter-card-recipient">To: {carta.destinatario}</p>
                    )}

                    <p className="stationery-letter-card-snippet">
                      {carta.conteudo ? carta.conteudo.slice(0, 110) + "…" : "Blank letter sheet."}
                    </p>

                    <div
                      className="stationery-letter-card-footer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="stationery-letter-card-date">
                        {formatShortDate(carta.criado_em || carta.data_formatada)}
                      </span>
                      <div className="card-actions-row">
                        <button
                          type="button"
                          className="card-mini-btn"
                          onClick={() => handleContinueEditing(carta)}
                          title="Edit letter"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="card-mini-btn"
                          onClick={() => {
                            setMovingLetter(carta);
                            setTargetFolderId(carta.pasta_id || letterFolders[0]?.id || "");
                          }}
                          title="Move to another folder"
                        >
                          Move
                        </button>
                        <button
                          type="button"
                          className="card-mini-btn danger"
                          onClick={() => handleDiscardToTrash(carta)}
                          title="Discard letter"
                        >
                          Discard
                        </button>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          ) : (
            <div className="archival-ledger-list" role="list">
              {filteredLetters.map((carta) => {
                const seal = getSealByIdOrLabel(carta.selo_carta || carta.humor);
                const folderName =
                  carta.pasta_nome ||
                  letterFolders.find((f) => f.id === carta.pasta_id)?.nome ||
                  letterFolders[0]?.nome ||
                  "General";
                const isDraft = carta.status === "draft";

                return (
                  <div
                    key={carta.id}
                    role="listitem"
                    className="archival-ledger-row"
                    onClick={() => setReadingLetter(carta)}
                  >
                    <span className="archival-ledger-seal" style={{ color: seal.color }}>
                      {isDraft ? "DRAFT" : seal.code}
                    </span>
                    <div className="archival-ledger-main">
                      <h3 className="archival-ledger-title">
                        {carta.titulo || "Untitled Letter"}
                      </h3>
                      {carta.destinatario && (
                        <span className="archival-ledger-recipient">
                          To: {carta.destinatario}
                        </span>
                      )}
                    </div>
                    <span className="archival-ledger-folder">
                      <FolderIcon size={12} />
                      <span>{folderName}</span>
                    </span>
                    <span className="archival-ledger-date">
                      {formatShortDate(carta.criado_em || carta.data_formatada)}
                    </span>
                    <div className="card-actions-row" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="card-mini-btn"
                        onClick={() => handleContinueEditing(carta)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="card-mini-btn"
                        onClick={() => {
                          setMovingLetter(carta);
                          setTargetFolderId(carta.pasta_id || letterFolders[0]?.id || "");
                        }}
                      >
                        Move
                      </button>
                      <button
                        type="button"
                        className="card-mini-btn danger"
                        onClick={() => handleDiscardToTrash(carta)}
                      >
                        Discard
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Letter Reading Modal */}
      <AnimatePresence>
        {readingLetter && (
          <div className="entry-modal-backdrop" onClick={() => setReadingLetter(null)}>
            <motion.article
              className="entry-modal-sheet"
              style={{
                backgroundColor: getPaperColorById(readingLetter.tipo_papel),
                color: getInkColorById(readingLetter.cor_tinta),
              }}
              onClick={(e) => e.stopPropagation()}
              initial={prefersReducedMotion ? false : { scale: 0.94, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 12 }}
              role="dialog"
              aria-modal="true"
              aria-label={readingLetter.titulo || "Letter"}
            >
              <div className="entry-modal-header">
                <div>
                  <span className="entry-modal-kicker">
                    {readingLetter.status === "draft" ? "SAVED LETTER DRAFT" : "SEALED CORRESPONDENCE"}
                  </span>
                  <h2>{readingLetter.titulo}</h2>
                  {readingLetter.destinatario && (
                    <div
                      style={{
                        fontFamily: "var(--serif-title)",
                        fontStyle: "italic",
                        fontSize: "17px",
                        color: "#524334",
                        marginBottom: "4px",
                      }}
                    >
                      To: {readingLetter.destinatario}
                    </div>
                  )}
                  <span className="entry-modal-date">
                    Created: {formatShortDate(readingLetter.criado_em || readingLetter.data_formatada)}
                    {readingLetter.atualizado_em
                      ? ` · Modified: ${formatShortDate(readingLetter.atualizado_em)}`
                      : ""}
                  </span>
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setReadingLetter(null)}
                  aria-label="Close letter"
                >
                  ✕
                </button>
              </div>

              <div className="entry-modal-body">
                <div
                  className="entry-modal-text"
                  style={{
                    fontFamily: getFontFamilyById(readingLetter.fonte || "caveat"),
                    color: getInkColorById(readingLetter.cor_tinta),
                  }}
                >
                  {readingLetter.conteudo.split("\n").map((paragrafo: string, idx: number) => (
                    <p key={idx}>{paragrafo}</p>
                  ))}
                </div>
                {readingLetter.assinatura && (
                  <div
                    style={{
                      textAlign: "right",
                      fontFamily: "var(--hand, cursive)",
                      fontSize: "22px",
                      color: "#4a3b2c",
                      marginTop: "12px",
                    }}
                  >
                    — {readingLetter.assinatura}
                  </div>
                )}
              </div>

              <div className="entry-modal-footer" style={{ flexWrap: "wrap", gap: "10px" }}>
                <span
                  style={{
                    fontFamily: "var(--serif, serif)",
                    fontSize: "12px",
                    color: "var(--color-red-sands, #ad5b30)",
                    fontWeight: 700,
                  }}
                >
                  STAMP: {readingLetter.selo_carta || "CORRESPONDENCE"}
                </span>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="entry-modal-close"
                    style={{
                      background: "var(--color-red-sands, #ad5b30)",
                      color: "#fcfbf7",
                      borderColor: "var(--color-red-sands, #ad5b30)",
                      fontWeight: 600,
                    }}
                    onClick={() => handleContinueEditing(readingLetter)}
                  >
                    Continue Editing
                  </button>
                  <button
                    type="button"
                    className="entry-modal-close"
                    onClick={() => handleOpenRename(readingLetter)}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className="entry-modal-close"
                    style={{ color: "#991b1b", borderColor: "rgba(153,27,27,0.4)" }}
                    onClick={() => handleDiscardToTrash(readingLetter)}
                  >
                    Discard to Trash
                  </button>
                  <button
                    type="button"
                    className="entry-modal-close"
                    onClick={() => setReadingLetter(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.article>
          </div>
        )}
      </AnimatePresence>

      {/* Rename Letter Modal */}
      <AnimatePresence>
        {renamingLetter && (
          <div className="notebook-drawer-backdrop" onClick={() => setRenamingLetter(null)}>
            <motion.div
              className="notebook-drawer-sheet"
              onClick={(e) => e.stopPropagation()}
              initial={prefersReducedMotion ? false : { scale: 0.94, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 12 }}
              role="dialog"
              aria-modal="true"
              aria-label="Rename Letter"
            >
              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => setRenamingLetter(null)}
                title="Close"
                aria-label="Close rename modal"
              >
                ✕
              </button>
              <h3 className="drawer-title">Rename Letter</h3>
              <p className="drawer-subtitle">
                Update the title or recipient for &ldquo;{renamingLetter.titulo}&rdquo;.
              </p>

              <form onSubmit={handleConfirmRename} className="new-notebook-form">
                <label className="new-notebook-label" htmlFor="rename-letter-title">
                  LETTER TITLE
                </label>
                <input
                  id="rename-letter-title"
                  type="text"
                  className="new-notebook-input"
                  value={renameTitleInput}
                  onChange={(e) => setRenameTitleInput(e.target.value)}
                  placeholder="Enter letter title..."
                  maxLength={80}
                  autoFocus
                />

                <label
                  className="new-notebook-label"
                  htmlFor="rename-letter-recipient"
                  style={{ marginTop: "10px" }}
                >
                  RECIPIENT (OPTIONAL)
                </label>
                <input
                  id="rename-letter-recipient"
                  type="text"
                  className="new-notebook-input"
                  value={renameRecipientInput}
                  onChange={(e) => setRenameRecipientInput(e.target.value)}
                  placeholder="To: (optional recipient)..."
                  maxLength={80}
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
                    onClick={() => setRenamingLetter(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="new-notebook-btn">
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Move Letter to Folder Modal */}
      <AnimatePresence>
        {movingLetter && (
          <div className="entry-modal-backdrop" onClick={() => setMovingLetter(null)}>
            <motion.div
              className="minimal-folder-modal"
              onClick={(e) => e.stopPropagation()}
              initial={prefersReducedMotion ? false : { scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              role="dialog"
              aria-modal="true"
              aria-label="Move Letter to Folder"
            >
              <h3>Move Letter to Folder</h3>
              <p>Select target folder for &ldquo;{movingLetter.titulo}&rdquo;:</p>
              <form onSubmit={handleConfirmMove}>
                <select
                  className="letter-minimal-select"
                  style={{ width: "100%", marginBottom: "16px" }}
                  value={targetFolderId}
                  onChange={(e) => setTargetFolderId(e.target.value)}
                  aria-label="Target folder"
                >
                  {letterFolders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </select>
                <div className="modal-actions-row">
                  <button
                    type="button"
                    className="modal-cancel-btn"
                    onClick={() => setMovingLetter(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="modal-confirm-btn">
                    Move Letter
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Postal Trash Modal */}
      <AnimatePresence>
        {isTrashModalOpen && (
          <div className="entry-modal-backdrop" onClick={() => setIsTrashModalOpen(false)}>
            <motion.div
              className="postal-trash-modal"
              onClick={(e) => e.stopPropagation()}
              initial={prefersReducedMotion ? false : { scale: 0.94, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
              role="dialog"
              aria-modal="true"
              aria-label="Postal Discards"
            >
              <div className="postal-trash-modal-header">
                <div>
                  <span className="entry-modal-kicker">DISCARD ARCHIVE</span>
                  <h2
                    style={{
                      fontFamily: "var(--serif-title, var(--serif))",
                      margin: "4px 0",
                      fontSize: "22px",
                      color: "var(--color-birch-paper)",
                    }}
                  >
                    Postal Discards
                  </h2>
                  <p className="postal-trash-modal-sub">
                    Discarded letters are safely held here. You can restore them to your folders, read them, or delete them permanently.
                  </p>
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setIsTrashModalOpen(false)}
                  aria-label="Close Postal Discards"
                >
                  ✕
                </button>
              </div>

              <div className="postal-trash-modal-body">
                {trashLetters.length === 0 ? (
                  <div className="postal-trash-empty">
                    <p className="postal-trash-empty-title">The postal discard bin is empty</p>
                    <p className="postal-trash-empty-desc">
                      Letters discarded from your correspondence folders will appear here safely.
                    </p>
                  </div>
                ) : (
                  <div className="postal-trash-list">
                    {trashLetters.map((carta) => {
                      const seal = getSealByIdOrLabel(carta.selo_carta || carta.humor);
                      return (
                        <div key={carta.id} className="postal-trash-item">
                          <div className="postal-trash-item-info">
                            <span className="postal-trash-item-badge" style={{ color: seal.color }}>
                              {seal.code}
                            </span>
                            <div>
                              <h4 className="postal-trash-item-title">
                                {carta.titulo || "Untitled"}
                              </h4>
                              <span className="postal-trash-item-meta">
                                {carta.destinatario ? `To: ${carta.destinatario} · ` : ""}
                                {formatShortDate(carta.criado_em || carta.data_formatada)}
                              </span>
                            </div>
                          </div>
                          <div className="postal-trash-item-actions">
                            <button
                              type="button"
                              className="postal-trash-action-btn"
                              onClick={() => setReadingLetter(carta)}
                              title="Read discarded letter"
                            >
                              Read
                            </button>
                            <button
                              type="button"
                              className="postal-trash-action-btn restore"
                              onClick={() => handleRestoreFromTrash(carta)}
                              title="Restore letter back to archive"
                            >
                              Restore
                            </button>
                            <button
                              type="button"
                              className="postal-trash-action-btn permanent"
                              onClick={() =>
                                setConfirmPermanentTarget({ type: "single", letter: carta })
                              }
                              title="Delete permanently"
                            >
                              Delete Permanently
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {trashLetters.length > 0 && (
                <div className="postal-trash-modal-footer">
                  <button
                    type="button"
                    className="postal-trash-empty-all-btn"
                    onClick={() => setConfirmPermanentTarget({ type: "all" })}
                  >
                    Empty Discards ({trashLetters.length})
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Permanent Delete Confirmation Modal */}
      <AnimatePresence>
        {confirmPermanentTarget && (
          <div
            className="delete-notebook-modal-backdrop"
            onClick={() => setConfirmPermanentTarget(null)}
          >
            <motion.div
              className="delete-notebook-modal-sheet"
              onClick={(e) => e.stopPropagation()}
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ duration: 0.2 }}
              role="dialog"
              aria-modal="true"
              aria-label="Confirm permanent deletion"
            >
              <div className="delete-modal-warning-header">
                <span className="delete-modal-icon" aria-hidden="true">
                  !
                </span>
                <h3 className="delete-modal-title">
                  {confirmPermanentTarget.type === "all"
                    ? "Empty Postal Discards"
                    : "Permanently Delete Letter"}
                </h3>
              </div>

              <div className="delete-modal-body">
                <p className="delete-modal-notice-text">
                  {confirmPermanentTarget.type === "all" ? (
                    <>
                      You are about to permanently delete all{" "}
                      <strong>{trashLetters.length}</strong> discarded letters.
                    </>
                  ) : (
                    <>
                      You are about to permanently delete{" "}
                      <strong>
                        “{confirmPermanentTarget.letter.titulo || "Untitled Letter"}”
                      </strong>
                      .
                    </>
                  )}
                </p>

                <div className="delete-modal-danger-box">
                  <strong>PERMANENT DELETION WARNING:</strong>
                  <p>
                    This action cannot be undone and the correspondence will be removed from your archive forever.
                  </p>
                </div>
              </div>

              <div className="delete-modal-actions">
                <button
                  type="button"
                  className="delete-modal-cancel-btn"
                  onClick={() => setConfirmPermanentTarget(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="delete-modal-confirm-btn"
                  onClick={executePermanentDelete}
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
