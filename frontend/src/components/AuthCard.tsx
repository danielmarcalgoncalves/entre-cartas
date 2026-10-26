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
          backgroundColor: "#fcf8ee",
          boxShadow: "0 18px 40px rgba(45, 34, 21, 0.28)",
          border: "1px solid rgba(139, 115, 85, 0.25)",
        }}
      >
        <span className="tape" aria-hidden="true" style={{ top: "-10px", left: "50%" }} />

        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <span className="stamp-mark" style={{ minWidth: "auto", padding: "4px 10px", marginBottom: "10px" }}>
            AUTHENTICATED READER
          </span>
          <h2 className="section-title" style={{ marginTop: "10px", fontSize: "26px" }}>
            Welcome, {user.nome}
          </h2>
          <p className="page-intro" style={{ margin: "8px auto 0", fontSize: "13px" }}>
            You are signed in with <strong>{user.email}</strong>.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "24px" }}>
          <Link
            href="/"
            className="primary-cta"
            style={{ textAlign: "center", minHeight: "44px", textDecoration: "none" }}
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
        backgroundColor: "#fcf8ee",
        boxShadow: "0 18px 40px rgba(45, 34, 21, 0.28)",
        border: "1px solid rgba(139, 115, 85, 0.25)",
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
          <h2 className="section-title" style={{ marginTop: "6px", fontSize: "26px" }}>
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
              color: "#8b1e1e",
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
            backgroundColor: "#fae7e6",
            border: "1px dashed #8b1e1e",
            color: "#8b1e1e",
            fontSize: "12px",
            lineHeight: 1.4,
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
            backgroundColor: "#edf3e6",
            border: "1px dashed #5e6c51",
            color: "#3d4b31",
            fontSize: "12px",
          }}
        >
          {success}
        </div>
      )}

      {/* 1. INITIAL SCREEN: THE TWO OPTIONS (CHOICE MODE) */}
      {mode === "choice" && (
        <div>
          <p className="page-intro" style={{ margin: "0 0 20px", fontSize: "13px", lineHeight: 1.5 }}>
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
                backgroundColor: "#f7f0e0",
                border: "1.5px solid #8b1e1e",
                borderRadius: "3px",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--serif)", fontSize: "16px", fontWeight: 700, color: "#8b1e1e" }}>
                  I already have an account
                </span>
                <span style={{ fontSize: "15px", color: "#8b1e1e", fontWeight: 700 }}>→</span>
              </div>
              <span style={{ fontSize: "12px", color: "#6e604f", marginTop: "4px", lineHeight: 1.4 }}>
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
                backgroundColor: "#fffdf9",
                border: "1px solid rgba(73, 58, 39, 0.35)",
                borderRadius: "3px",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--serif)", fontSize: "16px", fontWeight: 700, color: "#3a2d20" }}>
                  Create an account
                </span>
                <span style={{ fontSize: "15px", color: "#3a2d20", fontWeight: 700 }}>→</span>
              </div>
              <span style={{ fontSize: "12px", color: "#6e604f", marginTop: "4px", lineHeight: 1.4 }}>
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
              color: "#726451",
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
              <label className="object-kind" style={{ display: "block", marginBottom: "4px" }}>
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
                  padding: "9px 12px",
                  border: "1px solid rgba(73, 58, 39, 0.3)",
                  backgroundColor: "rgba(255,255,255,0.6)",
                  fontFamily: "var(--sans)",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>
          )}

          {mode !== "otp" && (
            <>
              <div>
                <label className="object-kind" style={{ display: "block", marginBottom: "4px" }}>
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
                    padding: "9px 12px",
                    border: "1px solid rgba(73, 58, 39, 0.3)",
                    backgroundColor: "rgba(255,255,255,0.6)",
                    fontFamily: "var(--sans)",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label className="object-kind" style={{ display: "block", marginBottom: "4px" }}>
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
                    padding: "9px 12px",
                    border: "1px solid rgba(73, 58, 39, 0.3)",
                    backgroundColor: "rgba(255,255,255,0.6)",
                    fontFamily: "var(--sans)",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
              </div>
            </>
          )}

          {mode === "otp" && (
            <div>
              <label className="object-kind" style={{ display: "block", marginBottom: "4px" }}>
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
                  border: "1px solid rgba(73, 58, 39, 0.3)",
                  backgroundColor: "rgba(255,255,255,0.7)",
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
          <div style={{ marginTop: "14px", textAlign: "center", borderTop: "1px solid rgba(73, 58, 39, 0.15)", paddingTop: "12px" }}>
            {mode === "login" ? (
              <p className="page-intro" style={{ margin: 0, fontSize: "12px" }}>
                Don&apos;t have a memory box yet?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setError(null);
                  }}
                  className="text-link"
                  style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "13px" }}
                >
                  Create an account
                </button>
              </p>
            ) : (
              <p className="page-intro" style={{ margin: 0, fontSize: "12px" }}>
                Already registered?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError(null);
                  }}
                  className="text-link"
                  style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "13px" }}
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
