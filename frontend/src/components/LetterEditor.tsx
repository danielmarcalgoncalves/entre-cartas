"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { letters as archiveLetters, type Letter } from "@/lib/letters";
import { Tape, Sticker } from "@/components/paper-kit";
import { api } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import {
  ACTIVE_LETTER_EDIT_ID_KEY,
  ACTIVE_LETTER_FOLDER_ID_KEY,
  FOLDER_COLOR_OPTIONS,
  FONT_OPTIONS,
  INK_OPTIONS,
  JOURNAL_UPDATED_EVENT,
  PAPER_OPTIONS,
  PINNED_THEME_STORAGE_KEY,
  PROMPTS,
  SEAL_OPTIONS,
  formatShortDate,
  getFolderTheme,
  getFontFamilyById,
  getInkColorById,
  getPaperColorById,
  getSealByIdOrLabel,
  loadLetterFolders,
  loadSavedLetters,
  playPaperSound,
  saveLetterFolders,
  upsertUserLetter,
  type JournalEntry,
  type LetterFolder,
  type PostalSeal,
} from "@/lib/journal-storage";

export default function LetterEditor() {
  const { user, isPro } = useAuth();

  // Letter Editing State
  const [editingLetterId, setEditingLetterId] = useState<string | null>(null);
  const [editingRemoteId, setEditingRemoteId] = useState<number | string | undefined>(undefined);
  const [editingCreatedAt, setEditingCreatedAt] = useState<string | null>(null);
  const [letterStatus, setLetterStatus] = useState<"draft" | "completed">("draft");

  const [cartaTitulo, setCartaTitulo] = useState("");
  const [cartaDestinatario, setCartaDestinatario] = useState("");
  const [cartaConteudo, setCartaConteudo] = useState("");
  const [cartaAssinatura, setCartaAssinatura] = useState("");
  const [cartaFavoritado, setCartaFavoritado] = useState(false);
  const [cartaSelo, setCartaSelo] = useState<PostalSeal>(SEAL_OPTIONS[0]);

  const [dataFormatada, setDataFormatada] = useState("");

  // Saved Letters & Folders
  const [savedLetters, setSavedLetters] = useState<JournalEntry[]>([]);
  const [letterFolders, setLetterFolders] = useState<LetterFolder[]>([]);
  const [activeLetterFolderId, setActiveLetterFolderId] = useState<string>("");
  const [folderDrawerOpen, setFolderDrawerOpen] = useState(false);
  const [savedLettersDrawerOpen, setSavedLettersDrawerOpen] = useState(false);
  const [newFolderTitle, setNewFolderTitle] = useState("");
  const [newFolderColor, setNewFolderColor] = useState<string>("marrom");
  const [folderPromptNotice, setFolderPromptNotice] = useState<string | null>(null);
  const [pendingActionAfterFolder, setPendingActionAfterFolder] = useState<"seal" | null>(null);

  // Stationery Customization
  const [customMenuOpen, setCustomMenuOpen] = useState(false);
  const [sheetBgId, setSheetBgId] = useState("marfim");
  const [sheetBgColor, setSheetBgColor] = useState("#FCFBF7");
  const [inkColorId, setInkColorId] = useState("nanquim");
  const [inkColor, setInkColor] = useState("#262626");
  const [fontFamilyId, setFontFamilyId] = useState("caveat");

  // Inspiration & Pinned Theme
  const [temaSalvo, setTemaSalvo] = useState<string>("");
  const [inspiracaoModal, setInspiracaoModal] = useState(false);
  const [cartaInspiracao, setCartaInspiracao] = useState<Letter | null>(null);
  const [promptTexto, setPromptTexto] = useState("");

  // Feedback
  const [salvando, setSalvando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState("");

  const menuRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const hasLoadedInitialEditRef = useRef(false);

  const activeLetterFolder =
    letterFolders.find((f) => f.id === activeLetterFolderId) ||
    (letterFolders.length > 0 ? letterFolders[0] : null);

  useEffect(() => {
    const hoje = new Date();
    const opcoes: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    setDataFormatada(hoje.toLocaleDateString("en-US", opcoes));

    try {
      const storedTheme = window.localStorage.getItem(PINNED_THEME_STORAGE_KEY);
      if (storedTheme) setTemaSalvo(storedTheme);
    } catch {}
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setCustomMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    setCartaSelo(getSealByIdOrLabel(entry.selo_carta || entry.humor));

    const paperId = entry.tipo_papel || "marfim";
    setSheetBgId(paperId);
    setSheetBgColor(getPaperColorById(paperId));

    const inkId = entry.cor_tinta || "nanquim";
    setInkColorId(inkId);
    setInkColor(getInkColorById(inkId));

    const fontId = entry.fonte || "caveat";
    setFontFamilyId(fontId);

    if (entry.pasta_id) {
      setActiveLetterFolderId(entry.pasta_id);
    }
  };

  const carregarDadosCartas = (event?: any) => {
    if (event?.detail?.source === "letter-editor") return;

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
        setActiveLetterFolderId(savedFolderId);
      } else if (!activeLetterFolderId) {
        setActiveLetterFolderId(loadedFolders[0].id);
      }
    } else {
      setActiveLetterFolderId("");
    }

    if (!hasLoadedInitialEditRef.current && typeof window !== "undefined") {
      hasLoadedInitialEditRef.current = true;
      let targetEditId: string | null = null;
      try {
        const params = new URLSearchParams(window.location.search);
        targetEditId =
          params.get("edit") ||
          window.localStorage.getItem(ACTIVE_LETTER_EDIT_ID_KEY);
        if (targetEditId) {
          window.localStorage.removeItem(ACTIVE_LETTER_EDIT_ID_KEY);
        }
      } catch {}

      if (targetEditId) {
        const found = loadedLetters.find(
          (l) => String(l.id) === String(targetEditId)
        );
        if (found) {
          loadLetterIntoEditor(found);
        }
      }
    }
  };

  useEffect(() => {
    carregarDadosCartas();
    window.addEventListener(JOURNAL_UPDATED_EVENT, carregarDadosCartas);
    window.addEventListener("storage", carregarDadosCartas);
    return () => {
      window.removeEventListener(JOURNAL_UPDATED_EVENT, carregarDadosCartas);
      window.removeEventListener("storage", carregarDadosCartas);
    };
  }, [user?.id]);

  const iniciarNovaCartaEmBranco = () => {
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
    try {
      window.localStorage.removeItem(ACTIVE_LETTER_EDIT_ID_KEY);
    } catch {}
    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 80);
  };

  const salvarRascunhoCarta = () => {
    if (!cartaConteudo.trim() && !cartaTitulo.trim() && !cartaDestinatario.trim()) {
      alert("Write a title, recipient, or a few words before saving a draft.");
      return;
    }

    playPaperSound();
    const nowIso = new Date().toISOString();
    const draftId = editingLetterId || "entry-" + Date.now();
    const tituloFinal =
      cartaTitulo.trim() ||
      (cartaDestinatario.trim()
        ? `Draft to ${cartaDestinatario.trim()}`
        : `Draft (${cartaSelo.label})`);

    const draftEntry: JournalEntry = {
      id: draftId,
      titulo: tituloFinal,
      destinatario: cartaDestinatario.trim() || undefined,
      assinatura: cartaAssinatura.trim() || user?.nome || undefined,
      conteudo: cartaConteudo,
      humor: cartaSelo.id,
      data_formatada: dataFormatada || "Today",
      criado_em: editingCreatedAt || nowIso,
      atualizado_em: nowIso,
      tipo_papel: sheetBgId,
      cor_tinta: inkColorId,
      fonte: fontFamilyId,
      favoritado: cartaFavoritado,
      selo_carta: cartaSelo.label,
      pasta_id: activeLetterFolder?.id,
      pasta_nome: activeLetterFolder?.nome,
      status: "draft",
      usuario_id: user?.id,
      remote_id: editingRemoteId,
    };

    upsertUserLetter(draftEntry, "letter-editor");
    setEditingLetterId(draftId);
    setEditingCreatedAt(draftEntry.criado_em);
    setLetterStatus("draft");
    setSavedLetters(loadSavedLetters(user?.id));

    setMensagemSucesso(`Draft "${tituloFinal}" saved to your stationery desk.`);
    setTimeout(() => setMensagemSucesso(""), 3000);
  };

  const salvarCartaFinalizada = async (overrideFolder?: LetterFolder) => {
    if (!cartaConteudo.trim() && !cartaTitulo.trim()) {
      alert("Please write your letter before sealing and saving.");
      return;
    }

    const targetFolder = overrideFolder || activeLetterFolder;
    if (!targetFolder) {
      setFolderPromptNotice(
        "Choose or create a correspondence folder to store your sealed letter."
      );
      setPendingActionAfterFolder("seal");
      setFolderDrawerOpen(true);
      playPaperSound();
      return;
    }

    const limiteCartas = isPro ? 30 : 10;
    const isUpdatingExisting = Boolean(
      editingLetterId &&
        savedLetters.some((l) => String(l.id) === String(editingLetterId))
    );

    if (!isUpdatingExisting && savedLetters.length >= limiteCartas) {
      alert(
        isPro
          ? `You have reached the limit of ${limiteCartas} archived letters on the Premium Plan.`
          : `You have reached the limit of ${limiteCartas} letters on the Standard Plan. Join Pro Club to write up to 30 letters!`
      );
      return;
    }

    setSalvando(true);
    playPaperSound();

    const nowIso = new Date().toISOString();
    const letterId = editingLetterId || "entry-" + Date.now();
    const tituloFinal =
      cartaTitulo.trim() ||
      (cartaDestinatario.trim()
        ? `Letter to ${cartaDestinatario.trim()}`
        : `Letter: ${cartaSelo.label}`);

    let remoteId = editingRemoteId;

    // Sync with backend when possible
    if (cartaConteudo.trim().length >= 5) {
      try {
        if (remoteId) {
          await api.cartas.atualizar(remoteId, {
            titulo: tituloFinal,
            conteudo: cartaConteudo.trim(),
            destinatario_anonimo: cartaDestinatario.trim() || null,
            categoria: cartaSelo.id,
            tipo_papel: sheetBgId,
          });
        } else if (
          editingLetterId &&
          !String(editingLetterId).startsWith("entry-") &&
          !Number.isNaN(Number(editingLetterId))
        ) {
          await api.cartas.atualizar(editingLetterId, {
            titulo: tituloFinal,
            conteudo: cartaConteudo.trim(),
            destinatario_anonimo: cartaDestinatario.trim() || null,
            categoria: cartaSelo.id,
            tipo_papel: sheetBgId,
          });
        } else {
          const res = await api.cartas.enviar({
            titulo: tituloFinal,
            conteudo: cartaConteudo.trim(),
            remetente_anonimo:
              cartaAssinatura.trim() || user?.nome || "Correspondent",
            destinatario_anonimo: cartaDestinatario.trim() || null,
            categoria: cartaSelo.id,
            tipo_papel: sheetBgId,
            data_carta: dataFormatada || "Today",
          });
          if (res?.carta?.id) {
            remoteId = res.carta.id;
          }
        }
      } catch (err: any) {
        if (err?.isLimitReached && err?.message) {
          alert(err.message);
        }
      }
    }

    const finalEntry: JournalEntry = {
      id: letterId,
      titulo: tituloFinal,
      destinatario: cartaDestinatario.trim() || undefined,
      assinatura: cartaAssinatura.trim() || user?.nome || undefined,
      conteudo: cartaConteudo.trim(),
      humor: cartaSelo.id,
      data_formatada: dataFormatada || "Today",
      criado_em: editingCreatedAt || nowIso,
      atualizado_em: nowIso,
      tipo_papel: sheetBgId,
      cor_tinta: inkColorId,
      fonte: fontFamilyId,
      favoritado: cartaFavoritado,
      selo_carta: cartaSelo.label,
      pasta_id: targetFolder.id,
      pasta_nome: targetFolder.nome,
      status: "completed",
      usuario_id: user?.id,
      remote_id: remoteId,
    };

    upsertUserLetter(finalEntry);
    setSavedLetters(loadSavedLetters(user?.id));
    setEditingLetterId(letterId);
    setEditingRemoteId(remoteId);
    setEditingCreatedAt(finalEntry.criado_em);
    setLetterStatus("completed");
    setCartaTitulo(tituloFinal);

    setSalvando(false);
    setMensagemSucesso(
      isUpdatingExisting
        ? `Changes saved to letter "${tituloFinal}" in folder "${targetFolder.nome}".`
        : `Letter "${tituloFinal}" sealed and archived in folder "${targetFolder.nome}"!`
    );
    setTimeout(() => setMensagemSucesso(""), 3400);
  };

  const criarNovaPasta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderTitle.trim()) return;

    const limitePastas = isPro ? 10 : 3;
    if (letterFolders.length >= limitePastas) {
      alert(
        isPro
          ? `You have reached the limit of ${limitePastas} folders on the Premium Plan.`
          : `You have reached the limit of ${limitePastas} folders on the Standard Plan. Join Pro Club to have up to 10 folders!`
      );
      return;
    }

    const chosenTheme = getFolderTheme(newFolderColor);
    const nova: LetterFolder = {
      id: "pasta-" + Date.now(),
      nome: newFolderTitle.trim(),
      cor: chosenTheme.corHex,
      criadoEm: new Date().toISOString(),
      ownerId: user?.id,
    };

    const atualizadas = [...letterFolders, nova];
    setLetterFolders(atualizadas);
    setActiveLetterFolderId(nova.id);
    saveLetterFolders(atualizadas);
    try {
      window.localStorage.setItem(ACTIVE_LETTER_FOLDER_ID_KEY, nova.id);
    } catch {}

    setNewFolderTitle("");
    setNewFolderColor("marrom");
    setFolderDrawerOpen(false);
    setFolderPromptNotice(null);
    playPaperSound();

    if (pendingActionAfterFolder === "seal") {
      setPendingActionAfterFolder(null);
      salvarCartaFinalizada(nova);
    } else {
      setMensagemSucesso(`Correspondence folder "${nova.nome}" created.`);
      setTimeout(() => setMensagemSucesso(""), 2800);
    }
  };

  const sortearInspiracao = () => {
    const carta =
      archiveLetters[Math.floor(Math.random() * archiveLetters.length)];
    const prompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
    setCartaInspiracao(carta);
    setPromptTexto(prompt);
    setInspiracaoModal(true);
    playPaperSound();
  };

  const aplicarInspiracao = () => {
    if (promptTexto) {
      setTemaSalvo(promptTexto);
      try {
        window.localStorage.setItem(PINNED_THEME_STORAGE_KEY, promptTexto);
      } catch {}
    }
    setInspiracaoModal(false);
    playPaperSound();
  };

  const draftsList = savedLetters.filter((l) => l.status === "draft");
  const completedList = savedLetters.filter((l) => l.status !== "draft");

  return (
    <section
      className="writing-desk-wrap letter-stationery-experience"
      id="letter-writing-desk"
      aria-label="Personal Letter Writing Desk"
    >
      {/* Meaningful Letters Empty State Banner when user has no letters yet */}
      {savedLetters.length === 0 && !cartaConteudo && !cartaTitulo && (
        <motion.div
          className="architecture-empty-banner architecture-empty-banner--letters"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="architecture-empty-banner__art" aria-hidden="true">
            <div className="envelope envelope--sealed">
              <div className="envelope__flap" />
              <div className="envelope__seal">✦</div>
            </div>
          </div>
          <div className="architecture-empty-banner__copy">
            <span className="section-kicker">PERSONAL CORRESPONDENCE DESK</span>
            <h2>Some words are meant to be written.</h2>
            <p>
              Start writing a letter and preserve the words you want to remember.
            </p>
          </div>
          <div className="architecture-empty-banner__actions">
            <button
              type="button"
              className="sober-save-btn"
              onClick={() => {
                playPaperSound();
                titleInputRef.current?.focus();
              }}
            >
              Write a Letter
            </button>
          </div>
        </motion.div>
      )}

      <div className="writing-desk-container is-mode-carta">
        {/* Left Column: Physical Envelope Preview, Folder Filing, Postal Seals & Save Controls */}
        <div className="desk-left-col">
          <div className="carta-left-column-inner">
            {/* Live Physical Envelope Preview */}
            <div className="stationery-envelope-preview-card">
              <div className="stationery-envelope-preview-top">
                <span className="postal-folder-tag">ENVELOPE PREVIEW</span>
                <span
                  className="stamp-mark"
                  style={{
                    fontSize: "7.5px",
                    padding: "2px 6px",
                    borderColor: cartaSelo.color,
                    color: "var(--color-pollen, #cfa96f)",
                  }}
                >
                  {cartaSelo.code}
                </span>
              </div>

              <div className="stationery-envelope-visual">
                <div className="stationery-envelope-flap" />
                <div
                  className="stationery-envelope-wax"
                  style={{ backgroundColor: cartaSelo.color }}
                  title={`Wax seal: ${cartaSelo.label}`}
                >
                  ✦
                </div>
                <div className="stationery-envelope-lines">
                  <span className="stationery-envelope-to">
                    {cartaDestinatario.trim()
                      ? `To: ${cartaDestinatario.trim()}`
                      : "To: A cherished recipient"}
                  </span>
                  <span className="stationery-envelope-subject">
                    {cartaTitulo.trim() || "Untitled Letter"}
                  </span>
                </div>
              </div>

              <div className="stationery-envelope-status-row">
                <span>
                  {editingLetterId
                    ? letterStatus === "draft"
                      ? "Editing Saved Draft"
                      : "Editing Saved Letter"
                    : "New Correspondence"}
                </span>
                {editingLetterId && (
                  <button
                    type="button"
                    className="stationery-reset-link"
                    onClick={iniciarNovaCartaEmBranco}
                    title="Start a brand new blank letter"
                  >
                    + New Letter
                  </button>
                )}
              </div>
            </div>

            {/* Correspondence Folder Selector */}
            {activeLetterFolder ? (
              (() => {
                const folderTheme = getFolderTheme(activeLetterFolder.cor);
                return (
                  <div
                    className={`postal-folder-selector-card postal-folder-color--${folderTheme.id}`}
                    onClick={() => {
                      setFolderPromptNotice(null);
                      setFolderDrawerOpen(true);
                    }}
                    role="button"
                    tabIndex={0}
                    title="Click to choose or create a correspondence folder"
                  >
                    <div className="postal-folder-selector-top">
                      <span className="postal-folder-tag">FILE IN FOLDER</span>
                      <span className="postal-folder-change-badge">Change ▾</span>
                    </div>
                    <div className="postal-folder-title-row">
                      <div className="postal-folder-img-frame" aria-hidden="true">
                        <img
                          src={folderTheme.imagem}
                          alt={activeLetterFolder.nome}
                          className="postal-folder-svg-img"
                        />
                      </div>
                      <div className="postal-folder-meta">
                        <span
                          className="postal-folder-name"
                          title={activeLetterFolder.nome}
                        >
                          {activeLetterFolder.nome}
                        </span>
                        <span className="postal-folder-theme-tag">
                          {folderTheme.nome} · {folderTheme.etiqueta}
                        </span>
                      </div>
                    </div>
                    <div className="postal-folder-quota-line">
                      {letterFolders.length}/{isPro ? 10 : 3} folders created (
                      {isPro ? "Premium" : "Standard"})
                    </div>
                  </div>
                );
              })()
            ) : (
              <div
                className="postal-folder-selector-card is-empty-state"
                onClick={() => {
                  setFolderPromptNotice(null);
                  setFolderDrawerOpen(true);
                }}
                role="button"
                tabIndex={0}
                title="Click to create your first correspondence folder"
              >
                <div className="postal-folder-selector-top">
                  <span className="postal-folder-tag">POSTAL ARCHIVE</span>
                  <span className="postal-folder-change-badge">+ Create</span>
                </div>
                <div className="postal-folder-title-row">
                  <div
                    className="postal-folder-img-frame is-empty"
                    aria-hidden="true"
                  >
                    <img
                      src="/images/pastas/pasta-marrom.svg"
                      alt="Create folder"
                      className="postal-folder-svg-img is-ghost"
                    />
                  </div>
                  <div className="postal-folder-meta">
                    <span className="postal-folder-name">
                      + Create Postal Folder
                    </span>
                    <span className="postal-folder-theme-tag">
                      Physical letter folder
                    </span>
                  </div>
                </div>
                <div className="postal-folder-quota-line">
                  0/{isPro ? 10 : 3} folders created (
                  {isPro ? "Premium" : "Standard"})
                </div>
              </div>
            )}

            {/* Postage Stamp Selector */}
            <div className="postal-seals-card">
              <div className="postal-seals-header">
                <span>POSTAGE STAMPS</span>
                <small>Epistolary classification</small>
              </div>
              <div className="postal-seals-grid">
                {SEAL_OPTIONS.map((seal) => (
                  <button
                    key={seal.id}
                    type="button"
                    className={`seal-choice-btn ${
                      cartaSelo.id === seal.id ? "selected" : ""
                    }`}
                    style={{ "--seal-color": seal.color } as any}
                    onClick={() => {
                      setCartaSelo(seal);
                      playPaperSound();
                    }}
                    title={`Apply ${seal.label} postage stamp`}
                  >
                    <span className="seal-choice-code">{seal.code}</span>
                    <span className="seal-choice-label">{seal.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div
            className="desk-left-bottom"
            style={{ display: "flex", flexDirection: "column", gap: "8px" }}
          >
            <button
              type="button"
              className="sober-save-btn"
              onClick={() => salvarCartaFinalizada()}
              disabled={salvando}
              title="Seal and save this completed letter into your selected folder"
            >
              {salvando
                ? "SEALING..."
                : editingLetterId && letterStatus === "completed"
                ? "UPDATE SEALED LETTER"
                : "SAVE & SEAL LETTER"}
            </button>

            <button
              type="button"
              className="stationery-secondary-btn"
              onClick={salvarRascunhoCarta}
              title="Save this letter as a work-in-progress draft"
            >
              Save as Draft
            </button>
          </div>
        </div>

        {/* Center Column: Dedicated Vintage Stationery Sheet */}
        <div className="desk-center-col">
          <div className="notebook-tabs-container">
            <div className="notebook-tab notebook-tab--carta active" aria-current="page">
              {editingLetterId
                ? letterStatus === "draft"
                  ? "Correspondence · Draft"
                  : "Correspondence · Editing Letter"
                : "Personal Correspondence"}
            </div>
            <button
              type="button"
              className="notebook-tab"
              style={{
                background: "rgba(43, 34, 26, 0.78)",
                color: "var(--color-pollen, #cfa96f)",
                fontSize: "11px",
              }}
              onClick={() => {
                setSavedLettersDrawerOpen(true);
                playPaperSound();
              }}
              title="Open saved letters or drafts for editing"
            >
              Open Saved / Drafts ({savedLetters.length}) ▾
            </button>
          </div>

          <div className="sheet-stage-wrapper">
            <motion.div
              key={editingLetterId || "new-letter-sheet"}
              className="writing-sheet-card mode-carta stationery-letter-sheet"
              style={{
                backgroundColor: sheetBgColor,
                color: inkColor,
                fontFamily: getFontFamilyById(fontFamilyId),
              }}
              initial={{ opacity: 0.9, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
            >
              <div className="carta-content-inner">
                {/* Affixed Perforated Postage Stamp & Cancellation Postmark */}
                <div
                  className="affixed-postage-stamp"
                  style={{ "--stamp-color": cartaSelo.color } as any}
                >
                  <div className="stamp-perforations">
                    <span className="stamp-symbol">{cartaSelo.code}</span>
                    <span className="stamp-text">{cartaSelo.label}</span>
                    <span className="stamp-denomination">BL • POST</span>
                  </div>
                  <div className="postmark-circle" aria-hidden="true">
                    <span>BETWEEN LETTERS</span>
                    <small>{cartaSelo.postmark}</small>
                  </div>
                </div>

                {/* Top Date & Epistolary Classification */}
                <div className="carta-top-meta">
                  <span className="carta-date">{dataFormatada || "Today"}</span>
                  <span
                    className="carta-sentiment-badge"
                    style={{ color: cartaSelo.color }}
                  >
                    Stamp: {cartaSelo.label}
                  </span>
                  {editingLetterId && (
                    <span className="stationery-mode-pill">
                      {letterStatus === "draft" ? "DRAFT" : "SAVED LETTER"}
                    </span>
                  )}
                </div>

                {/* Letter Title Input */}
                <div className="stationery-field-row">
                  <label
                    htmlFor="letter-title-input"
                    className="stationery-field-label"
                  >
                    Title:
                  </label>
                  <input
                    id="letter-title-input"
                    ref={titleInputRef}
                    type="text"
                    className="stationery-inline-input stationery-inline-input--title"
                    value={cartaTitulo}
                    onChange={(e) => setCartaTitulo(e.target.value)}
                    placeholder="Title of this letter (e.g., Words Kept for Autumn)..."
                  />
                </div>

                {/* Recipient Input */}
                <div className="stationery-field-row">
                  <label
                    htmlFor="letter-recipient-input"
                    className="stationery-field-label"
                  >
                    To:
                  </label>
                  <input
                    id="letter-recipient-input"
                    type="text"
                    className="stationery-inline-input"
                    value={cartaDestinatario}
                    onChange={(e) => setCartaDestinatario(e.target.value)}
                    placeholder="Recipient or salutation (optional — e.g., Dear Clara, My Future Self)..."
                  />
                </div>

                {/* Main Unruled Letter Body */}
                <textarea
                  ref={bodyTextareaRef}
                  className="carta-textarea-unruled"
                  value={cartaConteudo}
                  onChange={(e) => setCartaConteudo(e.target.value)}
                  placeholder="Write your letter here... Take your time; every word will be preserved on this stationery."
                  aria-label="Letter content"
                  rows={13}
                />

                {/* Signature & Footer Meta */}
                <div className="stationery-signature-row">
                  <label
                    htmlFor="letter-signature-input"
                    className="stationery-field-label"
                  >
                    Signed:
                  </label>
                  <input
                    id="letter-signature-input"
                    type="text"
                    className="stationery-signature-input"
                    value={cartaAssinatura}
                    onChange={(e) => setCartaAssinatura(e.target.value)}
                    placeholder={
                      user?.nome
                        ? `With affection, ${user.nome}`
                        : "Your signature (optional)..."
                    }
                  />
                </div>

                <div className="carta-footer-meta">
                  <span className="carta-seal-status">
                    Postage seal: <b>{cartaSelo.label}</b> · Paper:{" "}
                    <b>
                      {PAPER_OPTIONS.find((p) => p.id === sheetBgId)?.name ||
                        "Cotton & Ivory"}
                    </b>
                  </span>
                  <motion.button
                    type="button"
                    className={`classic-stamp-favorite ${
                      cartaFavoritado ? "is-favorited" : ""
                    }`}
                    onClick={() => {
                      playPaperSound();
                      setCartaFavoritado(!cartaFavoritado);
                    }}
                    whileTap={{ scale: 0.95 }}
                    title="Stamp letter as favorite"
                  >
                    {cartaFavoritado ? "FAVORITED ♥" : "FAVORITE ♥"}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Right Column: Stationery Menu, Inspiration, Saved Drafts & My Shelf Link */}
        <div className="desk-right-col">
          <div className="desk-right-tools">
            <div className="vintage-menu-wrapper" ref={menuRef}>
              <button
                type="button"
                className="vintage-menu-btn"
                onClick={() => setCustomMenuOpen(!customMenuOpen)}
                aria-expanded={customMenuOpen}
                title="Customize stationery paper, ink color, and calligraphy"
              >
                <span>Stationery & Ink</span>
                <span className="menu-caret">▾</span>
              </button>

              <AnimatePresence>
                {customMenuOpen && (
                  <motion.div
                    className="floating-customization-menu"
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.16 }}
                  >
                    {/* 1. Stationery Paper */}
                    <div className="menu-group">
                      <span className="menu-group-title">Stationery Paper</span>
                      <div className="paper-swatches">
                        {PAPER_OPTIONS.map((paper) => (
                          <button
                            key={paper.id}
                            type="button"
                            className={`paper-swatch ${
                              sheetBgId === paper.id ? "active" : ""
                            }`}
                            style={{ backgroundColor: paper.color }}
                            onClick={() => {
                              setSheetBgId(paper.id);
                              setSheetBgColor(paper.color);
                            }}
                            title={paper.name}
                          >
                            {sheetBgId === paper.id ? "✓" : ""}
                          </button>
                        ))}
                      </div>
                      <small className="swatch-name">
                        {PAPER_OPTIONS.find((p) => p.id === sheetBgId)?.name}
                      </small>
                    </div>

                    {/* 2. Ink Color */}
                    <div className="menu-group">
                      <span className="menu-group-title">Ink Color</span>
                      <div className="ink-swatches">
                        {INK_OPTIONS.map((ink) => (
                          <button
                            key={ink.id}
                            type="button"
                            className={`ink-swatch ${
                              inkColorId === ink.id ? "active" : ""
                            }`}
                            style={{ backgroundColor: ink.color }}
                            onClick={() => {
                              setInkColorId(ink.id);
                              setInkColor(ink.color);
                            }}
                            title={ink.name}
                          >
                            {inkColorId === ink.id ? "✓" : ""}
                          </button>
                        ))}
                      </div>
                      <small className="swatch-name">
                        {INK_OPTIONS.find((i) => i.id === inkColorId)?.name}
                      </small>
                    </div>

                    {/* 3. Typography & Calligraphy */}
                    <div className="menu-group">
                      <span className="menu-group-title">
                        Script & Typography
                      </span>
                      <div className="font-options-list">
                        {FONT_OPTIONS.map((font) => (
                          <button
                            key={font.id}
                            type="button"
                            className={`font-choice-btn ${
                              fontFamilyId === font.id ? "active" : ""
                            }`}
                            style={{ fontFamily: font.styleFamily }}
                            onClick={() => setFontFamilyId(font.id)}
                          >
                            <span>{font.name}</span>
                            {fontFamilyId === font.id && (
                              <span className="font-check">✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              type="button"
              className="inspire-trigger-btn"
              onClick={sortearInspiracao}
              title="Pull an epistolary prompt from the archive"
            >
              <span>Pull Inspiration</span>
            </button>

            <button
              type="button"
              className="inspire-trigger-btn"
              onClick={() => {
                setSavedLettersDrawerOpen(true);
                playPaperSound();
              }}
              title="Open drafts or saved letters to continue editing"
            >
              <span>Drafts & Letters ({savedLetters.length})</span>
            </button>

            <Link
              href="/my-shelf?section=letters"
              className="inspire-trigger-btn"
              style={{ textDecoration: "none", justifyContent: "center" }}
              title="View all folders and letters on My Shelf"
            >
              <span>My Shelf Letters ↗</span>
            </Link>

            {temaSalvo && (
              <div className="pinned-theme-box">
                <div className="pinned-theme-top">
                  <span className="pinned-theme-label">EPISTOLARY PROMPT</span>
                  <button
                    type="button"
                    className="pinned-theme-clear"
                    onClick={() => {
                      setTemaSalvo("");
                      try {
                        window.localStorage.removeItem(PINNED_THEME_STORAGE_KEY);
                      } catch {}
                    }}
                    title="Remove prompt"
                  >
                    ✕
                  </button>
                </div>
                <p className="pinned-theme-phrase">“{temaSalvo}”</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Saved Letters & Drafts Drawer (Quick Reopen for Editing) */}
      <AnimatePresence>
        {savedLettersDrawerOpen && (
          <div
            className="notebook-drawer-backdrop"
            onClick={() => setSavedLettersDrawerOpen(false)}
          >
            <motion.div
              className="notebook-drawer-sheet"
              style={{ width: "min(540px, 94vw)" }}
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.92, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 15 }}
            >
              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => setSavedLettersDrawerOpen(false)}
                title="Close"
              >
                ✕
              </button>
              <h3 className="drawer-title">Saved Letters & Drafts</h3>
              <p className="drawer-subtitle">
                Select any draft or previously saved letter to open it on your stationery desk for editing.
              </p>

              <div className="notebooks-list" style={{ maxHeight: "340px" }}>
                {savedLetters.length === 0 ? (
                  <div className="drawer-empty-state-hint">
                    <span className="empty-hint-title">
                      Some words are meant to be written.
                    </span>
                    <p className="empty-hint-text">
                      Your saved drafts and sealed letters will appear here so you can reopen and edit them anytime.
                    </p>
                  </div>
                ) : (
                  <>
                    {draftsList.length > 0 && (
                      <div style={{ marginBottom: "8px" }}>
                        <span
                          className="new-notebook-label"
                          style={{ marginBottom: "6px" }}
                        >
                          DRAFTS ({draftsList.length})
                        </span>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                          }}
                        >
                          {draftsList.map((item) => (
                            <div
                              key={item.id}
                              className={`notebook-item-card ${
                                editingLetterId === String(item.id)
                                  ? "is-active"
                                  : ""
                              }`}
                              onClick={() => {
                                loadLetterIntoEditor(item);
                                setSavedLettersDrawerOpen(false);
                                playPaperSound();
                              }}
                            >
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <span className="notebook-item-name">
                                  {item.titulo || "Untitled Draft"}
                                </span>
                                <div className="notebook-item-count">
                                  {item.destinatario
                                    ? `To: ${item.destinatario} · `
                                    : ""}
                                  Updated{" "}
                                  {formatShortDate(
                                    item.atualizado_em || item.criado_em
                                  )}
                                </div>
                              </div>
                              <span className="stamp-mark">DRAFT</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {completedList.length > 0 && (
                      <div>
                        <span
                          className="new-notebook-label"
                          style={{ marginBottom: "6px" }}
                        >
                          SEALED LETTERS ({completedList.length})
                        </span>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                          }}
                        >
                          {completedList.map((item) => (
                            <div
                              key={item.id}
                              className={`notebook-item-card ${
                                editingLetterId === String(item.id)
                                  ? "is-active"
                                  : ""
                              }`}
                              onClick={() => {
                                loadLetterIntoEditor(item);
                                setSavedLettersDrawerOpen(false);
                                playPaperSound();
                              }}
                            >
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <span className="notebook-item-name">
                                  {item.titulo || "Untitled Letter"}
                                </span>
                                <div className="notebook-item-count">
                                  {item.destinatario
                                    ? `To: ${item.destinatario} · `
                                    : ""}
                                  {item.selo_carta || "LETTER"} ·{" "}
                                  {formatShortDate(
                                    item.atualizado_em ||
                                      item.criado_em ||
                                      item.data_formatada
                                  )}
                                </div>
                              </div>
                              <span
                                style={{
                                  color: "var(--color-pollen, #cfa96f)",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                }}
                              >
                                Edit ✎
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: "12px",
                  borderTop: "1px dashed rgba(207, 169, 111, 0.25)",
                }}
              >
                <button
                  type="button"
                  className="new-notebook-btn"
                  onClick={() => {
                    iniciarNovaCartaEmBranco();
                    setSavedLettersDrawerOpen(false);
                  }}
                >
                  + Start New Blank Letter
                </button>
                <Link
                  href="/my-shelf?section=letters"
                  className="text-link"
                  onClick={() => setSavedLettersDrawerOpen(false)}
                >
                  Open My Shelf Archive ↗
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Correspondence Folder Drawer */}
      <AnimatePresence>
        {folderDrawerOpen && (
          <div
            className="notebook-drawer-backdrop"
            onClick={() => {
              setFolderDrawerOpen(false);
              setFolderPromptNotice(null);
              setPendingActionAfterFolder(null);
            }}
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
                onClick={() => {
                  setFolderDrawerOpen(false);
                  setFolderPromptNotice(null);
                  setPendingActionAfterFolder(null);
                }}
                title="Close"
              >
                ✕
              </button>
              <h3 className="drawer-title">Correspondence Folders</h3>
              <p className="drawer-subtitle">
                Select which folder to file your letters in or create a new physical folder.
                <br />
                <span
                  style={{
                    display: "inline-block",
                    marginTop: "4px",
                    fontSize: "11px",
                    letterSpacing: "0.06em",
                    color: "var(--color-pollen, #cfa96f)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  Quota: {letterFolders.length}/{isPro ? 10 : 3} folders (
                  {isPro ? "Premium Plan" : "Standard Plan"})
                </span>
              </p>

              {folderPromptNotice && (
                <div className="drawer-mandatory-alert">
                  <span className="drawer-alert-icon">!</span>
                  <div className="drawer-alert-body">
                    <strong>Folder Required:</strong>
                    <span>{folderPromptNotice}</span>
                  </div>
                </div>
              )}

              <div className="notebooks-list">
                {letterFolders.length === 0 ? (
                  <div className="drawer-empty-state-hint">
                    <span className="empty-hint-title">
                      No folders created yet.
                    </span>
                    <p className="empty-hint-text">
                      Name your folder below and choose a color to archive your letters safely.
                    </p>
                  </div>
                ) : (
                  letterFolders.map((fld) => {
                    const theme = getFolderTheme(fld.cor);
                    const defaultId = letterFolders[0]?.id;
                    const countInFolder = savedLetters.filter(
                      (l) =>
                        l.pasta_id === fld.id ||
                        (!l.pasta_id && fld.id === defaultId)
                    ).length;

                    return (
                      <div
                        key={fld.id}
                        className={`notebook-item-card ${
                          activeLetterFolder?.id === fld.id ? "is-active" : ""
                        }`}
                        onClick={() => {
                          setActiveLetterFolderId(fld.id);
                          try {
                            window.localStorage.setItem(
                              ACTIVE_LETTER_FOLDER_ID_KEY,
                              fld.id
                            );
                          } catch {}
                          setFolderDrawerOpen(false);
                          playPaperSound();
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                          }}
                        >
                          <div
                            className="mini-folder-thumb-box"
                            aria-hidden="true"
                          >
                            <img
                              src={theme.imagem}
                              alt={fld.nome}
                              className="mini-folder-thumb-img"
                            />
                          </div>
                          <div>
                            <span className="notebook-item-name">
                              {fld.nome}
                            </span>
                            <div className="notebook-item-count">
                              {countInFolder}{" "}
                              {countInFolder === 1
                                ? "letter archived"
                                : "letters archived"}{" "}
                              · {theme.nome}
                            </div>
                          </div>
                        </div>
                        {activeLetterFolder?.id === fld.id && (
                          <span
                            style={{
                              color: "var(--color-pollen, #cfa96f)",
                              fontWeight: 700,
                              fontSize: "12px",
                            }}
                          >
                            ✓ Selected
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={criarNovaPasta} className="new-notebook-form">
                <label className="new-notebook-label">FOLDER TITLE</label>
                <input
                  type="text"
                  className="new-notebook-input"
                  placeholder="Name of new folder (e.g., Confessions, Unsent Notes)..."
                  value={newFolderTitle}
                  onChange={(e) => setNewFolderTitle(e.target.value)}
                  maxLength={40}
                  autoFocus
                />

                <label
                  className="new-notebook-label"
                  style={{ marginTop: "14px" }}
                >
                  CHOOSE FOLDER COLOR
                </label>
                <div className="notebook-color-picker-grid">
                  {FOLDER_COLOR_OPTIONS.map((opt) => {
                    const isSelected = newFolderColor === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        className={`notebook-color-option-card ${
                          isSelected ? "is-selected" : ""
                        }`}
                        onClick={() => {
                          setNewFolderColor(opt.id);
                          playPaperSound();
                        }}
                      >
                        <div
                          className="folder-color-swatch-box"
                          style={{
                            background: opt.cardGradient,
                            borderColor: opt.cardBorder,
                          }}
                        >
                          <img
                            src={opt.imagem}
                            alt={opt.nome}
                            className="swatch-folder-img"
                          />
                          {isSelected && (
                            <span className="notebook-color-check-badge">✓</span>
                          )}
                        </div>
                        <span className="notebook-color-opt-name">
                          {opt.nome}
                        </span>
                        <small className="notebook-color-opt-sub">
                          {opt.etiqueta}
                        </small>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="submit"
                  className="new-notebook-btn"
                  style={{ marginTop: "14px" }}
                >
                  + Create Folder
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Writing Inspiration Modal */}
      <AnimatePresence>
        {inspiracaoModal && cartaInspiracao && (
          <div
            className="inspiration-modal-backdrop"
            onClick={() => setInspiracaoModal(false)}
          >
            <motion.div
              className="inspiration-modal-sheet"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
            >
              <Tape className="modal-tape" />
              <div className="modal-top">
                <span className="modal-kicker">EPISTOLARY INSPIRATION</span>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setInspiracaoModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="inspiration-prompt-box">
                <small className="prompt-label">LETTER PROMPT</small>
                <p className="prompt-text">“{promptTexto}”</p>
              </div>

              <div className="inspiration-letter-excerpt">
                <span className="excerpt-label">
                  Excerpt from “{cartaInspiracao.title}”:
                </span>
                <blockquote>“{cartaInspiracao.excerpt}”</blockquote>
                <span className="excerpt-author">
                  — {cartaInspiracao.sender}
                </span>
              </div>

              <div className="inspiration-modal-actions">
                <button
                  type="button"
                  className="btn-shuffle-inspire"
                  onClick={sortearInspiracao}
                >
                  Pull another letter
                </button>

                <button
                  type="button"
                  className="primary-cta"
                  onClick={aplicarInspiracao}
                >
                  <span>Pin this prompt</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Feedback */}
      <AnimatePresence>
        {mensagemSucesso && (
          <motion.div
            className="journal-feedback-toast"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Sticker>{mensagemSucesso}</Sticker>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
