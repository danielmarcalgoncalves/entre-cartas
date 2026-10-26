"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import AuthModal from "@/components/AuthModal";

const navItems = [
  { href: "/", label: "My Journal" },
  { href: "/discover", label: "Inspirations" },
  { href: "/favorites", label: "Favorites" },
  { href: "/collections", label: "Folders" },
  { href: "/clube-pro", label: "Pro Club" },
];

export default function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, isPro, logout } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div className="site-wrap">
      <div className="top-note">
        An intimate digital journal to write your day and cherish memories
        {isPro && <span style={{ marginLeft: "12px", color: "#e8c569" }}>✦ Pro Sender</span>}
      </div>
      <header className="site-header">
        <div className="nav-inner">
          <Link href="/" className="brand" aria-label="Between Letters, home page">
            <span className="brand-seal" aria-hidden="true">BL</span>
            <span>
              <span className="brand-title">Between Letters</span>
              <span className="brand-caption">archive of sentiments</span>
            </span>
          </Link>

          <nav className="nav-links" aria-label="Main navigation">
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
              <input name="q" aria-label="Search letters" placeholder="search archive..." />
              <button type="submit" aria-label="Search">⌕</button>
            </form>

            {user ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="stamp-mark" style={{ minWidth: "auto", padding: "3px 8px", fontSize: "7px", transform: "rotate(-3deg)" }}>
                  {isPro ? "PRO" : "READER"}
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
                  title="Sign out of account"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="stamp-button compact"
                style={{ minWidth: "auto", textDecoration: "none" }}
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="site-main">{children}</main>

      <footer className="site-footer">
        <div className="footer-inner">
          <div>
            <div className="footer-brand">Between Letters</div>
            <div className="footer-note">For everything that still finds words.</div>
          </div>
          <div className="footer-meta">
            A small archive of anonymous memories.<br />
            Crafted to read slowly, keep tenderly, and return to whenever longing strikes.<br />
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
