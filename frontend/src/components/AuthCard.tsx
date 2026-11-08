"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/services/api";
import "@/app/login/auth-paper.css";

export type AuthMode = "login" | "register" | "forgot" | "reset" | "otp";

interface AuthCardProps {
  onSuccess?: () => void;
  onClose?: () => void;
  initialMode?: "choice" | "login" | "register" | "forgot" | "reset";
  resetTokenProp?: string | null;
}

function GoogleEmblem() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
      />
    </svg>
  );
}

export default function AuthCard({
  onSuccess,
  onClose,
  initialMode = "login",
  resetTokenProp = null,
}: AuthCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, login, register, applyTokenSession, logout } = useAuth();

  const resolvedInitialMode: AuthMode =
    initialMode === "choice" ? "login" : (initialMode as AuthMode);

  const [mode, setMode] = useState<AuthMode>(resolvedInitialMode);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [codigoOtp, setCodigoOtp] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showTermsNote, setShowTermsNote] = useState(false);

  const [resetToken, setResetToken] = useState<string>(resetTokenProp || "");
  const [validatingToken, setValidatingToken] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [resetComplete, setResetComplete] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Sync URL query params for OAuth callback, password reset token, or initial mode
  useEffect(() => {
    if (!searchParams) return;

    const oauthStatus = searchParams.get("oauth");
    const oauthToken = searchParams.get("token");
    const urlMode = searchParams.get("mode");
    const urlError = searchParams.get("error");

    // 1. Handle Google OAuth callback completion
    if (oauthStatus === "success" && oauthToken) {
      setLoading(true);
      setSuccess("Authenticated with Google. Opening your desk...");
      applyTokenSession(oauthToken, true)
        .then(() => {
          if (onSuccess) onSuccess();
          else router.replace("/my-desk");
        })
        .catch(() => {
          setError("Could not finalize your Google session. Please try signing in again.");
          setLoading(false);
        });
      return;
    }

    // 2. Handle OAuth error query codes
    if (urlError) {
      const errorMessages: Record<string, string> = {
        google_not_configured:
          "Google Sign-In is not configured on this server yet. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the environment settings, or sign in with your email and password.",
        google_cancelled: "Google authentication was cancelled.",
        google_missing_code: "Google did not return an authorization code. Please try again.",
        google_state_mismatch: "Security state verification failed during Google Sign-In. Please try again.",
        google_token_exchange_failed: "Unable to exchange authorization code with Google. Check your OAuth redirect URI.",
        google_profile_incomplete: "Could not retrieve your verified email address from Google.",
        google_email_unverified: "Your Google account email address must be verified before signing in.",
        google_auth_failed: "An unexpected error occurred during Google authentication. Please try again.",
      };
      setError(errorMessages[urlError] || "Authentication could not be completed.");
    }

    // 3. Handle Password Reset link (?mode=reset&token=... or ?token=...)
    if ((urlMode === "reset" || (!oauthStatus && oauthToken)) && oauthToken) {
      setMode("reset");
      setResetToken(oauthToken);
      setValidatingToken(true);
      setError(null);
      api.auth
        .validateResetToken(oauthToken)
        .then((res) => {
          if (res && res.valid) {
            setTokenValid(true);
          } else {
            setTokenValid(false);
            setError("This password recovery link is invalid or has expired.");
          }
        })
        .catch((err: any) => {
          setTokenValid(false);
          setError(err.message || "This password recovery link is invalid, expired, or has already been used.");
        })
        .finally(() => {
          setValidatingToken(false);
        });
      return;
    }

    // 4. Handle explicit mode query param
    if (urlMode === "signup" || urlMode === "register") {
      setMode("register");
    } else if (urlMode === "forgot") {
      setMode("forgot");
    } else if (urlMode === "login") {
      setMode("login");
    }
  }, [searchParams, applyTokenSession, onSuccess, router]);

  const switchMode = (nextMode: AuthMode) => {
    setError(null);
    setSuccess(null);
    setRecoverySent(false);
    setResetComplete(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setMode(nextMode);
  };

  // Validate password strength for registration and password reset
  const validatePasswordStrength = (pw: string): string | null => {
    if (pw.length < 8) {
      return "Please use at least 8 characters for your password.";
    }
    const hasLetter = /[a-zA-Z]/.test(pw);
    const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw);
    if (!hasLetter || !hasNumberOrSymbol) {
      return "Password must include letters and at least one number or symbol.";
    }
    return null;
  };

  const handleGoogleAuth = () => {
    if (loading) return;
    setError(null);
    window.location.href = "/api/auth/google";
  };

  const handleResendOtp = async () => {
    if (!email || loading) return;
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await api.auth.resendOtp(email.trim());
      setSuccess("A fresh 6-digit verification code has been sent to your email.");
    } catch (err: any) {
      setError(err.message || "Could not resend verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setError(null);
    setSuccess(null);

    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Client-side validation per mode
    if (mode === "login") {
      if (!emailRegex.test(trimmedEmail)) {
        setError("Please enter a valid email address.");
        return;
      }
      if (!senha) {
        setError("Please enter your password.");
        return;
      }
    } else if (mode === "register") {
      if (!nome.trim() || nome.trim().length < 2) {
        setError("Please enter your full name (at least 2 characters).");
        return;
      }
      if (!emailRegex.test(trimmedEmail)) {
        setError("Please enter a valid email address.");
        return;
      }
      const pwError = validatePasswordStrength(senha);
      if (pwError) {
        setError(pwError);
        return;
      }
      if (senha !== confirmarSenha) {
        setError("Passwords do not match. Please check your confirmation password.");
        return;
      }
      if (!acceptTerms) {
        setError("Please accept the Terms of Service and Privacy Policy to create your account.");
        return;
      }
    } else if (mode === "forgot") {
      if (!emailRegex.test(trimmedEmail)) {
        setError("Please enter a valid email address.");
        return;
      }
    } else if (mode === "reset") {
      const pwError = validatePasswordStrength(senha);
      if (pwError) {
        setError(pwError);
        return;
      }
      if (senha !== confirmarSenha) {
        setError("Passwords do not match. Please confirm your new password.");
        return;
      }
    } else if (mode === "otp") {
      if (!codigoOtp.trim() || codigoOtp.trim().length < 6) {
        setError("Please enter the 6-digit verification code sent to your email.");
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === "login") {
        await login(trimmedEmail, senha, rememberMe);
        setSuccess("Welcome back. Opening your desk...");
        if (onSuccess) onSuccess();
        else router.push("/my-desk");
      } else if (mode === "register") {
        const res = await register(nome.trim(), trimmedEmail, senha);
        if (res.requireVerification) {
          setMode("otp");
          setSuccess("We sent a 6-digit verification code to your email address.");
        } else {
          setSuccess("Your account is ready. Opening your desk...");
          if (onSuccess) onSuccess();
          else router.push("/my-desk");
        }
      } else if (mode === "forgot") {
        const res = await api.auth.forgotPassword(trimmedEmail);
        setRecoverySent(true);
        setSuccess(
          res.message ||
            "If an account is associated with that email address, we've sent a link to create a new password."
        );
      } else if (mode === "reset") {
        const res = await api.auth.resetPassword(resetToken, senha);
        setResetComplete(true);
        setSenha("");
        setConfirmarSenha("");
        setSuccess(
          res.message ||
            "Your password has been updated. You may now sign in with your new password."
        );
      } else if (mode === "otp") {
        const res = await api.auth.verifyEmail(trimmedEmail, codigoOtp.trim());
        if (res && res.token) {
          await applyTokenSession(res.token, true);
        } else {
          await login(trimmedEmail, senha, true);
        }
        setSuccess("Email confirmed. Opening your desk...");
        if (onSuccess) onSuccess();
        else router.push("/my-desk");
      }
    } catch (err: any) {
      if (err.requireVerification) {
        setMode("otp");
        setError("Please enter the 6-digit verification code sent to your email inbox.");
      } else {
        setError(err.message || "Unable to complete your request. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Password live feedback for Sign Up & Reset
  const passwordStrengthMessage =
    (mode === "register" || mode === "reset") && senha.length > 0
      ? validatePasswordStrength(senha)
      : null;

  const confirmMismatch =
    (mode === "register" || mode === "reset") &&
    confirmarSenha.length > 0 &&
    senha !== confirmarSenha;

  return (
    <div className="bl-auth-paper-stage">
      {/* Realistic Tilted Creased Kraft Tape at the Top Edge */}
      <img
        src="/images/nova-ui/auth-kraft-tape.png"
        alt=""
        aria-hidden="true"
        className="bl-auth-kraft-tape"
      />

      {/* Aged Cream Stationery Sheet */}
      <div className="bl-auth-paper-sheet">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            title="Close"
            style={{
              position: "absolute",
              top: "18px",
              right: "22px",
              background: "transparent",
              border: "none",
              color: "#6b543b",
              fontSize: "20px",
              cursor: "pointer",
              fontFamily: "var(--serif, Georgia, serif)",
              lineHeight: 1,
              zIndex: 5,
            }}
          >
            ✕
          </button>
        )}

        {/* If already authenticated and viewing inside a modal */}
        {user && mode !== "reset" ? (
          <div className="bl-auth-paper-inner" style={{ textAlign: "center", padding: "12px 0" }}>
            <span className="bl-auth-kicker">Between Letters · Authenticated</span>
            <h1 className="bl-auth-title">Welcome back, {user.nome}</h1>
            <p className="bl-auth-subtitle" style={{ marginBottom: "24px" }}>
              Signed in as {user.email}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "320px", margin: "0 auto" }}>
              <Link
                href="/my-desk"
                className="bl-auth-submit-btn"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textDecoration: "none",
                }}
              >
                Enter My Desk &rarr;
              </Link>
              <button
                type="button"
                onClick={logout}
                className="bl-auth-google-btn"
              >
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <div key={mode} className="bl-auth-paper-inner">
            {/* Header Copy per Mode */}
            <header className="bl-auth-header">
              <span className="bl-auth-kicker">Between Letters</span>
              <h1 className="bl-auth-title">
                {mode === "login" && "Welcome back"}
                {mode === "register" && "Begin your story"}
                {mode === "forgot" && "Forgot your password?"}
                {mode === "reset" && "Create a new password"}
                {mode === "otp" && "Confirm your email"}
              </h1>
              <p className="bl-auth-subtitle">
                {mode === "login" && "\u201CYour stories are waiting for you.\u201D"}
                {mode === "register" &&
                  "\u201CCreate a space for your thoughts, memories, and letters.\u201D"}
                {mode === "forgot" &&
                  "\u201CLeave us your email address and we'll send you a link to create a new password.\u201D"}
                {mode === "reset" &&
                  "\u201CChoose a new key to return to your personal space.\u201D"}
                {mode === "otp" &&
                  "\u201CEnter the 6-digit verification code sent to your inbox.\u201D"}
              </p>
            </header>

            {/* Feedback Banner */}
            {error && (
              <div className="bl-auth-alert bl-auth-alert--error" role="alert">
                {error}
              </div>
            )}

            {success && (
              <div className="bl-auth-alert bl-auth-alert--success" role="status">
                {success}
              </div>
            )}

            {/* ============================================================
                STATE 1: SIGN IN
               ============================================================ */}
            {mode === "login" && (
              <>
                <form onSubmit={handleSubmit} className="bl-auth-form" noValidate>
                  <div className="bl-auth-field">
                    <label htmlFor="bl-login-email" className="bl-auth-label">
                      Email address
                    </label>
                    <input
                      id="bl-login-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="clara@letters.com"
                      className="bl-auth-input"
                    />
                  </div>

                  <div className="bl-auth-field">
                    <label htmlFor="bl-login-password" className="bl-auth-label">
                      Password
                    </label>
                    <div className="bl-auth-input-wrap">
                      <input
                        id="bl-login-password"
                        type={showPassword ? "text" : "password"}
                        required
                        autoComplete="current-password"
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        placeholder="Enter your password"
                        className="bl-auth-input bl-auth-input--with-toggle"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="bl-auth-pw-toggle"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  <div className="bl-auth-aux-row">
                    <label className="bl-auth-checkbox-label">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="bl-auth-checkbox"
                      />
                      <span>Remember me</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => switchMode("forgot")}
                      className="bl-auth-text-btn"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="bl-auth-submit-btn"
                  >
                    {loading ? "Signing In..." : "Sign In"}
                  </button>

                  <div className="bl-auth-divider">
                    <span>or</span>
                  </div>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleGoogleAuth}
                    className="bl-auth-google-btn"
                  >
                    <GoogleEmblem />
                    <span>Continue with Google</span>
                  </button>
                </form>

                <footer className="bl-auth-footer">
                  <span>Don&apos;t have an account?</span>
                  <button
                    type="button"
                    onClick={() => switchMode("register")}
                    className="bl-auth-footer-link"
                  >
                    Create one
                  </button>
                </footer>
              </>
            )}

            {/* ============================================================
                STATE 2: SIGN UP (CREATE ACCOUNT)
               ============================================================ */}
            {mode === "register" && (
              <>
                <form
                  onSubmit={handleSubmit}
                  className="bl-auth-form bl-auth-form--compact"
                  noValidate
                >
                  <div className="bl-auth-field-row">
                    <div className="bl-auth-field">
                      <label htmlFor="bl-reg-name" className="bl-auth-label">
                        Full name
                      </label>
                      <input
                        id="bl-reg-name"
                        type="text"
                        required
                        autoComplete="name"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        placeholder="Clara Vance"
                        className="bl-auth-input"
                      />
                    </div>

                    <div className="bl-auth-field">
                      <label htmlFor="bl-reg-email" className="bl-auth-label">
                        Email address
                      </label>
                      <input
                        id="bl-reg-email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="clara@letters.com"
                        className="bl-auth-input"
                      />
                    </div>
                  </div>

                  <div className="bl-auth-field-row">
                    <div className="bl-auth-field">
                      <label htmlFor="bl-reg-password" className="bl-auth-label">
                        Password
                      </label>
                      <div className="bl-auth-input-wrap">
                        <input
                          id="bl-reg-password"
                          type={showPassword ? "text" : "password"}
                          required
                          autoComplete="new-password"
                          value={senha}
                          onChange={(e) => setSenha(e.target.value)}
                          placeholder="At least 8 characters"
                          className="bl-auth-input bl-auth-input--with-toggle"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="bl-auth-pw-toggle"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? "Hide" : "Show"}
                        </button>
                      </div>
                    </div>

                    <div className="bl-auth-field">
                      <label htmlFor="bl-reg-confirm" className="bl-auth-label">
                        Confirm password
                      </label>
                      <div className="bl-auth-input-wrap">
                        <input
                          id="bl-reg-confirm"
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          autoComplete="new-password"
                          value={confirmarSenha}
                          onChange={(e) => setConfirmarSenha(e.target.value)}
                          placeholder="Repeat password"
                          className="bl-auth-input bl-auth-input--with-toggle"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          className="bl-auth-pw-toggle"
                          aria-label={
                            showConfirmPassword
                              ? "Hide confirm password"
                              : "Show confirm password"
                          }
                        >
                          {showConfirmPassword ? "Hide" : "Show"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {(passwordStrengthMessage || confirmMismatch || senha.length >= 8) && (
                    <div
                      className={`bl-auth-field-hint ${
                        passwordStrengthMessage || confirmMismatch
                          ? "bl-auth-field-hint--error"
                          : "bl-auth-field-hint--valid"
                      }`}
                    >
                      {passwordStrengthMessage
                        ? passwordStrengthMessage
                        : confirmMismatch
                        ? "Confirmation password does not match yet."
                        : "✓ Password meets security requirements."}
                    </div>
                  )}

                  <div>
                    <label className="bl-auth-checkbox-label">
                      <input
                        type="checkbox"
                        checked={acceptTerms}
                        onChange={(e) => setAcceptTerms(e.target.checked)}
                        className="bl-auth-checkbox"
                      />
                      <span>
                        I accept the{" "}
                        <button
                          type="button"
                          onClick={() => setShowTermsNote((prev) => !prev)}
                          className="bl-auth-text-btn"
                          style={{ fontSize: "12px" }}
                        >
                          Terms of Service &amp; Privacy Policy
                        </button>
                        .
                      </span>
                    </label>

                    {showTermsNote && (
                      <div className="bl-auth-terms-box">
                        <strong>Privacy &amp; Sanctuary Pledge:</strong> Your journals,
                        letters, and personal reflections belong solely to you. Passwords
                        are hashed with bcrypt, sessions are protected with encrypted
                        tokens, and your private entries are never shared or sold.
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="bl-auth-submit-btn"
                  >
                    {loading ? "Creating Account..." : "Create Account"}
                  </button>

                  <div className="bl-auth-divider">
                    <span>or</span>
                  </div>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleGoogleAuth}
                    className="bl-auth-google-btn"
                  >
                    <GoogleEmblem />
                    <span>Sign up with Google</span>
                  </button>
                </form>

                <footer className="bl-auth-footer">
                  <span>Already have an account?</span>
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="bl-auth-footer-link"
                  >
                    Sign In
                  </button>
                </footer>
              </>
            )}

            {/* ============================================================
                STATE 3: FORGOT PASSWORD (REQUEST RECOVERY LINK)
               ============================================================ */}
            {mode === "forgot" && (
              <>
                {!recoverySent ? (
                  <form onSubmit={handleSubmit} className="bl-auth-form" noValidate>
                    <div className="bl-auth-field">
                      <label htmlFor="bl-forgot-email" className="bl-auth-label">
                        Email address
                      </label>
                      <input
                        id="bl-forgot-email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="clara@letters.com"
                        className="bl-auth-input"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="bl-auth-submit-btn"
                    >
                      {loading ? "Sending Recovery Link..." : "Send Recovery Link"}
                    </button>
                  </form>
                ) : (
                  <div style={{ textAlign: "center", marginTop: "8px" }}>
                    <button
                      type="button"
                      onClick={() => switchMode("login")}
                      className="bl-auth-submit-btn"
                    >
                      Return to Sign In
                    </button>
                  </div>
                )}

                <footer className="bl-auth-footer">
                  <span>Remembered your password?</span>
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="bl-auth-footer-link"
                  >
                    Sign In
                  </button>
                </footer>
              </>
            )}

            {/* ============================================================
                STATE 4: RESET PASSWORD (FROM RECOVERY EMAIL LINK)
               ============================================================ */}
            {mode === "reset" && (
              <>
                {validatingToken ? (
                  <p
                    className="bl-auth-subtitle"
                    style={{ textAlign: "center", padding: "20px 0" }}
                  >
                    Verifying your recovery link...
                  </p>
                ) : resetComplete ? (
                  <div style={{ textAlign: "center", marginTop: "10px" }}>
                    <button
                      type="button"
                      onClick={() => {
                        router.replace("/login");
                        switchMode("login");
                      }}
                      className="bl-auth-submit-btn"
                    >
                      Return to Sign In
                    </button>
                  </div>
                ) : tokenValid === false ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <button
                      type="button"
                      onClick={() => {
                        router.replace("/login?mode=forgot");
                        switchMode("forgot");
                      }}
                      className="bl-auth-submit-btn"
                    >
                      Request a New Recovery Link
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        router.replace("/login");
                        switchMode("login");
                      }}
                      className="bl-auth-google-btn"
                    >
                      Return to Sign In
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="bl-auth-form" noValidate>
                    <div className="bl-auth-field">
                      <label htmlFor="bl-reset-password" className="bl-auth-label">
                        New password
                      </label>
                      <div className="bl-auth-input-wrap">
                        <input
                          id="bl-reset-password"
                          type={showPassword ? "text" : "password"}
                          required
                          autoComplete="new-password"
                          value={senha}
                          onChange={(e) => setSenha(e.target.value)}
                          placeholder="At least 8 characters"
                          className="bl-auth-input bl-auth-input--with-toggle"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="bl-auth-pw-toggle"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? "Hide" : "Show"}
                        </button>
                      </div>
                    </div>

                    <div className="bl-auth-field">
                      <label htmlFor="bl-reset-confirm" className="bl-auth-label">
                        Confirm new password
                      </label>
                      <div className="bl-auth-input-wrap">
                        <input
                          id="bl-reset-confirm"
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          autoComplete="new-password"
                          value={confirmarSenha}
                          onChange={(e) => setConfirmarSenha(e.target.value)}
                          placeholder="Repeat new password"
                          className="bl-auth-input bl-auth-input--with-toggle"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          className="bl-auth-pw-toggle"
                          aria-label={
                            showConfirmPassword
                              ? "Hide confirm password"
                              : "Show confirm password"
                          }
                        >
                          {showConfirmPassword ? "Hide" : "Show"}
                        </button>
                      </div>
                    </div>

                    {(passwordStrengthMessage || confirmMismatch || senha.length >= 8) && (
                      <div
                        className={`bl-auth-field-hint ${
                          passwordStrengthMessage || confirmMismatch
                            ? "bl-auth-field-hint--error"
                            : "bl-auth-field-hint--valid"
                        }`}
                      >
                        {passwordStrengthMessage
                          ? passwordStrengthMessage
                          : confirmMismatch
                          ? "Confirmation password does not match yet."
                          : "✓ Password meets security requirements."}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="bl-auth-submit-btn"
                    >
                      {loading ? "Updating Password..." : "Reset My Password"}
                    </button>
                  </form>
                )}

                <footer className="bl-auth-footer">
                  <button
                    type="button"
                    onClick={() => {
                      router.replace("/login");
                      switchMode("login");
                    }}
                    className="bl-auth-footer-link"
                  >
                    &larr; Return to Sign In
                  </button>
                </footer>
              </>
            )}

            {/* ============================================================
                STATE 5: EMAIL VERIFICATION (6-DIGIT OTP)
               ============================================================ */}
            {mode === "otp" && (
              <>
                <form onSubmit={handleSubmit} className="bl-auth-form" noValidate>
                  <div className="bl-auth-field">
                    <label htmlFor="bl-otp-code" className="bl-auth-label">
                      6-digit verification code
                    </label>
                    <input
                      id="bl-otp-code"
                      type="text"
                      required
                      maxLength={6}
                      value={codigoOtp}
                      onChange={(e) => setCodigoOtp(e.target.value)}
                      placeholder="123456"
                      className="bl-auth-input bl-auth-otp-input"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="bl-auth-submit-btn"
                  >
                    {loading ? "Verifying..." : "Verify & Enter"}
                  </button>

                  <div style={{ textAlign: "center", marginTop: "4px" }}>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleResendOtp}
                      className="bl-auth-text-btn"
                    >
                      Resend verification code
                    </button>
                  </div>
                </form>

                <footer className="bl-auth-footer">
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="bl-auth-footer-link"
                  >
                    &larr; Return to Sign In
                  </button>
                </footer>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
