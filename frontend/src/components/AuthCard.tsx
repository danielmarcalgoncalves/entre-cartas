"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/services/api";

interface AuthCardProps {
  onSuccess?: () => void;
  onClose?: () => void;
  initialMode?: "choice" | "login" | "register";
}

export default function AuthCard({
  onSuccess,
  onClose,
  initialMode = "choice",
}: AuthCardProps) {
  const { user, login, register, logout } = useAuth();
  const [mode, setMode] = useState<"choice" | "login" | "register" | "otp">(initialMode);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [codigoOtp, setCodigoOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === "login") {
        await login(email, senha);
        setSuccess("Signed in successfully!");
        if (onSuccess) onSuccess();
      } else if (mode === "register") {
        const res = await register(nome, email, senha);
        if (res.requireVerification) {
          setMode("otp");
          setSuccess("A confirmation code was sent to your email!");
        } else {
          setSuccess("Account created successfully! Signing in...");
          await login(email, senha);
          if (onSuccess) onSuccess();
        }
      } else if (mode === "otp") {
        await api.auth.verifyEmail(email, codigoOtp);
        setSuccess("Email confirmed successfully! Signing in...");
        await login(email, senha);
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      if (err.requireVerification) {
        setMode("otp");
        setError("Please enter the 6-digit verification code sent to your email.");
      } else {
        setError(err.message || "An error occurred. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  // If already logged in, show status
  if (user) {
    return (
      <div
        className="letter-paper"
        style={{
          position: "relative",
          maxWidth: "460px",
          width: "100%",
          padding: "36px 32px",
          backgroundColor: "var(--bg-surface-elevated)",
          boxShadow: "var(--shadow-elevated)",
          border: "1px solid var(--border-card)",
          borderRadius: "6px",
        }}
      >
        <span className="tape" aria-hidden="true" style={{ top: "-10px", left: "50%" }} />

        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <span className="stamp-mark" style={{ minWidth: "auto", padding: "4px 10px", marginBottom: "10px" }}>
            AUTHENTICATED READER
          </span>
          <h2 className="section-title" style={{ marginTop: "10px", fontSize: "26px", color: "var(--text-primary)" }}>
            Welcome, {user.nome}
          </h2>
          <p className="page-intro" style={{ margin: "8px auto 0", fontSize: "13px", color: "var(--text-secondary)" }}>
            You are signed in with <strong>{user.email}</strong>.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "24px" }}>
          <Link
            href="/journal"
            className="primary-cta"
            style={{
              textAlign: "center",
              minHeight: "44px",
              textDecoration: "none",
              background: "var(--color-red-sands, #ad5b30)",
              color: "#fcfbf7",
              border: "1px solid rgba(207, 169, 111, 0.4)",
            }}
          >
            Go to My Journal ↗
          </Link>

          <button
            type="button"
            onClick={logout}
            className="stamp-button"
            style={{ width: "100%", minHeight: "40px" }}
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="letter-paper"
      style={{
        position: "relative",
        maxWidth: "460px",
        width: "100%",
        padding: "36px 32px",
        backgroundColor: "var(--bg-surface-elevated)",
        boxShadow: "var(--shadow-elevated)",
        border: "1px solid var(--border-card)",
        borderRadius: "6px",
      }}
    >
      <span className="tape" aria-hidden="true" style={{ top: "-10px", left: "50%" }} />

      {/* Top Header Row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
        <div>
          <span className="eyebrow">
            {mode === "choice"
              ? "Sanctuary Access · Between Letters"
              : mode === "login"
              ? "Reader Identification"
              : mode === "register"
              ? "New Sender Account"
              : "Seal Confirmation"}
          </span>
          <h2 className="section-title" style={{ marginTop: "6px", fontSize: "26px", color: "var(--text-primary)" }}>
            {mode === "choice"
              ? "Access Your Archive"
              : mode === "login"
              ? "Sign In to Archive"
              : mode === "register"
              ? "Create My Account"
              : "Verify Email"}
          </h2>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--color-pollen)",
              fontSize: "22px",
              cursor: "pointer",
              fontFamily: "var(--serif)",
              lineHeight: 1,
            }}
            title="Close"
            aria-label="Close"
          >
            ✕
          </button>
        )}
      </div>

      {error && (
        <div
          style={{
            padding: "10px 14px",
            marginBottom: "16px",
            backgroundColor: "rgba(212, 106, 106, 0.16)",
            border: "1px solid var(--color-error)",
            color: "var(--color-error)",
            fontSize: "12px",
            lineHeight: 1.4,
            borderRadius: "3px",
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            padding: "10px 14px",
            marginBottom: "16px",
            backgroundColor: "rgba(107, 143, 90, 0.16)",
            border: "1px solid var(--color-success)",
            color: "var(--color-success)",
            fontSize: "12px",
            borderRadius: "3px",
          }}
        >
          {success}
        </div>
      )}

      {/* 1. INITIAL SCREEN: THE TWO OPTIONS (CHOICE MODE) */}
      {mode === "choice" && (
        <div>
          <p className="page-intro" style={{ margin: "0 0 20px", fontSize: "13px", lineHeight: 1.5, color: "var(--text-secondary)" }}>
            Rest your thoughts in hardbound journals and seal thoughtful letters sheltered from time. Select an option below to continue:
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Option 1: Already have an account */}
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode("login");
              }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: "16px 18px",
                backgroundColor: "var(--bg-surface)",
                border: "1.5px solid var(--border-focus)",
                borderRadius: "4px",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--serif)", fontSize: "16px", fontWeight: 700, color: "var(--color-red-sands)" }}>
                  I already have an account
                </span>
                <span style={{ fontSize: "15px", color: "var(--color-red-sands)", fontWeight: 700 }}>→</span>
              </div>
              <span style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px", lineHeight: 1.4 }}>
                Sign in with your email and password to access your journals and correspondence.
              </span>
            </button>

            {/* Option 2: Create an account */}
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode("register");
              }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: "16px 18px",
                backgroundColor: "var(--bg-surface-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "4px",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--serif)", fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>
                  Create an account
                </span>
                <span style={{ fontSize: "15px", color: "var(--color-pollen)", fontWeight: 700 }}>→</span>
              </div>
              <span style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px", lineHeight: 1.4 }}>
                New reader? Open your personal memory box and start writing in quiet privacy.
              </span>
            </button>
          </div>
        </div>
      )}

      {/* 2. SIGN IN OR REGISTER FORM */}
      {mode !== "choice" && (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Back button to return to the options */}
          <button
            type="button"
            onClick={() => {
              setError(null);
              setMode("choice");
            }}
            style={{
              alignSelf: "flex-start",
              background: "transparent",
              border: "none",
              color: "#cfa96f",
              fontSize: "12px",
              cursor: "pointer",
              padding: "0 0 6px",
              textDecoration: "underline",
            }}
          >
            ← Back to options
          </button>

          {mode === "register" && (
            <div>
              <label className="object-kind" style={{ display: "block", marginBottom: "4px", color: "var(--color-pollen)" }}>
                Your name or pen name
              </label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="E.g., Clara or Quiet Reader"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-input)",
                  color: "var(--text-primary)",
                  fontFamily: "var(--sans)",
                  fontSize: "13px",
                  borderRadius: "3px",
                  outline: "none",
                }}
              />
            </div>
          )}

          {mode !== "otp" && (
            <>
              <div>
                <label className="object-kind" style={{ display: "block", marginBottom: "4px", color: "var(--color-pollen)" }}>
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid var(--border-subtle)",
                    backgroundColor: "var(--bg-input)",
                    color: "var(--text-primary)",
                    fontFamily: "var(--sans)",
                    fontSize: "13px",
                    borderRadius: "3px",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label className="object-kind" style={{ display: "block", marginBottom: "4px", color: "var(--color-pollen)" }}>
                  Secret password
                </label>
                <input
                  type="password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid var(--border-subtle)",
                    backgroundColor: "var(--bg-input)",
                    color: "var(--text-primary)",
                    fontFamily: "var(--sans)",
                    fontSize: "13px",
                    borderRadius: "3px",
                    outline: "none",
                  }}
                />
              </div>
            </>
          )}

          {mode === "otp" && (
            <div>
              <label className="object-kind" style={{ display: "block", marginBottom: "4px", color: "var(--color-pollen)" }}>
                6-digit code received by email
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={codigoOtp}
                onChange={(e) => setCodigoOtp(e.target.value)}
                placeholder="123456"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  letterSpacing: "0.4em",
                  textAlign: "center",
                  fontSize: "18px",
                  fontWeight: 700,
                  border: "1px solid var(--border-card)",
                  backgroundColor: "var(--bg-input)",
                  color: "var(--color-red-sands)",
                  borderRadius: "3px",
                  outline: "none",
                }}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="primary-cta"
            style={{ width: "100%", marginTop: "10px", minHeight: "44px" }}
          >
            {loading ? "Processing..." : mode === "login" ? "Sign In" : mode === "register" ? "Create Account" : "Confirm and Enter"}
          </button>

          {/* Quick Switcher Between Login & Register */}
          <div style={{ marginTop: "14px", textAlign: "center", borderTop: "1px solid rgba(207, 169, 111, 0.2)", paddingTop: "12px" }}>
            {mode === "login" ? (
              <p className="page-intro" style={{ margin: 0, fontSize: "12px", color: "#a89d8d" }}>
                Don&apos;t have a memory box yet?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setError(null);
                  }}
                  className="text-link"
                  style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "13px", color: "#cfa96f" }}
                >
                  Create an account
                </button>
              </p>
            ) : (
              <p className="page-intro" style={{ margin: 0, fontSize: "12px", color: "#a89d8d" }}>
                Already registered?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError(null);
                  }}
                  className="text-link"
                  style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "13px", color: "#cfa96f" }}
                >
                  Sign in with my account
                </button>
              </p>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
