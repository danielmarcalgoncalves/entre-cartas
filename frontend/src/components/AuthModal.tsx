"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/services/api";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "register";
}

export default function AuthModal({ isOpen, onClose, initialMode = "login" }: AuthModalProps) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register" | "otp">(initialMode);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [codigoOtp, setCodigoOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === "login") {
        await login(email, senha);
        onClose();
      } else if (mode === "register") {
        const res = await register(nome, email, senha);
        if (res.requireVerification) {
          setMode("otp");
          setSuccess("Código de confirmação enviado para o seu e-mail!");
        } else {
          setSuccess("Conta criada com sucesso! Faça login.");
          setMode("login");
        }
      } else if (mode === "otp") {
        await api.auth.verifyEmail(email, codigoOtp);
        setSuccess("E-mail confirmado com sucesso! Entrando...");
        await login(email, senha);
        onClose();
      }
    } catch (err: any) {
      if (err.requireVerification) {
        setMode("otp");
        setError("Por favor, valide o código de 6 dígitos enviado ao seu e-mail.");
      } else {
        setError(err.message || "Ocorreu um erro. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "grid",
        placeItems: "center",
        backgroundColor: "rgba(43, 35, 25, 0.65)",
        backdropFilter: "blur(4px)",
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="letter-paper"
        style={{
          position: "relative",
          maxWidth: "440px",
          width: "100%",
          padding: "36px 32px",
          backgroundColor: "#fcf8ee",
          boxShadow: "0 18px 40px rgba(45, 34, 21, 0.35)",
          transform: "rotate(-0.8deg)",
        }}
      >
        <span className="tape" aria-hidden="true" style={{ top: "-10px", left: "50%" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "18px" }}>
          <div>
            <span className="eyebrow">
              {mode === "login" ? "Identificação de leitor" : mode === "register" ? "Novo remetente" : "Confirmação de selo"}
            </span>
            <h2 className="section-title" style={{ marginTop: "6px", fontSize: "28px" }}>
              {mode === "login" ? "Entrar na caixa" : mode === "register" ? "Criar meu acervo" : "Validar e-mail"}
            </h2>
          </div>
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
            }}
          >
            ✕
          </button>
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

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {mode === "register" && (
            <div>
              <label className="object-kind" style={{ display: "block", marginBottom: "4px" }}>
                Seu nome ou pseudônimo
              </label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Clara ou Leitor Misterioso"
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
                  E-mail
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
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
                  Senha secreta
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
                Código de 6 dígitos recebido por e-mail
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
            {loading ? "Processando..." : mode === "login" ? "Entrar" : mode === "register" ? "Criar conta" : "Confirmar e entrar"}
          </button>
        </form>

        <div style={{ marginTop: "18px", textAlign: "center", borderTop: "1px solid rgba(73, 58, 39, 0.15)", paddingTop: "14px" }}>
          {mode === "login" ? (
            <p className="page-intro" style={{ margin: 0, fontSize: "12px" }}>
              Ainda não tem uma caixa de memórias?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError(null);
                }}
                className="text-link"
                style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "13px" }}
              >
                Cadastre-se aqui
              </button>
            </p>
          ) : (
            <p className="page-intro" style={{ margin: 0, fontSize: "12px" }}>
              Já possui cadastro?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                className="text-link"
                style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "13px" }}
              >
                Entrar com minha conta
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
