"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/services/api";
import MyJournalCollection from "@/components/MyJournalCollection";
import MyLettersCollection from "@/components/MyLettersCollection";
import {
  JOURNAL_UPDATED_EVENT,
  filterWrittenPages,
  loadLetterFolders,
  loadSavedLetters,
  loadTrashLetters,
  loadUserNotebooks,
  playPaperSound,
  type JournalEntry,
  type LetterFolder,
  type Notebook,
} from "@/lib/journal-storage";

export default function MyShelfPage() {
  const { user, isPro } = useAuth();

  // Internal navigation tab: 'all' | 'journals' | 'letters'
  const [activeSection, setActiveSection] = useState<"all" | "journals" | "letters">("all");

  // Archive Data
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [lettersWritten, setLettersWritten] = useState<JournalEntry[]>([]);
  const [letterFolders, setLetterFolders] = useState<LetterFolder[]>([]);
  const [trashLetters, setTrashLetters] = useState<JournalEntry[]>([]);

  const limiteCadernos = isPro ? 10 : 3;
  const limiteCartas = isPro ? 30 : 10;
  const limitePastas = isPro ? 10 : 3;

  const carregarDadosEstante = useCallback(() => {
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
  }, [user?.id]);

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
    carregarDadosEstante();
    window.addEventListener(JOURNAL_UPDATED_EVENT, carregarDadosEstante);
    window.addEventListener("storage", carregarDadosEstante);
    return () => {
      window.removeEventListener(JOURNAL_UPDATED_EVENT, carregarDadosEstante);
      window.removeEventListener("storage", carregarDadosEstante);
    };
  }, [carregarDadosEstante]);

  const isShelfCompletelyEmpty =
    notebooks.length === 0 && lettersWritten.length === 0;

  return (
    <div className="personal-journal-shelf-wrap" id="my-shelf-archive">
      {/* Top Quota & Archive Summary Bar */}
      <div className="my-shelf-overview-bar">
        <div className="my-shelf-internal-nav" role="tablist" aria-label="My Shelf sections">
          <button
            type="button"
            role="tab"
            aria-selected={activeSection === "all"}
            className={`my-shelf-nav-tab ${activeSection === "all" ? "is-active" : ""}`}
            onClick={() => {
              playPaperSound();
              setActiveSection("all");
            }}
          >
            <span>All Archive</span>
            <small>{notebooks.length + lettersWritten.length}</small>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSection === "journals"}
            className={`my-shelf-nav-tab ${
              activeSection === "journals" ? "is-active" : ""
            }`}
            onClick={() => {
              playPaperSound();
              setActiveSection("journals");
            }}
          >
            <span>My Journal</span>
            <small>{notebooks.length}</small>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSection === "letters"}
            className={`my-shelf-nav-tab ${
              activeSection === "letters" ? "is-active" : ""
            }`}
            onClick={() => {
              playPaperSound();
              setActiveSection("letters");
            }}
          >
            <span>My Letters</span>
            <small>{lettersWritten.length}</small>
          </button>
        </div>

        <div className="my-shelf-quota-badges">
          <span className="my-shelf-quota-chip">
            JOURNALS: {notebooks.length}/{limiteCadernos}
          </span>
          <span className="my-shelf-quota-chip">
            LETTERS: {lettersWritten.length}/{limiteCartas}
          </span>
          <span className="my-shelf-quota-chip">
            FOLDERS: {letterFolders.length}/{limitePastas}
          </span>
          <span
            className="my-shelf-quota-chip"
            style={{
              background: isPro
                ? "var(--color-red-sands, #ad5b30)"
                : "rgba(81, 76, 52, 0.65)",
              color: "#fcfbf7",
            }}
          >
            {isPro ? "★ PRO SENDER" : "STANDARD PLAN"}
          </span>
          {!isPro && (
            <Link
              href="/clube-pro"
              style={{
                fontSize: "11px",
                color: "var(--color-pollen, #cfa96f)",
                textDecoration: "underline",
                fontWeight: 600,
              }}
            >
              Upgrade to Pro Club ↗
            </Link>
          )}
        </div>
      </div>

      {/* Overall My Shelf Empty State when both Journals and Letters are empty */}
      {isShelfCompletelyEmpty && (
        <motion.section
          className="my-shelf-master-empty-state"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          aria-label="Empty shelf invitation"
        >
          <div className="my-shelf-master-empty-state__art" aria-hidden="true">
            <div className="mini-leather-emblem">
              <span className="mini-leather-emblem__ribbon" />
              <span className="mini-leather-emblem__glyph">✎</span>
            </div>
            <div className="envelope envelope--sealed">
              <div className="envelope__flap" />
              <div className="envelope__seal">✦</div>
            </div>
          </div>

          <span className="section-kicker">PERSONAL ARCHIVE & KEEPSAKES</span>
          <h2 className="my-shelf-master-empty-state__title">
            Your shelf is waiting for memories.
          </h2>
          <p className="my-shelf-master-empty-state__desc">
            Your journals and letters will find their place here.
          </p>

          <div className="my-shelf-master-empty-state__actions">
            <Link href="/journal?create=1" className="sober-save-btn" style={{ width: "auto" }}>
              Create a Journal
            </Link>
            <Link href="/letters" className="stamp-button" style={{ padding: "11px 20px" }}>
              Write a Letter
            </Link>
          </div>
        </motion.section>
      )}

      {/* Section 1: MY JOURNAL */}
      {(activeSection === "all" || activeSection === "journals") && (
        <MyJournalCollection
          notebooks={notebooks}
          limiteCadernos={limiteCadernos}
          onRefresh={carregarDadosEstante}
        />
      )}

      {/* Section 2: MY LETTERS */}
      {(activeSection === "all" || activeSection === "letters") && (
        <MyLettersCollection
          lettersWritten={lettersWritten}
          letterFolders={letterFolders}
          trashLetters={trashLetters}
          limiteCartas={limiteCartas}
          limitePastas={limitePastas}
          onRefresh={carregarDadosEstante}
        />
      )}
    </div>
  );
}
