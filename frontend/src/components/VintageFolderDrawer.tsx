"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ACTIVE_LETTER_EDIT_ID_KEY,
  ACTIVE_LETTER_FOLDER_ID_KEY,
  createLetterFolder,
  deleteLetterFolder,
  formatShortDate,
  getFolderTheme,
  getPaperColorById,
  getSealByIdOrLabel,
  loadLetterFolders,
  loadSavedLetters,
  moveLetterToFolder,
  playPaperSound,
  renameLetterFolder,
  type JournalEntry,
  type LetterFolder,
} from "@/lib/journal-storage";

interface VintageFolderDrawerProps {
  folders: LetterFolder[];
  letters: JournalEntry[];
  quotaLimit: number;
  onOpenFolderView: (folder: LetterFolder) => void;
  onReadLetter: (letter: JournalEntry) => void;
  onDiscardLetter: (letter: JournalEntry) => void;
  onRefresh: () => void;
}

const TAB_STATIONS = [0.04, 0.37, 0.70];
const tabStation = (i: number) => TAB_STATIONS[i % TAB_STATIONS.length];
const depthOf = (i: number, n: number) => (n <= 1 ? 0 : (n - 1 - i) / (n - 1));
const folderNumber = (i: number) => `FLD.${String(i + 1).padStart(2, "0")}`;

