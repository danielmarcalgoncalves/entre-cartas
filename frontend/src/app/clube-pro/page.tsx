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
        alert("Unable to generate payment session. Please check Stripe keys in .env");
      }
    } catch (err: any) {
      alert(err.message || "Error connecting to Stripe.");
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
      alert(err.message || "Error opening subscriber portal.");
    }
  };

  return (
    <div className="page-shell">
      <header className="page-heading">
        <span className="eyebrow">Literary subscription · support the analog refuge</span>
        <h1 className="display-title">Pro Sender Club</h1>
        <p className="page-intro">
          For those who love collecting letters without rush, extending memory folders to infinity, and preserving rare words
          in high resolution.
        </p>
      </header>

      {checkoutSuccess && (
        <div
          className="paper-panel"
          style={{
            marginBottom: "28px",
            backgroundColor: "rgba(81, 76, 52, 0.4)",
            border: "1px solid var(--color-pollen, #cfa96f)",
            textAlign: "center",
          }}
        >
          <span className="stamp-mark olive" style={{ color: "#cfa96f", borderColor: "#cfa96f" }}>SUBSCRIPTION CONFIRMED</span>
          <h2 className="section-title" style={{ marginTop: "12px", fontSize: "28px", color: "var(--color-birch-paper, #ece1c9)" }}>
            Welcome to the Sender Club!
          </h2>
          <p className="page-intro" style={{ margin: "8px auto 0", color: "#ece1c9" }}>
            Your Pro sender seal has been activated. Your folders and archived letters are now unlimited.
          </p>
        </div>
      )}

      {checkoutCancel && (
        <div
          className="paper-panel"
          style={{
            marginBottom: "28px",
            backgroundColor: "rgba(121, 59, 43, 0.35)",
            border: "1px dashed rgba(173, 91, 48, 0.6)",
            textAlign: "center",
          }}
        >
          <span className="stamp-mark" style={{ color: "#f2bbb0", borderColor: "#ad5b30" }}>PAYMENT NOT COMPLETED</span>
          <p className="page-intro" style={{ margin: "8px auto 0", color: "#f2bbb0" }}>
            The checkout process was cancelled. No charges were made to your card.
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
          <span className="eyebrow">You are an honored member</span>
          <h2 className="display-title" style={{ fontSize: "36px", margin: "10px 0" }}>
            Your memory box knows no bounds
          </h2>
          <p className="page-intro" style={{ margin: "0 auto 24px" }}>
            Thank you for supporting the preservation of this epistolary archive free of advertisements and algorithmic noise.
          </p>
          <button type="button" onClick={handleGerenciarAssinatura} className="primary-cta">
            Manage my subscription on Stripe ↗
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "28px", marginBottom: "48px" }}>
          {/* Card Standard Plan (Free) */}
          <div className="letter-object" style={{ padding: "32px 28px" }}>
            <span className="object-kind">Standard Plan · Free</span>
            <h3 className="object-title" style={{ fontSize: "32px", marginTop: "8px" }}>
              $0.00 <span style={{ fontSize: "14px", color: "#776e5f" }}>/ month</span>
            </h3>
            <p className="page-intro" style={{ margin: "12px 0 24px", minHeight: "44px" }}>
              Your daily writing sanctuary, with personal journal and essential reflective letters.
            </p>

            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>✓ <strong>Up to 3 writing journals</strong></li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>✓ <strong>Up to 10 written and sealed letters</strong></li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>✓ Unlimited inspiration prompts from archive</li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>✓ Continuous pagination & local auto-save</li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px", opacity: 0.5 }}>✕ Up to 10 journals (Premium Exclusive)</li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px", opacity: 0.5 }}>✕ Up to 30 letters (Premium Exclusive)</li>
            </ul>

            <button type="button" disabled className="stamp-button" style={{ width: "100%", opacity: 0.8 }}>
              Your current plan
            </button>
          </div>

          {/* Card Pro Sender Club */}
          <div
            className="letter-object"
            style={{
              padding: "32px 28px",
              backgroundColor: "var(--bg-surface-elevated)",
              border: "2px solid var(--color-pollen, #cfa96f)",
              boxShadow: "var(--shadow-elevated)",
              transform: "rotate(0.5deg)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="object-kind" style={{ color: "var(--color-pollen, #cfa96f)", fontWeight: 700 }}>
                ★ Premium Sender Club
              </span>
              <span className="stamp-mark" style={{ minWidth: "auto", padding: "2px 8px" }}>
                RECOMMENDED
              </span>
            </div>

            <h3 className="object-title" style={{ fontSize: "36px", marginTop: "8px", color: "var(--color-pollen, #cfa96f)" }}>
              $14.90 <span style={{ fontSize: "14px", color: "var(--color-birch-paper, #ece1c9)", opacity: 0.7 }}>/ month</span>
            </h3>
            <p className="page-intro" style={{ margin: "12px 0 24px", minHeight: "44px" }}>
              For authors and creative minds needing multiple volumes and complete writing freedom.
            </p>

            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>✦ <strong>Up to 10 themed writing journals</strong></li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>✦ <strong>Up to 30 written and archived letters</strong></li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>✦ All fine papers and archival inks</li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>✦ Exclusive FAVORITED ♥ stamp</li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>✦ Exclusive Premium Author profile badge</li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>✦ Direct support for keeping the sanctuary ad-free</li>
            </ul>

            <button
              type="button"
              disabled={loadingCheckout}
              onClick={handleAssinar}
              className="primary-cta"
              style={{
                width: "100%",
                minHeight: "48px",
                background: "var(--color-red-sands, #ad5b30)",
                color: "#fcfbf7",
                border: "1px solid rgba(207, 169, 111, 0.4)",
              }}
            >
              {loadingCheckout ? "Opening Stripe..." : "Join Pro Club for $14.90 ↗"}
            </button>
          </div>
        </div>
      )}

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}
