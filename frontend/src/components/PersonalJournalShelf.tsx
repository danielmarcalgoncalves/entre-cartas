"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Tape, Stamp, Sticker, TornPaper } from "@/components/paper-kit";
import { JOURNAL_UPDATED_EVENT, type JournalEntry } from "@/components/JournalEditor";
import { api } from "@/services/api";

const SAVED_ENTRIES_KEY = "entre-cartas:journal:entries";

export default function PersonalJournalShelf() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [activeEntry, setActiveEntry] = useState<JournalEntry | null>(null);

  const carregarPaginas = () => {
    // 1. Carrega localmente
    try {
      const raw = window.localStorage.getItem(SAVED_ENTRIES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setEntries(parsed);
        }
      }
    } catch {}

    // 2. Tenta carregar do backend MariaDB
    api.cartas.minhas()
      .then((res: any) => {
        if (res && res.cartas && Array.isArray(res.cartas) && res.cartas.length > 0) {
          const remotas: JournalEntry[] = res.cartas.map((c: any) => ({
            id: String(c.id),
            titulo: c.titulo,
            conteudo: c.conteudo,
            humor: c.categoria === "desabafo" ? "desabafo" : "calmo",
            data_formatada: c.data_carta || new Date(c.criado_em).toLocaleDateString("pt-BR"),
            criado_em: c.criado_em,
            tipo_papel: c.tipo_papel || "envelhecido",
          }));

          // Mescla remotas com locais sem duplicar id
          setEntries((atuais) => {
            const idsAtuais = new Set(atuais.map((e) => e.id));
            const novas = remotas.filter((r) => !idsAtuais.has(r.id));
            return [...atuais, ...novas];
          });
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    carregarPaginas();
    window.addEventListener(JOURNAL_UPDATED_EVENT, carregarPaginas);
    window.addEventListener("storage", carregarPaginas);

    return () => {
      window.removeEventListener(JOURNAL_UPDATED_EVENT, carregarPaginas);
      window.removeEventListener("storage", carregarPaginas);
    };
  }, []);

  const excluirPagina = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Deseja retirar esta página do seu diário pessoal?")) return;
    const atualizadas = entries.filter((item) => item.id !== id);
    setEntries(atualizadas);
    try {
      window.localStorage.setItem(SAVED_ENTRIES_KEY, JSON.stringify(atualizadas));
    } catch {}
    if (activeEntry?.id === id) setActiveEntry(null);
  };

  return (
    <section className="personal-journal-shelf-wrap" aria-labelledby="shelf-title">
      <div className="shelf-header">
        <div>
          <span className="section-kicker">ARQUIVO PESSOAL · MEU FICHÁRIO</span>
          <h2 id="shelf-title">Páginas do Meu Diário</h2>
        </div>
        <div className="shelf-counter">
          <Stamp muted>{entries.length} {entries.length === 1 ? "PÁGINA" : "PÁGINAS"} GUARDADAS</Stamp>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="empty-journal-box">
          <span className="empty-pen-icon" aria-hidden="true">✎</span>
          <h3>Seu diário ainda está esperando as primeiras palavras.</h3>
          <p>
            Use a folha acima para registrar um pensamento, desabafo ou memória do seu dia.
            Cada página ficará segura neste arquivo.
          </p>
        </div>
      ) : (
        <div className="journal-entries-grid">
          {entries.map((entry, index) => (
            <motion.article
              key={entry.id}
              className={`journal-entry-card journal-entry-card--${entry.tipo_papel || "envelhecido"}`}
              whileHover={{ y: -4, rotate: index % 2 === 0 ? -0.8 : 0.8 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              onClick={() => setActiveEntry(entry)}
            >
              <Tape className="entry-card-tape" />

              <div className="entry-card-top">
                <span className="entry-card-date">{entry.data_formatada}</span>
                <span className="entry-card-mood">{entry.humor ? `● ${entry.humor}` : "● diário"}</span>
              </div>

              {entry.inspiracao_titulo && (
                <div className="entry-card-inspiration">
                  <small>✨ {entry.inspiracao_titulo}</small>
                </div>
              )}

              <h3 className="entry-card-title">{entry.titulo}</h3>

              <p className="entry-card-excerpt">
                “{entry.conteudo.length > 140 ? entry.conteudo.substring(0, 140) + "..." : entry.conteudo}”
              </p>

              {entry.polaroid_url && (
                <div className="entry-card-polaroid-preview">
                  <img src={entry.polaroid_url} alt="" />
                  {entry.polaroid_legenda && <small>{entry.polaroid_legenda}</small>}
                </div>
              )}

              <div className="entry-card-bottom">
                <button
                  type="button"
                  className="entry-read-btn"
                  onClick={() => setActiveEntry(entry)}
                >
                  Abrir página ↗
                </button>
                <button
                  type="button"
                  className="entry-delete-btn"
                  onClick={(e) => excluirPagina(entry.id, e)}
                  title="Excluir página"
                >
                  remover
                </button>
              </div>
            </motion.article>
          ))}
        </div>
      )}

      {/* Modal para leitura da página completa */}
      <AnimatePresence>
        {activeEntry && (
          <div className="entry-modal-backdrop" onClick={() => setActiveEntry(null)}>
            <motion.article
              className={`entry-modal-sheet entry-modal-sheet--${activeEntry.tipo_papel || "envelhecido"}`}
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.92, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 15 }}
            >
              <Tape className="entry-modal-tape" />

              <div className="entry-modal-header">
                <div>
                  <span className="entry-modal-kicker">MEU DIÁRIO PESSOAL</span>
                  <h2>{activeEntry.titulo}</h2>
                  <span className="entry-modal-date">{activeEntry.data_formatada}</span>
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setActiveEntry(null)}
                >
                  ✕
                </button>
              </div>

              <div className="entry-modal-body">
                <div className="entry-modal-text">
                  {activeEntry.conteudo.split("\n").map((paragrafo, idx) => (
                    <p key={idx}>{paragrafo}</p>
                  ))}
                </div>

                {activeEntry.polaroid_url && (
                  <aside className="entry-modal-polaroid">
                    <figure className="journal-polaroid">
                      <div className="journal-polaroid__image">
                        <img src={activeEntry.polaroid_url} alt="Lembrança" />
                      </div>
                      {activeEntry.polaroid_legenda && (
                        <figcaption>{activeEntry.polaroid_legenda}</figcaption>
                      )}
                    </figure>
                  </aside>
                )}
              </div>

              <div className="entry-modal-footer">
                <Stamp className="entry-saved-seal">ARQUIVADA NO SEU JORNAL</Stamp>
                <button
                  type="button"
                  className="entry-modal-close"
                  onClick={() => setActiveEntry(null)}
                >
                  Fechar página
                </button>
              </div>
            </motion.article>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
