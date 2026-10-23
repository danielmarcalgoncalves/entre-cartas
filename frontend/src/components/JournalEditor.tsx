"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { letters, type Letter } from "@/lib/letters";
import { Tape, Stamp, Sticker, TornPaper } from "@/components/paper-kit";
import { api } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";

const DRAFT_KEY = "entre-cartas:journal:draft";
const SAVED_ENTRIES_KEY = "entre-cartas:journal:entries";
export const JOURNAL_UPDATED_EVENT = "entre-cartas:journal-updated";

const MOODS = [
  { id: "calmo", label: "☕ Em paz", icon: "☕" },
  { id: "saudade", label: "🌧 Saudade", icon: "🌧" },
  { id: "grato", label: "🌿 Grato", icon: "🌿" },
  { id: "melancolico", label: "🕯 Melancólico", icon: "🕯" },
  { id: "esperanca", label: "✦ Esperançoso", icon: "✦" },
  { id: "desabafo", label: "✎ Desabafo", icon: "✎" },
];

const PROMPTS = [
  "Escreva sobre um detalhe do seu dia que ninguém além de você percebeu.",
  "Qual foi a última vez que você esperou por algo com o coração na boca?",
  "Se pudesse deixar um bilhete na janela para o seu 'eu' de cinco anos atrás, o que estaria escrito?",
  "Descreva o cheiro ou o som de um lugar que já foi casa para você.",
  "Existe alguma palavra que você engoliu recentemente e que merecia ter sido dita?",
  "O que você gostaria de esquecer devagar, sem pressa nem mágoa?",
];

export type JournalEntry = {
  id: string;
  titulo: string;
  conteudo: string;
  humor: string;
  data_formatada: string;
  criado_em: string;
  polaroid_url?: string;
  polaroid_legenda?: string;
  inspiracao_titulo?: string;
  tipo_papel?: string;
};