export default function VintageFolderDrawer({
  folders,
  letters,
  quotaLimit,
  onOpenFolderView,
  onReadLetter,
  onDiscardLetter,
  onRefresh,
}: VintageFolderDrawerProps) {
  const router = useRouter();

  // Active open folder in drawer (accordion style)
  const [openFolderId, setOpenFolderId] = useState<string | null>(
    folders.length > 0 ? folders[0].id : null
  );

  // Modals
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("marrom");

  const [renamingFolder, setRenamingFolder] = useState<LetterFolder | null>(null);
  const [renameInput, setRenameInput] = useState("");

  const [folderToDelete, setFolderToDelete] = useState<LetterFolder | null>(null);

  const [movingLetter, setMovingLetter] = useState<JournalEntry | null>(null);
  const [targetMoveFolderId, setTargetMoveFolderId] = useState("");

  const handleToggleFolder = (folderId: string) => {
    playPaperSound();
    setOpenFolderId((prev) => (prev === folderId ? null : folderId));
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    if (folders.length >= quotaLimit) {
      alert(`You have reached your limit of ${quotaLimit} folders. Join Pro Club to create up to 10 folders.`);
      return;
    }

    const created = createLetterFolder(newFolderName.trim(), newFolderColor);
    setNewFolderName("");
    setShowNewFolderModal(false);
    playPaperSound();
    onRefresh();
    setOpenFolderId(created.id);
  };

  const handleConfirmRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingFolder || !renameInput.trim()) return;
    renameLetterFolder(renamingFolder.id, renameInput.trim());
    setRenamingFolder(null);
    playPaperSound();
    onRefresh();
  };

  const handleConfirmDelete = () => {
    if (!folderToDelete) return;
    deleteLetterFolder(folderToDelete.id);
    setFolderToDelete(null);
    playPaperSound();
    onRefresh();
    if (openFolderId === folderToDelete.id) {
      setOpenFolderId(null);
    }
  };

  const handleConfirmMoveLetter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!movingLetter || !targetMoveFolderId) return;
    const dest = folders.find((f) => f.id === targetMoveFolderId);
    if (!dest) return;
    moveLetterToFolder(String(movingLetter.id), dest.id, dest.nome);
    setMovingLetter(null);
    playPaperSound();
    onRefresh();
  };

  const handleEditLetter = (letter: JournalEntry) => {
    playPaperSound();
    try {
      window.localStorage.setItem(ACTIVE_LETTER_EDIT_ID_KEY, String(letter.id));
    } catch {}
    router.push(`/letters?edit=${encodeURIComponent(String(letter.id))}`);
  };

  const handleWriteInFolder = (folder: LetterFolder) => {
    playPaperSound();
    try {
      window.localStorage.setItem(ACTIVE_LETTER_FOLDER_ID_KEY, folder.id);
    } catch {}
    router.push(`/letters`);
  };

  const folderCount = folders.length;

  return (
    <div className="vintage-filing-cabinet-wrapper">
      {/* Drawer Cabinet Top Header */}
      <div className="cabinet-top-bar">
        <div>
          <span className="cabinet-kicker">PHYSICAL ARCHIVE · FILING SYSTEM</span>
          <h3 className="cabinet-title">Correspondence Drawer</h3>
          <p className="cabinet-subtitle">
            {folders.length} of {quotaLimit} folders filed in your archive cabinet.
          </p>
        </div>

        <button
          type="button"
          className="cabinet-new-folder-btn"
          onClick={() => {
            playPaperSound();
            setShowNewFolderModal(true);
          }}
          title="Create a new correspondence folder"
        >
          + New Folder
        </button>
      </div>

      {/* The Physical Drawer Box */}
      <div className="vintage-cabinet-drawer">
        {/* Recessed Tray where folders sit */}
        <div className="cabinet-tray">
          {folders.length === 0 ? (
            <div className="cabinet-empty-state">
              <span className="empty-ornament">❧</span>
              <p>Your filing drawer is waiting for its first folder.</p>
              <button
                type="button"
                className="sober-save-btn"
                style={{ width: "auto", margin: "12px auto 0" }}
                onClick={() => setShowNewFolderModal(true)}
              >
                Create First Folder
              </button>
            </div>
          ) : (
            folders.map((folder, index) => {
              const depth = depthOf(index, folderCount);
              const tabPos = tabStation(index);
              const isOpen = openFolderId === folder.id;
              const folderLetters = letters.filter((l) => {
                if (l.pasta_id) return l.pasta_id === folder.id;
                // If unassigned, assign to first folder
                return index === 0;
              });

              return (
                <div
                  key={folder.id}
                  className={`vintage-manila-folder ${isOpen ? "is-open" : ""}`}
                  style={
                    {
                      "--depth": depth,
                      "--tab-at": tabPos,
                      zIndex: isOpen ? 20 : folderCount - index,
                    } as React.CSSProperties
                  }
                >
                  {/* Staggered Folder Tab */}
                  <div
                    className="folder-tab-lip"
                    onClick={() => handleToggleFolder(folder.id)}
                    title={`Folder: ${folder.nome}`}
                  >
                    <span className="tab-folder-name">{folder.nome}</span>
                    <span className="tab-letter-count">{folderLetters.length}</span>
                  </div>

                  {/* Folder Top Edge */}
                  <div
                    className="folder-top-edge"
                    onClick={() => handleToggleFolder(folder.id)}
                  >
                    <span className="folder-edge-code">{folderNumber(index)}</span>
                    <span className="folder-edge-title">
                      <b>{folder.nome}</b>
                      <span className="folder-edge-meta">
                        — {folderLetters.length}{" "}
                        {folderLetters.length === 1 ? "letter filed" : "letters filed"}
                        {folder.criadoEm ? ` · Created ${formatShortDate(folder.criadoEm)}` : ""}
                      </span>
                    </span>
                    <span className="folder-edge-mark" aria-hidden="true" />
                  </div>

                  {/* Inside Folder Face (Revealed on Open) */}
                  {isOpen && (
                    <motion.div
                      className="folder-interior-face"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22 }}
                    >
                      <div className="folder-face-toolbar">
                        <div className="face-folder-info">
                          <h4>{folder.nome}</h4>
                          <span>
                            {folderLetters.length}{" "}
                            {folderLetters.length === 1 ? "letter" : "letters"} preserved in this volume
                          </span>
                        </div>
                        <div className="face-actions-cluster">
                          <button
                            type="button"
                            className="face-action-pill primary"
                            onClick={() => onOpenFolderView(folder)}
                            title="Open full view of letters in this folder"
                          >
                            Browse Folder ({folderLetters.length})
                          </button>
                          <button
                            type="button"
                            className="face-action-pill"
                            onClick={() => handleWriteInFolder(folder)}
                            title="Write a new letter into this folder"
                          >
                            + Write Letter
                          </button>
                          <button
                            type="button"
                            className="face-action-pill subtle"
                            onClick={() => {
                              playPaperSound();
                              setRenamingFolder(folder);
                              setRenameInput(folder.nome);
                            }}
                            title="Rename this folder"
                          >
                            Rename
                          </button>
                          {folders.length > 1 && (
                            <button
                              type="button"
                              className="face-action-pill subtle danger"
                              onClick={() => {
                                playPaperSound();
                                setFolderToDelete(folder);
                              }}
                              title="Delete folder (letters are safely kept)"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Letters List Inside Folder */}
                      <div className="folder-letters-list">
                        {folderLetters.length === 0 ? (
                          <div className="folder-empty-note">
                            <p>No correspondence filed here yet.</p>
                            <button
                              type="button"
                              className="face-action-pill primary"
                              onClick={() => handleWriteInFolder(folder)}
                            >
                              Write the first letter
                            </button>
                          </div>
                        ) : (
                          folderLetters.map((letter) => {
                            const seal = getSealByIdOrLabel(letter.selo_carta || letter.humor);
                            const isDraft = letter.status === "draft";

                            return (
                              <article
                                key={letter.id}
                                className="cabinet-letter-row"
                                onClick={() => onReadLetter(letter)}
                              >
                                <div className="letter-row-stamp">
                                  <span style={{ color: seal.color }}>
                                    {isDraft ? "DRAFT" : seal.code}
                                  </span>
                                </div>
                                <div className="letter-row-info">
                                  <div className="letter-row-title-line">
                                    <h5 className="letter-row-title">{letter.titulo || "Untitled Letter"}</h5>
                                    {isDraft && <span className="row-draft-badge">Draft</span>}
                                  </div>
                                  <div className="letter-row-meta">
                                    {letter.destinatario && <span>To: {letter.destinatario} · </span>}
                                    <span>{formatShortDate(letter.criado_em || letter.data_formatada)}</span>
                                    {letter.tema_carta && <span> · Theme: {letter.tema_carta}</span>}
                                  </div>
                                </div>
                                <div
                                  className="letter-row-actions"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    className="row-action-btn"
                                    onClick={() => onReadLetter(letter)}
                                    title="Read letter"
                                  >
                                    Read
                                  </button>
                                  <button
                                    type="button"
                                    className="row-action-btn"
                                    onClick={() => handleEditLetter(letter)}
                                    title="Continue writing / editing"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="row-action-btn"
                                    onClick={() => {
                                      setMovingLetter(letter);
                                      setTargetMoveFolderId(folder.id);
                                    }}
                                    title="Move to another folder"
                                  >
                                    Move
                                  </button>
                                  <button
                                    type="button"
                                    className="row-action-btn danger"
                                    onClick={() => onDiscardLetter(letter)}
                                    title="Move to Postal Discards"
                                  >
                                    Discard
                                  </button>
                                </div>
                              </article>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Front Plate with Brass Label Holder & Antique Cup Pull */}
        <div className="cabinet-drawer-front">
          <div className="cabinet-brass-holder">
            <span className="cabinet-holder-label">CORRESPONDENCE · ARCHIVE</span>
          </div>
          <div className="cabinet-cup-pull" aria-hidden="true" />
        </div>
      </div>

      {/* Modal: Create Folder */}
      <AnimatePresence>
        {showNewFolderModal && (
          <div
            className="entry-modal-backdrop"
            onClick={() => setShowNewFolderModal(false)}
          >
            <motion.div
              className="minimal-folder-modal"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
            >
              <h3>New Correspondence Folder</h3>
              <p>Create a physical manila folder to organize your letters.</p>
              <form onSubmit={handleCreateFolder}>
                <input
                  type="text"
                  autoFocus
                  className="letter-minimal-input"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name (e.g. Unsent Words, Summer Letters)..."
                  maxLength={40}
                />
                <div className="modal-actions-row">
                  <button
                    type="button"
                    className="modal-cancel-btn"
                    onClick={() => setShowNewFolderModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="modal-confirm-btn">
                    Create Folder
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Rename Folder */}
      <AnimatePresence>
        {renamingFolder && (
          <div
            className="entry-modal-backdrop"
            onClick={() => setRenamingFolder(null)}
          >
            <motion.div
              className="minimal-folder-modal"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
            >
              <h3>Rename Folder</h3>
              <p>Change the title on this folder's filing tab.</p>
              <form onSubmit={handleConfirmRename}>
                <input
                  type="text"
                  autoFocus
                  className="letter-minimal-input"
                  value={renameInput}
                  onChange={(e) => setRenameInput(e.target.value)}
                  placeholder="Folder name..."
                  maxLength={40}
                />
                <div className="modal-actions-row">
                  <button
                    type="button"
                    className="modal-cancel-btn"
                    onClick={() => setRenamingFolder(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="modal-confirm-btn">
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Delete Folder Confirmation */}
      <AnimatePresence>
        {folderToDelete && (
          <div
            className="entry-modal-backdrop"
            onClick={() => setFolderToDelete(null)}
          >
            <motion.div
              className="minimal-folder-modal"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
            >
              <h3>Delete Folder</h3>
              <p>
                Are you sure you want to delete folder &ldquo;{folderToDelete.nome}&rdquo;?
                Any letters stored inside will be preserved and moved to your other folders safely.
              </p>
              <div className="modal-actions-row">
                <button
                  type="button"
                  className="modal-cancel-btn"
                  onClick={() => setFolderToDelete(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="modal-confirm-btn danger"
                  onClick={handleConfirmDelete}
                >
                  Delete Folder
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Move Letter to Another Folder */}
      <AnimatePresence>
        {movingLetter && (
          <div
            className="entry-modal-backdrop"
            onClick={() => setMovingLetter(null)}
          >
            <motion.div
              className="minimal-folder-modal"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
            >
              <h3>Move Letter to Folder</h3>
              <p>
                Select destination folder for &ldquo;{movingLetter.titulo}&rdquo;:
              </p>
              <form onSubmit={handleConfirmMoveLetter}>
                <select
                  className="letter-minimal-select"
                  style={{ width: "100%", marginBottom: "16px" }}
                  value={targetMoveFolderId}
                  onChange={(e) => setTargetMoveFolderId(e.target.value)}
                >
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      📁 {f.nome}
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
    </div>
  );
}
