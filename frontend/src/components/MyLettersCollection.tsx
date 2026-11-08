"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Folder from "@/components/ReactBitsFolder/Folder";
import PostalTrashCan from "@/components/PostalTrashCan";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/services/api";
import {
  ACTIVE_LETTER_EDIT_ID_KEY,
  emptyAllPostalTrash,
  formatShortDate,
  getFolderTheme,
  getFontFamilyById,
  getInkColorById,
  getPaperColorById,
  getSealByIdOrLabel,
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
  letterFolders: LetterFolder[];
  trashLetters: JournalEntry[];
  limiteCartas: number;
  limitePastas: number;
  onRefresh: () => void;
}

export default function MyLettersCollection({
  lettersWritten,
  letterFolders,
  trashLetters,
  limiteCartas,
  limitePastas,
  onRefresh,
}: MyLettersCollectionProps) {
  const router = useRouter();
  const { theme } = useTheme();

  // Filter state for Stationery Cards Grid
  const [filterMode, setFilterMode] = useState<"all" | "completed" | "draft">("all");
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string>("all");

  // 3D Folders & Trash Bin State
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const trashCanRef = useRef<HTMLDivElement>(null);
  const [isTrashHovered, setIsTrashHovered] = useState(false);
  const [isTrashShaking, setIsTrashShaking] = useState(false);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
  const [trashFeedback, setTrashFeedback] = useState<string | null>(null);

  // Letter Reader Modal
  const [readingLetter, setReadingLetter] = useState<JournalEntry | null>(null);

  // Rename Letter Modal
  const [renamingLetter, setRenamingLetter] = useState<JournalEntry | null>(null);
  const [renameTitleInput, setRenameTitleInput] = useState("");
  const [renameRecipientInput, setRenameRecipientInput] = useState("");

  // Delete Letter Confirmation Modal
  const [letterToDelete, setLetterToDelete] = useState<JournalEntry | null>(null);

  const continuarEditandoCarta = (carta: JournalEntry) => {
    playPaperSound();
    try {
      window.localStorage.setItem(ACTIVE_LETTER_EDIT_ID_KEY, String(carta.id));
    } catch {}
    setReadingLetter(null);
    router.push(`/letters?edit=${encodeURIComponent(String(carta.id))}`);
  };

  const abrirModalRenomearCarta = (carta: JournalEntry, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playPaperSound();
    setRenamingLetter(carta);
    setRenameTitleInput(carta.titulo || "");
    setRenameRecipientInput(carta.destinatario || "");
  };

  const confirmarRenomearCarta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingLetter || !renameTitleInput.trim()) return;

    renameUserLetter(
      String(renamingLetter.id),
      renameTitleInput.trim(),
      renameRecipientInput.trim()
    );

    const remoteId =
      renamingLetter.remote_id ||
      (!String(renamingLetter.id).startsWith("entry-") ? renamingLetter.id : null);
    if (remoteId) {
      try {
        await api.cartas.atualizar(remoteId, {
          titulo: renameTitleInput.trim(),
          destinatario_anonimo: renameRecipientInput.trim() || null,
        });
      } catch {}
    }

    if (readingLetter && String(readingLetter.id) === String(renamingLetter.id)) {
      setReadingLetter({
        ...readingLetter,
        titulo: renameTitleInput.trim(),
        destinatario: renameRecipientInput.trim() || undefined,
        atualizado_em: new Date().toISOString(),
      });
    }

    setRenamingLetter(null);
    playPaperSound();
    onRefresh();
    setTrashFeedback(`Letter renamed to "${renameTitleInput.trim()}".`);
    setTimeout(() => setTrashFeedback(null), 3200);
  };

  const descartarCartaParaLixeira = (carta: JournalEntry) => {
    moveLetterToPostalTrash(carta);
    setIsTrashShaking(true);
    setTimeout(() => setIsTrashShaking(false), 750);
    setTrashFeedback(`"${carta.titulo || "Letter"}" was moved to postal discards.`);
    setTimeout(() => setTrashFeedback(null), 4000);
    onRefresh();
  };

  const confirmarExclusaoCartaModal = async (permanent: boolean) => {
    if (!letterToDelete) return;
    playPaperSound();

    if (permanent) {
      permanentlyDeleteLetterFromStorage(String(letterToDelete.id));
      const remoteId =
        letterToDelete.remote_id ||
        (!String(letterToDelete.id).startsWith("entry-") ? letterToDelete.id : null);
      if (remoteId) {
        try {
          await api.cartas.excluir(remoteId);
        } catch {}
      }
      setTrashFeedback(`"${letterToDelete.titulo || "Letter"}" was permanently deleted.`);
    } else {
      descartarCartaParaLixeira(letterToDelete);
    }

    if (readingLetter && String(readingLetter.id) === String(letterToDelete.id)) {
      setReadingLetter(null);
    }
    setLetterToDelete(null);
    setTimeout(() => setTrashFeedback(null), 4000);
    onRefresh();
  };

  const restaurarCarta = (carta: JournalEntry) => {
    restoreLetterFromPostalTrash(carta);
    setTrashFeedback(`"${carta.titulo || "Letter"}" was restored to its folder.`);
    setTimeout(() => setTrashFeedback(null), 4000);
    onRefresh();
  };

  const excluirCartaPermanentementeDaLixeira = async (carta: JournalEntry) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete "${
          carta.titulo || "Letter"
        }"? This action cannot be undone.`
      )
    ) {
      return;
    }

    permanentlyDeleteLetterFromStorage(String(carta.id));
    const remoteId =
      carta.remote_id ||
      (!String(carta.id).startsWith("entry-") ? carta.id : null);
    if (remoteId) {
      try {
        await api.cartas.excluir(remoteId);
      } catch {}
    }

    setTrashFeedback(`"${carta.titulo || "Letter"}" was permanently deleted.`);
    setTimeout(() => setTrashFeedback(null), 4000);
    onRefresh();
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

    emptyAllPostalTrash();
    setTrashFeedback("Postal discards emptied permanently.");
    setTimeout(() => setTrashFeedback(null), 4000);
    onRefresh();
  };

  const handleItemDrag = (info: {
    index: number;
    clientX: number;
    clientY: number;
    item: any;
  }) => {
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
    info: {
      index: number;
      clientX: number;
      clientY: number;
      item: any;
      inside: boolean;
    },
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
      if (carta && !String(carta.id).startsWith("placeholder-")) {
        descartarCartaParaLixeira(carta);
        return true;
      }
    }
    return false;
  };

  const filteredLetters = lettersWritten.filter((carta) => {
    if (filterMode === "draft" && carta.status !== "draft") return false;
    if (filterMode === "completed" && carta.status === "draft") return false;
    if (selectedFolderFilter !== "all") {
      const defaultFolderId = letterFolders[0]?.id;
      const matchesFolder =
        carta.pasta_id === selectedFolderFilter ||
        (!carta.pasta_id && selectedFolderFilter === defaultFolderId);
      if (!matchesFolder) return false;
    }
    return true;
  });

  return (
    <section
      className="letters-archive-section"
      id="my-letters"
      aria-labelledby="letters-section-title"
    >
      <div className="shelf-header">
        <div>
          <span className="section-kicker">CORRESPONDENCE & STATIONERY ARCHIVE</span>
          <h2 id="letters-section-title">My Letters</h2>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: "12px",
              fontFamily: "var(--serif, serif)",
              color: "var(--text-secondary)",
            }}
          >
            {lettersWritten.length} of {limiteCartas} letters •{" "}
            {letterFolders.length} of {limitePastas} folders
          </span>
          {trashLetters.length > 0 && (
            <button
              type="button"
              className="postal-trash-counter-badge"
              onClick={() => setIsTrashModalOpen(true)}
              title="Open Postal Discard Bin"
            >
              {trashLetters.length} discarded
            </button>
          )}
          <Link href="/letters" className="stamp-button">
            + Write a Letter
          </Link>
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
            <span className="postal-trash-toast-icon">✦</span>
            <span className="postal-trash-toast-text">{trashFeedback}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {lettersWritten.length === 0 ? (
        <div className="empty-journal-box">
          <div
            className="envelope envelope--sealed"
            style={{ margin: "0 auto 16px" }}
            aria-hidden="true"
          >
            <div className="envelope__flap" />
            <div className="envelope__seal">✦</div>
          </div>
          <h3>Some words are meant to be written.</h3>
          <p style={{ marginBottom: "18px" }}>
            Start writing a letter and preserve the words you want to remember.
          </p>
          <Link href="/letters" className="sober-save-btn" style={{ width: "auto" }}>
            Write a Letter
          </Link>

          {trashLetters.length > 0 && (
            <div style={{ marginTop: "18px" }}>
              <button
                type="button"
                className="postal-trash-counter-badge"
                onClick={() => setIsTrashModalOpen(true)}
              >
                View {trashLetters.length} discarded{" "}
                {trashLetters.length === 1 ? "letter" : "letters"} in Postal Trash
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* 1. Physical Stationery & Envelopes Collection Grid */}
          <div className="stationery-collection-toolbar">
            <div className="stationery-filter-pills" role="tablist" aria-label="Filter letters">
              <button
                type="button"
                className={`stationery-filter-pill ${
                  filterMode === "all" ? "is-active" : ""
                }`}
                onClick={() => setFilterMode("all")}
              >
                All Letters ({lettersWritten.length})
              </button>
              <button
                type="button"
                className={`stationery-filter-pill ${
                  filterMode === "completed" ? "is-active" : ""
                }`}
                onClick={() => setFilterMode("completed")}
              >
                Sealed ({lettersWritten.filter((l) => l.status !== "draft").length})
              </button>
              <button
                type="button"
                className={`stationery-filter-pill ${
                  filterMode === "draft" ? "is-active" : ""
                }`}
                onClick={() => setFilterMode("draft")}
              >
                Drafts ({lettersWritten.filter((l) => l.status === "draft").length})
              </button>
            </div>

            {letterFolders.length > 0 && (
              <div className="stationery-filter-pills">
                <button
                  type="button"
                  className={`stationery-filter-pill ${
                    selectedFolderFilter === "all" ? "is-active" : ""
                  }`}
                  onClick={() => setSelectedFolderFilter("all")}
                >
                  All Folders
                </button>
                {letterFolders.map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    className={`stationery-filter-pill ${
                      selectedFolderFilter === folder.id ? "is-active" : ""
                    }`}
                    onClick={() => setSelectedFolderFilter(folder.id)}
                  >
                    {folder.nome}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="my-letters-stationery-grid">
            {filteredLetters.map((carta) => {
              const seal = getSealByIdOrLabel(carta.selo_carta || carta.humor);
              const createdLabel = formatShortDate(
                carta.criado_em || carta.data_formatada,
                carta.data_formatada || "Archived"
              );
              const modifiedLabel = formatShortDate(
                carta.atualizado_em || carta.criado_em || carta.data_formatada,
                createdLabel
              );
              const folderName =
                carta.pasta_nome ||
                letterFolders.find((f) => f.id === carta.pasta_id)?.nome ||
                letterFolders[0]?.nome ||
                "Correspondence";

              return (
                <motion.article
                  key={carta.id}
                  className="stationery-letter-card"
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => {
                    playPaperSound();
                    setReadingLetter(carta);
                  }}
                >
                  <div className="stationery-letter-card__top">
                    <div className="stationery-letter-card__badges">
                      <span
                        className={`stationery-status-badge ${
                          carta.status === "draft"
                            ? "stationery-status-badge--draft"
                            : "stationery-status-badge--sealed"
                        }`}
                      >
                        {carta.status === "draft" ? "DRAFT" : "SEALED LETTER"}
                      </span>
                      <span className="stationery-folder-badge">{folderName}</span>
                    </div>

                    <div
                      className="stationery-mini-stamp"
                      style={{ borderColor: seal.color, color: seal.color }}
                      title={`Postage stamp: ${seal.label}`}
                    >
                      <span>{seal.code}</span>
                      <small>{seal.label}</small>
                    </div>
                  </div>

                  <div className="stationery-letter-card__header">
                    <div className="stationery-letter-card__envelope-icon" aria-hidden="true">
                      <div className="envelope envelope--sealed" style={{ transform: "scale(0.75)", transformOrigin: "left center" }}>
                        <div className="envelope__flap" />
                        <div
                          className="envelope__seal"
                          style={{ backgroundColor: seal.color }}
                        >
                          ✦
                        </div>
                      </div>
                    </div>
                    <div className="stationery-letter-card__titles">
                      <h3 className="stationery-letter-card__title">
                        {carta.titulo || "Untitled Correspondence"}
                      </h3>
                      {carta.destinatario && (
                        <span className="stationery-letter-card__recipient">
                          To: {carta.destinatario}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="stationery-letter-card__preview">
                    {carta.conteudo || "No content written yet."}
                  </p>

                  <div className="stationery-letter-card__dates">
                    <span>Created: {createdLabel}</span>
                    <span>Modified: {modifiedLabel}</span>
                  </div>

                  {/* Letter Card Actions */}
                  <div
                    className="stationery-letter-card__actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="tome-action-btn tome-action-btn--primary"
                      onClick={() => {
                        playPaperSound();
                        setReadingLetter(carta);
                      }}
                      title="Open and read this letter"
                    >
                      Open Letter
                    </button>
                    <button
                      type="button"
                      className="tome-action-btn"
                      onClick={() => continuarEditandoCarta(carta)}
                      title="Continue editing this letter on the stationery desk"
                    >
                      Continue Editing ↗
                    </button>
                    <button
                      type="button"
                      className="tome-action-btn"
                      onClick={(e) => abrirModalRenomearCarta(carta, e)}
                      title="Rename letter title or recipient"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      className="tome-action-btn tome-action-btn--danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        playPaperSound();
                        setLetterToDelete(carta);
                      }}
                      title="Delete this letter"
                    >
                      Delete
                    </button>
                  </div>
                </motion.article>
              );
            })}
          </div>

          {/* 2. Interactive 3D Correspondence Folders & Vintage Postal Discard Bin */}
          {letterFolders.length > 0 && (
            <div style={{ marginTop: "48px" }}>
              <div className="shelf-header" style={{ marginBottom: "12px" }}>
                <div>
                  <span className="section-kicker">TACTILE FILING CABINET · DRAG TO DISCARD</span>
                  <h3
                    style={{
                      margin: "4px 0 0",
                      fontFamily: "var(--serif-title)",
                      fontSize: "24px",
                      color: "var(--color-birch-paper)",
                    }}
                  >
                    Correspondence Folders & Postal Bin
                  </h3>
                </div>
              </div>

              <div className="letters-archive-layout">
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
                              conteudo: `This folder (${folder.nome}) has no letters yet.`,
                              data_formatada: "Personal Archive",
                              selo_carta: "ARCHIVE",
                            } as JournalEntry,
                          ]
                    ).map((letter, idx) => {
                      const cardPastelColor = letter.tipo_papel
                        ? getPaperColorById(letter.tipo_papel)
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
                        className={`letter-folder-3d-item ${
                          isOpen ? "is-open" : "is-closed"
                        }`}
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
                          onItemDragEnd={(info: any) =>
                            handleItemDragEnd(info, cartasDaPasta)
                          }
                          onItemDragCancel={() => setIsTrashHovered(false)}
                          onItemClick={(_item: any, index: number) => {
                            const carta = cartasDaPasta[index];
                            if (
                              carta &&
                              !String(carta.id).startsWith("placeholder-")
                            ) {
                              setReadingLetter(carta);
                            }
                          }}
                        />
                        <div className="letter-folder-caption">
                          <span className="letter-folder-caption-name">
                            {folder.nome}
                          </span>
                          <span className="letter-folder-caption-count">
                            {cartasDaPasta.length}{" "}
                            {cartasDaPasta.length === 1
                              ? "letter archived"
                              : "letters archived"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <PostalTrashCan
                  innerRef={trashCanRef}
                  isOpen={isTrashHovered}
                  isShaking={isTrashShaking}
                  count={trashLetters.length}
                  onClick={() => setIsTrashModalOpen(true)}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Single Letter Reading Modal */}
      <AnimatePresence>
        {readingLetter && (
          <div
            className="entry-modal-backdrop"
            onClick={() => setReadingLetter(null)}
          >
            <motion.article
              className="entry-modal-sheet"
              style={{
                backgroundColor: getPaperColorById(readingLetter.tipo_papel),
                color: getInkColorById(readingLetter.cor_tinta),
              }}
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.92, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 15 }}
            >
              <div className="entry-modal-header">
                <div>
                  <span className="entry-modal-kicker">
                    {readingLetter.status === "draft"
                      ? "SAVED LETTER DRAFT"
                      : "SEALED CORRESPONDENCE"}
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
                    Created:{" "}
                    {formatShortDate(
                      readingLetter.criado_em || readingLetter.data_formatada,
                      readingLetter.data_formatada
                    )}
                    {readingLetter.atualizado_em
                      ? ` · Modified: ${formatShortDate(readingLetter.atualizado_em)}`
                      : ""}
                  </span>
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
                <div
                  className="entry-modal-text"
                  style={{
                    fontFamily: getFontFamilyById(
                      readingLetter.fonte || "caveat"
                    ),
                    color: getInkColorById(readingLetter.cor_tinta),
                  }}
                >
                  {readingLetter.conteudo
                    .split("\n")
                    .map((paragrafo: string, idx: number) => (
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

              <div
                className="entry-modal-footer"
                style={{ flexWrap: "wrap", gap: "10px" }}
              >
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
                    onClick={() => continuarEditandoCarta(readingLetter)}
                  >
                    ✎ Continue Editing
                  </button>
                  <button
                    type="button"
                    className="entry-modal-close"
                    onClick={() => abrirModalRenomearCarta(readingLetter)}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className="entry-modal-close"
                    style={{ color: "#991b1b", borderColor: "rgba(153,27,27,0.4)" }}
                    onClick={() => setLetterToDelete(readingLetter)}
                  >
                    Delete
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
          <div
            className="notebook-drawer-backdrop"
            onClick={() => setRenamingLetter(null)}
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
                onClick={() => setRenamingLetter(null)}
                title="Close"
              >
                ✕
              </button>
              <h3 className="drawer-title">Rename Letter</h3>
              <p className="drawer-subtitle">
                Update the title or recipient for &ldquo;{renamingLetter.titulo}&rdquo;.
              </p>

              <form onSubmit={confirmarRenomearCarta} className="new-notebook-form">
                <label className="new-notebook-label">LETTER TITLE</label>
                <input
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
                  style={{ marginTop: "10px" }}
                >
                  RECIPIENT (OPTIONAL)
                </label>
                <input
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

      {/* Delete Letter Confirmation Modal */}
      <AnimatePresence>
        {letterToDelete && (
          <div
            className="delete-notebook-modal-backdrop"
            onClick={() => setLetterToDelete(null)}
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
                <h3 className="delete-modal-title">Delete Letter</h3>
              </div>

              <div className="delete-modal-body">
                <p className="delete-modal-notice-text">
                  You selected the letter{" "}
                  <strong>“{letterToDelete.titulo || "Untitled Letter"}”</strong>.
                </p>

                <p className="delete-modal-question">
                  Would you like to move it to the Postal Discard Bin (recoverable) or delete it permanently?
                </p>
              </div>

              <div
                className="delete-modal-actions"
                style={{ flexWrap: "wrap", gap: "10px" }}
              >
                <button
                  type="button"
                  className="delete-modal-cancel-btn"
                  onClick={() => setLetterToDelete(null)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="stamp-button"
                  onClick={() => confirmarExclusaoCartaModal(false)}
                >
                  Move to Postal Trash
                </button>

                <button
                  type="button"
                  className="delete-modal-confirm-btn"
                  onClick={() => confirmarExclusaoCartaModal(true)}
                >
                  Delete Permanently
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Postal Trash Bin Modal */}
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
                    Discarded letters are safely held here. You can restore them to your folder or delete them permanently.
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
                    <div
                      style={{
                        width: "100px",
                        height: "125px",
                        pointerEvents: "none",
                        marginBottom: "8px",
                      }}
                    >
                      <PostalTrashCan isOpen={false} count={0} onClick={() => {}} />
                    </div>
                    <p className="postal-trash-empty-title">
                      The postal trash is empty
                    </p>
                    <p className="postal-trash-empty-desc">
                      Drag and drop any letter from a 3D folder onto the metal trash bin, or choose &ldquo;Move to Postal Trash&rdquo; when deleting a letter.
                    </p>
                  </div>
                ) : (
                  <div className="postal-trash-letters-grid">
                    {trashLetters.map((carta) => (
                      <div key={carta.id} className="postal-trash-letter-card">
                        <div className="postal-trash-card-top">
                          <span className="postal-trash-card-date">
                            {carta.data_formatada || "Archived date"}
                          </span>
                          <span className="postal-trash-card-seal">
                            {carta.selo_carta || "DISCARDED"}
                          </span>
                        </div>
                        <h4 className="postal-trash-card-title">
                          {carta.titulo || "Untitled"}
                        </h4>
                        <p className="postal-trash-card-snippet">
                          {carta.conteudo}
                        </p>
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
                            onClick={() =>
                              excluirCartaPermanentementeDaLixeira(carta)
                            }
                            title="Permanently delete from trash"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="postal-trash-modal-footer">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    flexWrap: "wrap",
                  }}
                >
                  <span className="postal-trash-footer-info">
                    {trashLetters.length}{" "}
                    {trashLetters.length === 1
                      ? "letter preserved in trash"
                      : "letters preserved in trash"}
                  </span>
                  {trashLetters.length > 0 && (
                    <button
                      type="button"
                      className="postal-empty-trash-btn"
                      onClick={esvaziarLixeiraPermanentemente}
                      title="Permanently delete all letters from trash"
                    >
                      Empty trash
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
    </section>
  );
}
