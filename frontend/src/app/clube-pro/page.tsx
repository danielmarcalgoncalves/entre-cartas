"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/services/api";
import AuthModal from "@/components/AuthModal";

export default function ClubeProPage() {
  const { user, isPro } = useAuth();
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Parâmetros de retorno do Stripe
  const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const checkoutSuccess = urlParams?.get("checkout") === "success";
  const checkoutCancel = urlParams?.get("checkout") === "cancel";

  useEffect(() => {
    if (!user) {
      setLoadingStatus(false);
      return;
    }
    api.stripe
      .getStatus()
      .then((data) => setStatus(data))
      .catch(() => {})
      .finally(() => setLoadingStatus(false));
  }, [user]);

  const handleAssinar = async () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    setLoadingCheckout(true);
    try {
      const data = await api.stripe.createCheckout();
      if (data && data.url) {
        window.location.href = data.url;
      } else {
        alert("Não foi possível gerar a sessão de pagamento. Verifique as chaves do Stripe no .env");
      }
    } catch (err: any) {
      alert(err.message || "Erro ao conectar com o Stripe.");
    } finally {
      setLoadingCheckout(false);
    }
  };

  const handleGerenciarAssinatura = async () => {
    try {
      const data = await api.stripe.createPortalSession();
      if (data && data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      alert(err.message || "Erro ao abrir portal do assinante.");
    }
  };

  return (
    <div className="page-shell">
      <header className="page-heading">
        <span className="eyebrow">Assinatura literária · apoio ao refúgio analógico</span>
        <h1 className="display-title">Clube do Remetente Pro</h1>
        <p className="page-intro">
          Para quem ama colecionar cartas sem pressa, estender pastas de memórias ao infinito e preservar palavras raras
          em alta resolução.
        </p>
      </header>

      {checkoutSuccess && (
        <div
          className="paper-panel"
          style={{
            marginBottom: "28px",
            backgroundColor: "#edf3e6",
            border: "2px solid #5e6c51",
            textAlign: "center",
          }}
        >
          <span className="stamp-mark olive">ASSINATURA CONFIRMADA</span>
          <h2 className="section-title" style={{ marginTop: "12px", fontSize: "28px" }}>
            Bem-vindo ao Clube do Remetente!
          </h2>
          <p className="page-intro" style={{ margin: "8px auto 0" }}>
            Seu selo de remetente Pro foi ativado. Suas pastas e cartas guardadas agora são ilimitadas.
          </p>
        </div>
      )}

      {checkoutCancel && (
        <div
          className="paper-panel"
          style={{
            marginBottom: "28px",
            backgroundColor: "#fae7e6",
            border: "1px dashed #8b1e1e",
            textAlign: "center",
          }}
        >
          <span className="stamp-mark">PAGAMENTO NÃO CONCLUÍDO</span>
          <p className="page-intro" style={{ margin: "8px auto 0" }}>
            O processo de checkout foi cancelado. Nenhuma cobrança foi realizada no seu cartão.
          </p>
        </div>
      )}

      {isPro ? (
        <div
          className="letter-paper"
          style={{
            maxWidth: "680px",
            margin: "0 auto 40px",
            textAlign: "center",
            padding: "40px",
          }}
        >
          <span className="wax-seal" style={{ margin: "0 auto 16px" }}>
            👑
          </span>
          <span className="eyebrow">Você é membro de honra</span>
          <h2 className="display-title" style={{ fontSize: "36px", margin: "10px 0" }}>
            Sua caixa de memórias não tem fim
          </h2>
          <p className="page-intro" style={{ margin: "0 auto 24px" }}>
            Obrigado por apoiar a preservação deste arquivo epistolar livre de anúncios e ruído algorítmico.
          </p>
          <button type="button" onClick={handleGerenciarAssinatura} className="primary-cta">
            Gerenciar minha assinatura no Stripe ↗
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "28px", marginBottom: "48px" }}>
          {/* Card Plano Leitor (Free) */}
          <div className="letter-object" style={{ padding: "32px 28px" }}>
            <span className="object-kind">Plano Leitor · Gratuito</span>
            <h3 className="object-title" style={{ fontSize: "32px", marginTop: "8px" }}>
              R$ 0,00 <span style={{ fontSize: "14px", color: "#776e5f" }}>/ mês</span>
            </h3>
            <p className="page-intro" style={{ margin: "12px 0 24px", minHeight: "44px" }}>
              Ideal para quem gosta de descobrir correspondências esquecidas e guardar seus primeiros afetos.
            </p>

            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>✓ Acesso a todo o acervo público</li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>✓ Até 5 cartas guardadas na caixa</li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>✓ Até 3 pastas de memórias</li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>✓ Carimbo básico (LIDA / GUARDADA)</li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px", opacity: 0.5 }}>✕ Acervo ilimitado</li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px", opacity: 0.5 }}>✕ Download em alta resolução</li>
            </ul>

            <button type="button" disabled className="stamp-button" style={{ width: "100%", opacity: 0.8 }}>
              Seu plano atual
            </button>
          </div>

          {/* Card Clube do Remetente Pro */}
          <div
            className="letter-object"
            style={{
              padding: "32px 28px",
              backgroundColor: "#fcf6ea",
              border: "2px solid #8b1e1e",
              boxShadow: "0 14px 28px rgba(61,47,28,0.22)",
              transform: "rotate(0.5deg)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="object-kind" style={{ color: "#8b1e1e", fontWeight: 700 }}>
                ★ Clube do Remetente Pro
              </span>
              <span className="stamp-mark" style={{ minWidth: "auto", padding: "2px 8px" }}>
                RECOMENDADO
              </span>
            </div>

            <h3 className="object-title" style={{ fontSize: "36px", marginTop: "8px", color: "#8b1e1e" }}>
              R$ 14,90 <span style={{ fontSize: "14px", color: "#776e5f" }}>/ mês</span>
            </h3>
            <p className="page-intro" style={{ margin: "12px 0 24px", minHeight: "44px" }}>
              Menos que o valor de um café na livraria. Desbloqueie todas as gavetas e apoie o acervo independente.
            </p>

            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>✦ <strong>Cartas guardadas ilimitadas</strong></li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>✦ <strong>Pastas de memórias sem limite</strong></li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>✦ Carimbos exclusivos (FAVORITA, ETERNA, RARA)</li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>✦ Envio ilimitado de cartas anônimas</li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>✦ Tipografias nobres e lacres de cera personalizados</li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>✦ Selo exclusivo Pro no perfil do remetente</li>
            </ul>

            <button
              type="button"
              disabled={loadingCheckout}
              onClick={handleAssinar}
              className="primary-cta"
              style={{ width: "100%", minHeight: "48px" }}
            >
              {loadingCheckout ? "Abrindo Stripe..." : "Assinar Clube Pro por R$ 14,90 ↗"}
            </button>
          </div>
        </div>
      )}

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}
