"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import AuthModal from "@/components/AuthModal";

const navItems = [
  { href: "/", label: "✍️ Meu Jornal" },
  { href: "/discover", label: "✨ Inspirações" },
  { href: "/favorites", label: "Favoritas" },
  { href: "/collections", label: "Pastas" },
  { href: "/clube-pro", label: "Clube Pro ★" },
];

export default function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, isPro, logout } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div className="site-wrap">
      <div className="top-note">
        Jornal digital acolhedor para escrever seu dia e guardar sentimentos
        {isPro && <span style={{ marginLeft: "12px", color: "#e8c569" }}>✦ Remetente Pro</span>}
      </div>
      <header className="site-header">
        <div className="nav-inner">
          <Link href="/" className="brand" aria-label="Entre Cartas, página inicial">
            <span className="brand-seal" aria-hidden="true">EC</span>
            <span>
              <span className="brand-title">Entre Cartas</span>
              <span className="brand-caption">arquivo de sentimentos</span>
            </span>
          </Link>

          <nav className="nav-links" aria-label="Navegação principal">
            {navItems.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link key={item.href} href={item.href} className={`nav-link${active ? " active" : ""}`} aria-current={active ? "page" : undefined}>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <form className="header-search" action="/discover" method="get" role="search">
              <input name="q" aria-label="Buscar cartas" placeholder="buscar no arquivo" />
              <button type="submit" aria-label="Buscar">⌕</button>
            </form>

            {user ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="stamp-mark" style={{ minWidth: "auto", padding: "3px 8px", fontSize: "7px", transform: "rotate(-3deg)" }}>
                  {isPro ? "👑 PRO" : "LEITOR"}
                </span>
                <span style={{ fontSize: "11px", color: "#5b5348", maxWidth: "90px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.nome.split(" ")[0]}
                </span>
                <button
                  type="button"
                  onClick={logout}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#8b1e1e",
                    fontSize: "10px",
                    cursor: "pointer",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    padding: "2px 4px",
                  }}
                  title="Sair da conta"
                >
                  Sair
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                className="stamp-button compact"
                style={{ minWidth: "auto" }}
              >
                Entrar
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="site-main">{children}</main>

      <footer className="site-footer">
        <div className="footer-inner">
          <div>
            <div className="footer-brand">Entre Cartas</div>
            <div className="footer-note">Para tudo aquilo que ainda encontra palavras.</div>
          </div>
          <div className="footer-meta">
            Um pequeno arquivo de memórias anônimas.<br />
            Feito para ler devagar, guardar com cuidado e voltar quando der saudade.<br />
            <span style={{ opacity: 0.75, display: "inline-block", marginTop: "4px" }}>
              ISW055 · Fatec Pompeia · Prof. @siriani
            </span>
          </div>
        </div>
      </footer>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