export default function JournalEditor() {
  const { user } = useAuth();
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [humor, setHumor] = useState("calmo");
  const [tipoPapel, setTipoPapel] = useState<"envelhecido" | "pautado" | "linho">("envelhecido");
  const [polaroidUrl, setPolaroidUrl] = useState<string>("/images/manuscrito-pixabay.jpg");
  const [polaroidLegenda, setPolaroidLegenda] = useState("uma tarde quieta");
  const [mostrarPolaroid, setMostrarPolaroid] = useState(true);

  // Inspiração ativa
  const [inspiracaoModal, setInspiracaoModal] = useState(false);
  const [cartaInspiracao, setCartaInspiracao] = useState<Letter | null>(null);
  const [promptTexto, setPromptTexto] = useState("");

  const [salvando, setSalvando] = useState(false);
  const [selada, setSelada] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState("");

  // Data atual formatada por extenso
  const [dataFormatada, setDataFormatada] = useState("");

  useEffect(() => {
    const hoje = new Date();
    const opcoes: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    const dataExtenso = hoje.toLocaleDateString("pt-BR", opcoes);
    setDataFormatada(dataExtenso.charAt(0).toUpperCase() + dataExtenso.slice(1));

    // Carrega rascunho anterior do LocalStorage se existir
    try {
      const draft = window.localStorage.getItem(DRAFT_KEY);
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.titulo) setTitulo(parsed.titulo);
        if (parsed.conteudo) setConteudo(parsed.conteudo);
        if (parsed.humor) setHumor(parsed.humor);
        if (parsed.tipoPapel) setTipoPapel(parsed.tipoPapel);
        if (parsed.polaroidLegenda) setPolaroidLegenda(parsed.polaroidLegenda);
      }
    } catch {}
  }, []);

  // Auto-save leve no LocalStorage a cada alteração
  useEffect(() => {
    if (!titulo && !conteudo) return;
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ titulo, conteudo, humor, tipoPapel, polaroidLegenda })
        );
      } catch {}
    }, 600);
    return () => clearTimeout(timer);
  }, [titulo, conteudo, humor, tipoPapel, polaroidLegenda]);

  // Sorteia uma nova carta e prompt de inspiração
  const sortearInspiracao = () => {
    const carta = letters[Math.floor(Math.random() * letters.length)];
    const prompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
    setCartaInspiracao(carta);
    setPromptTexto(prompt);
    setInspiracaoModal(true);
  };

  const aplicarInspiracao = () => {
    if (cartaInspiracao && !titulo) {
      setTitulo(`Reflexão: ${cartaInspiracao.title}`);
    }
    setInspiracaoModal(false);
  };

  // Salvar página no diário pessoal (MariaDB + LocalStorage)
  const salvarPagina = async () => {
    if (!conteudo.trim()) {
      alert("Escreva pelo menos algumas palavras no seu diário antes de selar a página.");
      return;
    }

    setSalvando(true);
    const tituloFinal = titulo.trim() || `Memória de ${dataFormatada.split(",")[0] || "Hoje"}`;

    const novaEntrada: JournalEntry = {
      id: "jornal-" + Date.now(),
      titulo: tituloFinal,
      conteudo: conteudo.trim(),
      humor,
      data_formatada: dataFormatada,
      criado_em: new Date().toISOString(),
      polaroid_url: mostrarPolaroid ? polaroidUrl : undefined,
      polaroid_legenda: mostrarPolaroid ? polaroidLegenda : undefined,
      inspiracao_titulo: cartaInspiracao ? cartaInspiracao.title : undefined,
      tipo_papel: tipoPapel,
    };

    // 1. Salva localmente para visualização instantânea e offline
    try {
      const existentes = JSON.parse(window.localStorage.getItem(SAVED_ENTRIES_KEY) || "[]");
      const atualizados = [novaEntrada, ...existentes];
      window.localStorage.setItem(SAVED_ENTRIES_KEY, JSON.stringify(atualizados));
    } catch {}

    // 2. Se autenticado, envia também para a API e persiste no MariaDB
    try {
      await api.cartas.enviar({
        titulo: tituloFinal,
        conteudo: conteudo.trim(),
        remetente_anonimo: user?.nome ? user.nome : "Meu Diário",
        categoria: humor === "desabafo" ? "desabafo" : "memorias",
        tipo_papel: tipoPapel,
        data_carta: dataFormatada,
      });
    } catch (e) {
      // Se visitante, continua salvo no navegador
    }

    // 3. Limpa rascunho e dispara evento de atualização
    window.localStorage.removeItem(DRAFT_KEY);
    window.dispatchEvent(new Event(JOURNAL_UPDATED_EVENT));

    setSalvando(false);
    setSelada(true);
    setMensagemSucesso("Página selada com cera e guardada no seu arquivo pessoal!");

    // Reseta campos após sucesso
    setTimeout(() => {
      setTitulo("");
      setConteudo("");
      setCartaInspiracao(null);
      setPromptTexto("");
      setSelada(false);
    }, 3200);
  };

  return (
    <section className="journal-workspace" aria-labelledby="journal-main-heading">
      <div className="journal-desk-decor" aria-hidden="true">
        <span className="desk-coffee-stain" />
        <span className="desk-clip" />
      </div>

      <motion.article
        className={`journal-sheet journal-sheet--${tipoPapel}`}
        initial={{ opacity: 0, y: 15, rotate: -0.4 }}
        animate={{ opacity: 1, y: 0, rotate: -0.4 }}
        transition={{ duration: 0.6 }}
      >
        <Tape className="journal-sheet__tape" />

        {/* Linha superior do diário */}
        <div className="journal-sheet__topline">
          <div className="journal-date-badge">
            <span className="journal-date-icon">✎</span>
            <span>{dataFormatada || "Hoje · Sem pressa"}</span>
          </div>

          <div className="journal-paper-toggles">
            <button
              type="button"
              className={`paper-btn ${tipoPapel === "envelhecido" ? "active" : ""}`}
              onClick={() => setTipoPapel("envelhecido")}
              title="Papel Envelhecido"
            >
              Marfim
            </button>
            <button
              type="button"
              className={`paper-btn ${tipoPapel === "pautado" ? "active" : ""}`}
              onClick={() => setTipoPapel("pautado")}
              title="Papel Pautado Antigo"
            >
              Pautado
            </button>
            <button
              type="button"
              className={`paper-btn ${tipoPapel === "linho" ? "active" : ""}`}
              onClick={() => setTipoPapel("linho")}
              title="Textura de Linho"
            >
              Linho
            </button>
          </div>
        </div>

        {/* Prompt de Inspiração Ativo (se houver) */}
        {cartaInspiracao && (
          <motion.div
            className="journal-inspiration-banner"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
          >
            <TornPaper className="inspiration-banner-label">
              <span>✨ Inspirado na carta:</span> <b>“{cartaInspiracao.title}”</b>
            </TornPaper>
            {promptTexto && <p className="inspiration-prompt-note">“{promptTexto}”</p>}
            <button
              type="button"
              className="inspiration-clear-btn"
              onClick={() => {
                setCartaInspiracao(null);
                setPromptTexto("");
              }}
              title="Remover inspiração"
            >
              ×
            </button>
          </motion.div>
        )}

        {/* Corpo de escrita e Polaroid */}
        <div className="journal-sheet__body">
          <div className="journal-sheet__content">
            <input
              type="text"
              className="journal-title-input"
              placeholder="Dê um título para o seu dia..."
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={120}
              id="journal-main-heading"
            />

            <textarea
              className="journal-textarea"
              placeholder="Como foi o seu dia? Deixe aqui as palavras que você não disse a ninguém..."
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              rows={9}
            />

            {/* Barra de sentimentos do dia */}
            <div className="journal-mood-strip">
              <span className="mood-label">Como você se sente hoje?</span>
              <div className="mood-options">
                {MOODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`mood-tag ${humor === m.id ? "is-selected" : ""}`}
                    onClick={() => setHumor(m.id)}
                  >
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Área da Polaroid na lateral da folha (estilo Scrapbook) */}
          {mostrarPolaroid && (
            <aside className="journal-sheet__sidebar">
              <figure className="journal-polaroid">
                <div className="journal-polaroid__tape" />
                <div className="journal-polaroid__image">
                  <img src={polaroidUrl} alt="Lembrança do dia" />
                </div>
                <input
                  type="text"
                  className="journal-polaroid__caption-input"
                  value={polaroidLegenda}
                  onChange={(e) => setPolaroidLegenda(e.target.value)}
                  placeholder="Legenda da foto..."
                  maxLength={40}
                />
              </figure>
            </aside>
          )}
        </div>

        {/* Rodapé da folha com Ações e Selo */}
        <div className="journal-sheet__footer">
          <div className="journal-footer-tools">
            <button
              type="button"
              className="btn-inspiration-trigger"
              onClick={sortearInspiracao}
            >
              <span>✨ Puxar Inspiração</span>
              <small>bloqueio criativo?</small>
            </button>

            <button
              type="button"
              className="btn-toggle-polaroid"
              onClick={() => setMostrarPolaroid(!mostrarPolaroid)}
            >
              {mostrarPolaroid ? "📷 Ocultar Foto" : "📷 Anexar Foto"}
            </button>
          </div>

          <div className="journal-footer-action">
            <button
              type="button"
              className="primary-cta journal-seal-btn"
              onClick={salvarPagina}
              disabled={salvando || selada}
            >
              <span>{salvando ? "Selando página..." : selada ? "✓ Selada com Cera" : "Guardar no Meu Jornal"}</span>
              <span className="cta-arrow" aria-hidden="true">✦</span>
            </button>
          </div>
        </div>

        {/* Carimbo de página selada */}
        <AnimatePresence>
          {selada && (
            <motion.div
              className="journal-sealed-stamp"
              initial={{ scale: 2.2, rotate: -15, opacity: 0 }}
              animate={{ scale: 1, rotate: -8, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <Stamp className="seal-wax-stamp">
                GUARDADA<br />
                <small>NO SEU ARQUIVO</small>
              </Stamp>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.article>

      {/* Mensagem de sucesso feedback */}
      <AnimatePresence>
        {mensagemSucesso && (
          <motion.div
            className="journal-feedback-toast"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Sticker>📖 {mensagemSucesso}</Sticker>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal / Gaveta de Inspiração de Escrita */}
      <AnimatePresence>
        {inspiracaoModal && cartaInspiracao && (
          <div className="inspiration-modal-backdrop" onClick={() => setInspiracaoModal(false)}>
            <motion.div
              className="inspiration-modal-sheet"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
            >
              <Tape className="modal-tape" />
              <div className="modal-top">
                <span className="modal-kicker">GAVETA DE INSPIRAÇÕES · UMA CARTA PARA DESTRAMAR</span>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setInspiracaoModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="inspiration-prompt-box">
                <small className="prompt-label">PROMPT DE ESCRITA DE HOJE</small>
                <p className="prompt-text">“{promptTexto}”</p>
              </div>

              <div className="inspiration-letter-excerpt">
                <span className="excerpt-label">Trecho de “{cartaInspiracao.title}”:</span>
                <blockquote>“{cartaInspiracao.excerpt}”</blockquote>
                <span className="excerpt-author">— {cartaInspiracao.sender}</span>
              </div>

              <div className="inspiration-modal-actions">
                <button
                  type="button"
                  className="btn-shuffle-inspire"
                  onClick={sortearInspiracao}
                >
                  ↻ Puxar outra carta
                </button>

                <button
                  type="button"
                  className="primary-cta"
                  onClick={aplicarInspiracao}
                >
                  <span>Escrever sobre este tema</span>
                  <span className="cta-arrow" aria-hidden="true">✍</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
