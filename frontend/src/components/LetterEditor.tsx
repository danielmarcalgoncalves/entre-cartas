"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { useGuestDemo } from "@/hooks/useGuestDemo";
import GuestSavePromptModal from "@/components/GuestSavePromptModal";
import {
  ACTIVE_LETTER_EDIT_ID_KEY,
  ACTIVE_LETTER_FOLDER_ID_KEY,
  FONT_OPTIONS,
  INK_OPTIONS,
  JOURNAL_UPDATED_EVENT,
  LETTER_THEMES,
  PAPER_OPTIONS,
  SEAL_OPTIONS,
  SESSION_CLEARED_EVENT,
  createLetterFolder,
  formatShortDate,
  getFontFamilyById,
  getInkColorById,
  getPaperColorById,
  getSealByIdOrLabel,
  loadLetterFolders,
  loadSavedLetters,
  playPaperSound,
  upsertUserLetter,
  type JournalEntry,
  type LetterFolder,
  type LetterTheme,
  type PostalSeal,
} from "@/lib/journal-storage";

export default function LetterEditor() {
  const { user, loading: authLoading, isPro } = useAuth();
  const isGuestMode = !authLoading && !user;
  const {
    guestLetterFolders,
    setGuestLetterFolders,
    guestSelectedFolderId,
    setGuestSelectedFolderId,
    guestDraftLetter,
    setGuestDraftLetter,
  } = useGuestDemo();

  const [guestPromptOpen, setGuestPromptOpen] = useState(false);

  // Letter State
  const [editingLetterId, setEditingLetterId] = useState<string | null>(null);
  const [editingRemoteId, setEditingRemoteId] = useState<number | string | undefined>(undefined);
  const [editingCreatedAt, setEditingCreatedAt] = useState<string | null>(null);
  const [letterStatus, setLetterStatus] = useState<"draft" | "completed">("draft");

  const [cartaTitulo, setCartaTitulo] = useState("");
  const [cartaDestinatario, setCartaDestinatario] = useState("");
  const [cartaConteudo, setCartaConteudo] = useState("");
  const [cartaAssinatura, setCartaAssinatura] = useState("");
  const [cartaFavoritado, setCartaFavoritado] = useState(false);
  const [letterTheme, setLetterTheme] = useState<LetterTheme>("Love");
  const [cartaSelo, setCartaSelo] = useState<PostalSeal>(SEAL_OPTIONS[0]);

  const [dataFormatada, setDataFormatada] = useState("");

  // Folders & Letters State
  const [savedLetters, setSavedLetters] = useState<JournalEntry[]>([]);
  const [letterFolders, setLetterFolders] = useState<LetterFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");

  // Minimal Customization State
  const [sheetBgId, setSheetBgId] = useState("ivory");
  const [sheetBgColor, setSheetBgColor] = useState("#FCFBF7");
  const [fontFamilyId, setFontFamilyId] = useState("caveat");

  // New Folder Modal
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderInputName, setNewFolderInputName] = useState("");

  // Feedback & Drafts Drawer
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [limitNotice, setLimitNotice] = useState<string | null>(null);
  const [draftsDrawerOpen, setDraftsDrawerOpen] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const hasLoadedInitialEditRef = useRef(false);

  // Set today's date
  useEffect(() => {
    const today = new Date();
    const formatted = today.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    setDataFormatada(formatted);
  }, []);

  // Sync seal when theme changes
  useEffect(() => {
    const sealMap: Record<string, string> = {
      Love: "amor",
      Longing: "saudade",
      Friendship: "desabafo",
      Memories: "historica",
      Gratitude: "amor",
      Dreams: "silencio",
      Family: "historica",
      Personal: "desabafo",
      "Unsent Letters": "nunca-enviada",
    };
    const sealId = sealMap[letterTheme] || "amor";
    setCartaSelo(getSealByIdOrLabel(sealId));
  }, [letterTheme]);

  const loadLetterIntoEditor = (entry: JournalEntry) => {
    setEditingLetterId(String(entry.id));
    setEditingRemoteId(entry.remote_id);
    setEditingCreatedAt(entry.criado_em || null);
    setLetterStatus(entry.status || "completed");
    setCartaTitulo(entry.titulo || "");
    setCartaDestinatario(entry.destinatario || "");
    setCartaConteudo(entry.conteudo || "");
    setCartaAssinatura(entry.assinatura || user?.nome || "");
    setCartaFavoritado(Boolean(entry.favoritado));

    if (entry.tema_carta && LETTER_THEMES.includes(entry.tema_carta as LetterTheme)) {
      setLetterTheme(entry.tema_carta as LetterTheme);
    } else if (entry.selo_carta) {
      const match = LETTER_THEMES.find(
        (t) => t.toLowerCase() === entry.selo_carta?.toLowerCase()
      );
      if (match) setLetterTheme(match);
    }

    setCartaSelo(getSealByIdOrLabel(entry.selo_carta || entry.humor));

    const paperId = entry.tipo_papel || "ivory";
    setSheetBgId(paperId);
    setSheetBgColor(getPaperColorById(paperId));

    const fontId = entry.fonte || "caveat";
    setFontFamilyId(fontId);

    if (entry.pasta_id) {
      setSelectedFolderId(entry.pasta_id);
    }
  };

  const refreshData = (event?: any) => {
    if (authLoading) return;
    if (event?.detail?.source === "letter-editor") return;

    if (isGuestMode) {
      setSavedLetters([]);
      setLetterFolders(guestLetterFolders);
      const validFolderId = guestLetterFolders.some((f) => f.id === guestSelectedFolderId)
        ? guestSelectedFolderId
        : guestLetterFolders[0]?.id || "";
      setSelectedFolderId(validFolderId);

      if (!hasLoadedInitialEditRef.current) {
        hasLoadedInitialEditRef.current = true;
        setCartaTitulo(guestDraftLetter.titulo);
        setCartaDestinatario(guestDraftLetter.destinatario);
        setCartaConteudo(guestDraftLetter.conteudo);
        setCartaAssinatura(guestDraftLetter.assinatura);
        setCartaFavoritado(guestDraftLetter.favoritado);
        setLetterTheme(guestDraftLetter.letterTheme);
        setSheetBgId(guestDraftLetter.sheetBgId);
        setSheetBgColor(guestDraftLetter.sheetBgColor);
        setFontFamilyId(guestDraftLetter.fontFamilyId);
      }
      return;
    }

    const loadedLetters = loadSavedLetters(user?.id);
    setSavedLetters(loadedLetters);

    const loadedFolders = loadLetterFolders(user?.id);
    setLetterFolders(loadedFolders);

    if (loadedFolders.length > 0) {
      let savedFolderId: string | null = null;
      try {
        savedFolderId = window.localStorage.getItem(ACTIVE_LETTER_FOLDER_ID_KEY);
      } catch {}
      if (savedFolderId && loadedFolders.some((f) => f.id === savedFolderId)) {
        setSelectedFolderId(savedFolderId);
      } else if (!selectedFolderId) {
        setSelectedFolderId(loadedFolders[0].id);
      }
    }

    // Check for edit query param
    if (!hasLoadedInitialEditRef.current && typeof window !== "undefined") {
      hasLoadedInitialEditRef.current = true;
      try {
        const params = new URLSearchParams(window.location.search);
        const editId = params.get("edit") || window.localStorage.getItem(ACTIVE_LETTER_EDIT_ID_KEY);
        if (editId) {
          window.localStorage.removeItem(ACTIVE_LETTER_EDIT_ID_KEY);
          const found = loadedLetters.find((l) => String(l.id) === String(editId));
          if (found) {
            loadLetterIntoEditor(found);
          }
        }
      } catch {}
    }
  };

  useEffect(() => {
    hasLoadedInitialEditRef.current = false;
  }, [user?.id, isGuestMode]);

  useEffect(() => {
    const resetEditorMemory = () => {
      hasLoadedInitialEditRef.current = false;
      setSavedLetters([]);
      setLetterFolders([]);
      setSelectedFolderId("");
      setEditingLetterId(null);
      setEditingRemoteId(undefined);
      setEditingCreatedAt(null);
      setLetterStatus("draft");
      setCartaTitulo("");
      setCartaDestinatario("");
      setCartaConteudo("");
      setCartaAssinatura("");
      setCartaFavoritado(false);
    };
    window.addEventListener(SESSION_CLEARED_EVENT, resetEditorMemory);
    return () => {
      window.removeEventListener(SESSION_CLEARED_EVENT, resetEditorMemory);
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;
    refreshData();
    if (isGuestMode) return;
    window.addEventListener(JOURNAL_UPDATED_EVENT, refreshData);
    window.addEventListener("storage", refreshData);
    return () => {
      window.removeEventListener(JOURNAL_UPDATED_EVENT, refreshData);
      window.removeEventListener("storage", refreshData);
    };
  }, [user?.id, authLoading, isGuestMode]);

  // Keep in-memory guest letter synced while navigating within preview session
  useEffect(() => {
    if (!isGuestMode || !hasLoadedInitialEditRef.current) return;
    setGuestDraftLetter({
      titulo: cartaTitulo,
      destinatario: cartaDestinatario,
      conteudo: cartaConteudo,
      assinatura: cartaAssinatura,
      favoritado: cartaFavoritado,
      letterTheme,
      sheetBgId,
      sheetBgColor,
      fontFamilyId,
    });
  }, [
    isGuestMode,
    cartaTitulo,
    cartaDestinatario,
    cartaConteudo,
    cartaAssinatura,
    cartaFavoritado,
    letterTheme,
    sheetBgId,
    sheetBgColor,
    fontFamilyId,
    setGuestDraftLetter,
  ]);

  const handleStartNewLetter = () => {
    playPaperSound();
    setEditingLetterId(null);
    setEditingRemoteId(undefined);
    setEditingCreatedAt(null);
    setLetterStatus("draft");
    setCartaTitulo("");
    setCartaDestinatario("");
    setCartaConteudo("");
    setCartaAssinatura(user?.nome || "");
    setCartaFavoritado(false);
    setLetterTheme("Love");
    if (!isGuestMode) {
      try {
        window.localStorage.removeItem(ACTIVE_LETTER_EDIT_ID_KEY);
      } catch {}
    }
    setToastMessage("Fresh stationery ready on your desk.");
    setTimeout(() => setToastMessage(null), 3000);
    setTimeout(() => titleInputRef.current?.focus(), 100);
  };

  const handleSaveDraft = async () => {
    if (isGuestMode) {
      playPaperSound();
      setGuestPromptOpen(true);
      return;
    }

    if (!cartaConteudo.trim() && !cartaTitulo.trim() && !cartaDestinatario.trim()) {
      alert("Please write a title, recipient, or a few words before saving a draft.");
      return;
    }

    playPaperSound();
    const nowIso = new Date().toISOString();
    const draftId = editingLetterId || "entry-" + Date.now();
    const finalTitle =
      cartaTitulo.trim() ||
      (cartaDestinatario.trim()
        ? `Draft to ${cartaDestinatario.trim()}`
        : `Draft (${letterTheme})`);

    const currentFolder =
      letterFolders.find((f) => f.id === selectedFolderId) || letterFolders[0];

    let remoteId = editingRemoteId;
    if (user?.id) {
      try {
        if (remoteId) {
          await api.cartas.atualizar(remoteId, {
            titulo: finalTitle,
            conteudo: cartaConteudo || "",
            destinatario_anonimo: cartaDestinatario.trim() || null,
            categoria: cartaSelo.id,
            tipo_papel: sheetBgId,
            pasta_client_id: currentFolder?.id || null,
            pasta_nome: currentFolder?.nome || null,
            fonte: fontFamilyId,
            status_carta: "draft",
            tema_carta: letterTheme,
            favoritado: cartaFavoritado,
          });
        } else {
          const res = await api.cartas.enviar({
            client_id: draftId,
            titulo: finalTitle,
            conteudo: cartaConteudo || finalTitle,
            remetente_anonimo: cartaAssinatura.trim() || user?.nome || "Correspondent",
            destinatario_anonimo: cartaDestinatario.trim() || null,
            categoria: cartaSelo.id,
            tipo_papel: sheetBgId,
            data_carta: dataFormatada || "Today",
            pasta_client_id: currentFolder?.id || null,
            pasta_nome: currentFolder?.nome || null,
            fonte: fontFamilyId,
            status_carta: "draft",
            tema_carta: letterTheme,
            favoritado: cartaFavoritado,
          });
          if (res?.carta?.id) {
            remoteId = res.carta.id;
          }
        }
      } catch {
        // Keep local draft even if network temporarily unavailable
      }
    }

    const draftEntry: JournalEntry = {
      id: draftId,
      titulo: finalTitle,
      destinatario: cartaDestinatario.trim() || undefined,
      assinatura: cartaAssinatura.trim() || user?.nome || undefined,
      conteudo: cartaConteudo,
      humor: cartaSelo.id,
      tema_carta: letterTheme,
      data_formatada: dataFormatada || "Today",
      criado_em: editingCreatedAt || nowIso,
      atualizado_em: nowIso,
      tipo_papel: sheetBgId,
      cor_tinta: "nanquim",
      fonte: fontFamilyId,
      favoritado: cartaFavoritado,
      selo_carta: cartaSelo.label,
      pasta_id: currentFolder?.id,
      pasta_nome: currentFolder?.nome,
      status: "draft",
      usuario_id: user?.id,
      remote_id: remoteId,
    };

    upsertUserLetter(draftEntry, "letter-editor");
    setEditingLetterId(draftId);
    setEditingRemoteId(remoteId);
    setEditingCreatedAt(draftEntry.criado_em);
    setLetterStatus("draft");
    setSavedLetters(loadSavedLetters(user?.id));

    setToastMessage(`Draft "${finalTitle}" saved to your archive.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSaveAndSeal = async () => {
    if (isGuestMode) {
      playPaperSound();
      setGuestPromptOpen(true);
      return;
    }

    if (!cartaConteudo.trim() && !cartaTitulo.trim()) {
      alert("Please write your letter before sealing and preserving it.");
      return;
    }

    let targetFolder = letterFolders.find((f) => f.id === selectedFolderId);
    if (!targetFolder && letterFolders.length > 0) {
      targetFolder = letterFolders[0];
    } else if (!targetFolder) {
      targetFolder = createLetterFolder("General Correspondence", "marrom", user?.id);
      setLetterFolders(loadLetterFolders(user?.id));
      setSelectedFolderId(targetFolder.id);
    }

    const limitLetters = isPro ? 30 : 10;
    const isUpdating = Boolean(
      editingLetterId &&
        savedLetters.some((l) => String(l.id) === String(editingLetterId))
    );

    if (!isUpdating && savedLetters.length >= limitLetters) {
      setLimitNotice(
        isPro
          ? `You have reached the Premium Plan limit of ${limitLetters} letters (${savedLetters.length}/${limitLetters}).`
          : `You have reached the Free Plan limit of ${limitLetters} letters (${savedLetters.length}/${limitLetters}). Join the Pro Sender Club to write up to 30 letters.`
      );
      return;
    }

    setSaving(true);
    playPaperSound();

    const nowIso = new Date().toISOString();
    const letterId = editingLetterId || "entry-" + Date.now();
    const finalTitle =
      cartaTitulo.trim() ||
      (cartaDestinatario.trim()
        ? `Letter to ${cartaDestinatario.trim()}`
        : `Letter: ${letterTheme}`);

    let remoteId = editingRemoteId;

    // Backend sync
    if (user?.id) {
      try {
        if (remoteId) {
          await api.cartas.atualizar(remoteId, {
            titulo: finalTitle,
            conteudo: cartaConteudo.trim() || finalTitle,
            destinatario_anonimo: cartaDestinatario.trim() || null,
            categoria: cartaSelo.id,
            tipo_papel: sheetBgId,
            pasta_client_id: targetFolder.id,
            pasta_nome: targetFolder.nome,
            fonte: fontFamilyId,
            status_carta: "completed",
            tema_carta: letterTheme,
            favoritado: cartaFavoritado,
          });
        } else {
          const res = await api.cartas.enviar({
            client_id: letterId,
            titulo: finalTitle,
            conteudo: cartaConteudo.trim() || finalTitle,
            remetente_anonimo: cartaAssinatura.trim() || user?.nome || "Correspondent",
            destinatario_anonimo: cartaDestinatario.trim() || null,
            categoria: cartaSelo.id,
            tipo_papel: sheetBgId,
            data_carta: dataFormatada || "Today",
            pasta_client_id: targetFolder.id,
            pasta_nome: targetFolder.nome,
            fonte: fontFamilyId,
            status_carta: "completed",
            tema_carta: letterTheme,
            favoritado: cartaFavoritado,
          });
          if (res?.carta?.id) {
            remoteId = res.carta.id;
          }
        }
      } catch (err: any) {
        if (err?.isLimitReached && err?.message) {
          setLimitNotice(err.message);
          setSaving(false);
          return;
        }
      }
    }

    const completedEntry: JournalEntry = {
      id: letterId,
      titulo: finalTitle,
      destinatario: cartaDestinatario.trim() || undefined,
      assinatura: cartaAssinatura.trim() || user?.nome || undefined,
      conteudo: cartaConteudo.trim(),
      humor: cartaSelo.id,
      tema_carta: letterTheme,
      data_formatada: dataFormatada || "Today",
      criado_em: editingCreatedAt || nowIso,
      atualizado_em: nowIso,
      tipo_papel: sheetBgId,
      cor_tinta: "nanquim",
      fonte: fontFamilyId,
      favoritado: cartaFavoritado,
      selo_carta: cartaSelo.label,
      pasta_id: targetFolder.id,
      pasta_nome: targetFolder.nome,
      status: "completed",
      usuario_id: user?.id,
      remote_id: remoteId,
    };

    upsertUserLetter(completedEntry, "letter-editor");
    setEditingLetterId(letterId);
    setEditingRemoteId(remoteId);
    setLetterStatus("completed");
    setEditingCreatedAt(completedEntry.criado_em);
    setSavedLetters(loadSavedLetters(user?.id));
    setSaving(false);

    setToastMessage(`Letter "${finalTitle}" sealed and filed in "${targetFolder.nome}".`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCreateFolderInline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderInputName.trim()) return;

    const limitFolders = isPro ? 10 : 3;
    if (letterFolders.length >= limitFolders) {
      setShowNewFolderModal(false);
      setLimitNotice(
        isPro
          ? `You have reached the Premium Plan limit of ${limitFolders} folders (${letterFolders.length}/${limitFolders}).`
          : `You have reached the Free Plan limit of ${limitFolders} folders (${letterFolders.length}/${limitFolders}). Join the Pro Sender Club to create up to 10 folders.`
      );
      return;
    }

    if (isGuestMode) {
      const tempFolder: LetterFolder = {
        id: "guest-folder-" + Date.now(),
        nome: newFolderInputName.trim(),
        cor: "marrom",
        criadoEm: new Date().toISOString(),
      };
      const updatedTemp = [...letterFolders, tempFolder];
      setLetterFolders(updatedTemp);
      setGuestLetterFolders(updatedTemp);
      setSelectedFolderId(tempFolder.id);
      setGuestSelectedFolderId(tempFolder.id);
      setNewFolderInputName("");
      setShowNewFolderModal(false);
      playPaperSound();
      setToastMessage(`Preview folder "${tempFolder.nome}" added (temporary session only).`);
      setTimeout(() => setToastMessage(null), 3500);
      return;
    }

    const created = createLetterFolder(newFolderInputName.trim(), "marrom", user?.id);
    const updated = loadLetterFolders(user?.id);
    setLetterFolders(updated);
    setSelectedFolderId(created.id);
    setNewFolderInputName("");
    setShowNewFolderModal(false);
    playPaperSound();
    setToastMessage(`Folder "${created.nome}" created and selected.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const draftsCount = savedLetters.filter((l) => l.status === "draft").length;

  return (
    <div className="minimal-letter-desk">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="minimal-letter-toast"
            role="status"
          >
            <span className="toast-ornament">✦</span>
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {limitNotice && (
        <div
          className="paper-panel"
          role="alert"
          style={{
            maxWidth: "820px",
            margin: "0 auto 16px",
            padding: "14px 18px",
            backgroundColor: "rgba(121, 59, 43, 0.32)",
            border: "1px solid rgba(207, 169, 111, 0.55)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <span style={{ fontSize: "14px", color: "#f6e7d0" }}>{limitNotice}</span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {!isPro && (
              <Link
                href="/clube-pro"
                className="stamp-button compact"
                style={{
                  background: "var(--color-red-sands, #ad5b30)",
                  color: "#fcfbf7",
                  textDecoration: "none",
                }}
              >
                Upgrade to Pro Club →
              </Link>
            )}
            <button
              type="button"
              onClick={() => setLimitNotice(null)}
              className="stamp-button compact"
              aria-label="Dismiss limit notice"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Essential Customization Controls Bar */}
      <header className="letter-essential-controls-bar" aria-label="Letter writing controls">
        {/* 1. Paper Color Palette */}
        <div className="control-group" title="Stationery Paper">
          <span className="control-label">Paper</span>
          <div className="paper-swatches-row">
            {PAPER_OPTIONS.slice(0, 6).map((paper) => {
              const isSelected = sheetBgId === paper.id;
              return (
                <button
                  key={paper.id}
                  type="button"
                  className={`paper-circle-btn ${isSelected ? "is-selected" : ""}`}
                  style={{ backgroundColor: paper.color }}
                  onClick={() => {
                    playPaperSound();
                    setSheetBgId(paper.id);
                    setSheetBgColor(paper.color);
                  }}
                  title={paper.name}
                  aria-label={`Select paper ${paper.name}`}
                >
                  {isSelected && <span className="swatch-check">✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="control-divider" aria-hidden="true" />

        {/* 2. Typography Selector */}
        <div className="control-group" title="Calligraphy & Font">
          <span className="control-label">Typography</span>
          <select
            className="letter-minimal-select"
            value={fontFamilyId}
            onChange={(e) => {
              playPaperSound();
              setFontFamilyId(e.target.value);
            }}
            aria-label="Select typography"
          >
            <option value="caveat">Caveat (Fountain Pen)</option>
            <option value="garamond">EB Garamond (Classic Book)</option>
            <option value="cormorant">Cormorant Garamond (Poetic Serif)</option>
            <option value="typewriter">Special Elite (Typewriter)</option>
          </select>
        </div>

        <div className="control-divider" aria-hidden="true" />

        {/* 3. Folder Organization */}
        <div className="control-group" title="Correspondence Folder">
          <span className="control-label">Folder</span>
          <div className="folder-select-wrap">
            <select
              className="letter-minimal-select"
              value={selectedFolderId}
              onChange={(e) => {
                if (e.target.value === "__NEW__") {
                  setShowNewFolderModal(true);
                } else {
                  playPaperSound();
                  setSelectedFolderId(e.target.value);
                  if (isGuestMode) {
                    setGuestSelectedFolderId(e.target.value);
                  } else {
                    try {
                      window.localStorage.setItem(ACTIVE_LETTER_FOLDER_ID_KEY, e.target.value);
                    } catch {}
                  }
                }
              }}
              aria-label="Select correspondence folder"
            >
              {letterFolders.length === 0 ? (
                <option value="">General Correspondence</option>
              ) : (
                letterFolders.map((f) => (
                  <option key={f.id} value={f.id}>
                    📁 {f.nome}
                  </option>
                ))
              )}
              <option value="__NEW__">+ Create New Folder...</option>
            </select>
          </div>
        </div>

        <div className="control-divider" aria-hidden="true" />

        {/* 4. Letter Theme */}
        <div className="control-group" title="Letter Theme">
          <span className="control-label">Theme</span>
          <select
            className="letter-minimal-select"
            value={letterTheme}
            onChange={(e) => {
              playPaperSound();
              setLetterTheme(e.target.value as LetterTheme);
            }}
            aria-label="Select letter theme"
          >
            {LETTER_THEMES.map((theme) => (
              <option key={theme} value={theme}>
                {theme}
              </option>
            ))}
          </select>
        </div>

        {/* Actions Cluster */}
        <div className="control-actions-cluster">
          {draftsCount > 0 && (
            <button
              type="button"
              className="letter-drafts-counter-btn"
              onClick={() => setDraftsDrawerOpen(true)}
              title="View saved drafts"
            >
              Drafts ({draftsCount})
            </button>
          )}

          <button
            type="button"
            className="letter-action-subtle-btn"
            onClick={handleStartNewLetter}
            title="Start a blank letter"
          >
            New Letter
          </button>

          <button
            type="button"
            className="letter-action-draft-btn"
            onClick={handleSaveDraft}
            title="Save your work as a draft without sealing"
          >
            Save as Draft
          </button>

          <button
            type="button"
            className="letter-action-seal-btn"
            onClick={handleSaveAndSeal}
            disabled={saving}
            title="Seal this letter and archive it in your correspondence folder"
          >
            {saving ? "Sealing..." : "Save & Seal Letter"}
          </button>
        </div>
      </header>

      {/* Main Physical Letter Paper */}
      <main className="letter-paper-stage">
        <motion.article
          className="letter-physical-sheet"
          style={{
            backgroundColor: sheetBgColor,
            fontFamily: getFontFamilyById(fontFamilyId),
            color: "#262626",
          }}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Top Stationery Header with Date & Postmark Seal */}
          <div className="stationery-top-bar">
            <div className="stationery-dateline">
              <span className="stationery-date-text">{dataFormatada}</span>
              {letterStatus === "draft" && (
                <span className="stationery-draft-pill">Unsealed Draft</span>
              )}
            </div>

            {/* Vintage Postmark Stamp */}
            <div
              className="stationery-postage-seal"
              style={{ borderColor: cartaSelo.color }}
              title={`Postal Stamp: ${cartaSelo.label} (${letterTheme})`}
            >
              <div className="stamp-inner" style={{ color: cartaSelo.color }}>
                <span className="stamp-theme-label">{letterTheme.toUpperCase()}</span>
                <span className="stamp-postmark">{cartaSelo.postmark}</span>
                <span className="stamp-code">{cartaSelo.code}</span>
              </div>
            </div>
          </div>

          {/* Letter Title Input */}
          <div className="stationery-field-group">
            <input
              ref={titleInputRef}
              type="text"
              className="letter-input-title"
              value={cartaTitulo}
              onChange={(e) => setCartaTitulo(e.target.value)}
              placeholder="Title of this letter..."
              aria-label="Letter title"
            />
          </div>

          {/* Recipient Input */}
          <div className="stationery-field-group recipient-group">
            <span className="salutation-prefix">To:</span>
            <input
              type="text"
              className="letter-input-recipient"
              value={cartaDestinatario}
              onChange={(e) => setCartaDestinatario(e.target.value)}
              placeholder="Recipient (e.g., Dear Eleanor, My Future Self...)"
              aria-label="Letter recipient"
            />
          </div>

          {/* Unruled Writing Area */}
          <div className="stationery-body-wrapper">
            <textarea
              ref={bodyTextareaRef}
              className="letter-writing-textarea"
              value={cartaConteudo}
              onChange={(e) => setCartaConteudo(e.target.value)}
              placeholder="Write your letter here... Take your time; these words are kept for as long as you wish."
              aria-label="Letter content"
              rows={16}
            />
          </div>

          {/* Signature Line */}
          <div className="stationery-signature-section">
            <span className="signature-prefix">Signed:</span>
            <input
              type="text"
              className="letter-input-signature"
              value={cartaAssinatura}
              onChange={(e) => setCartaAssinatura(e.target.value)}
              placeholder={user?.nome ? user.nome : "Your signature..."}
              aria-label="Letter signature"
            />
          </div>
        </motion.article>
      </main>

      {/* New Folder Modal */}
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
              <h3>Create Correspondence Folder</h3>
              <p>Organize your letters into dedicated physical folders.</p>
              <form onSubmit={handleCreateFolderInline}>
                <input
                  type="text"
                  autoFocus
                  className="letter-minimal-input"
                  value={newFolderInputName}
                  onChange={(e) => setNewFolderInputName(e.target.value)}
                  placeholder="Folder name (e.g., Letters to Family, Autumn Notes)..."
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

      {/* Saved Drafts Drawer */}
      <AnimatePresence>
        {draftsDrawerOpen && (
          <div
            className="entry-modal-backdrop"
            onClick={() => setDraftsDrawerOpen(false)}
          >
            <motion.div
              className="drafts-drawer-panel"
              onClick={(e) => e.stopPropagation()}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.25 }}
            >
              <div className="drawer-panel-header">
                <h3>Saved Drafts</h3>
                <button
                  type="button"
                  className="drawer-close-btn"
                  onClick={() => setDraftsDrawerOpen(false)}
                >
                  ✕
                </button>
              </div>

              <div className="drawer-panel-list">
                {savedLetters
                  .filter((l) => l.status === "draft")
                  .map((draft) => (
                    <article
                      key={draft.id}
                      className="draft-item-card"
                      onClick={() => {
                        loadLetterIntoEditor(draft);
                        setDraftsDrawerOpen(false);
                        playPaperSound();
                        setToastMessage(`Draft "${draft.titulo}" loaded.`);
                        setTimeout(() => setToastMessage(null), 3000);
                      }}
                    >
                      <div className="draft-item-top">
                        <span className="draft-item-theme">
                          {draft.tema_carta || draft.selo_carta || "Draft"}
                        </span>
                        <span className="draft-item-date">
                          {formatShortDate(draft.atualizado_em || draft.criado_em)}
                        </span>
                      </div>
                      <h4 className="draft-item-title">{draft.titulo || "Untitled"}</h4>
                      {draft.destinatario && (
                        <span className="draft-item-to">To: {draft.destinatario}</span>
                      )}
                      <p className="draft-item-snippet">
                        {draft.conteudo ? draft.conteudo.slice(0, 90) + "…" : "Empty draft"}
                      </p>
                    </article>
                  ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Account Required Prompt when Guest Attempts Permanent Save */}
      <GuestSavePromptModal
        isOpen={guestPromptOpen}
        onClose={() => setGuestPromptOpen(false)}
        variant="save"
      />
    </div>
  );
}
