"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import AuthModal from "@/components/AuthModal";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

const navItems: NavItem[] = [
  {
    href: "/my-desk",
    label: "My Desk",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V20h14V9.5" />
        <path d="M9 20v-6h6v6" />
      </svg>
    ),
  },
  {
    href: "/journal",
    label: "Journal",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19v20H6.5a2.5 2.5 0 0 1 0-5H19" />
        <path d="M8 7h6" />
        <path d="M8 11h4" />
      </svg>
    ),
  },
  {
    href: "/letters",
    label: "Letters",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    ),
  },
  {
    href: "/my-shelf",
    label: "My Shelf",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4v16" />
        <path d="M20 4v16" />
        <path d="M4 12h16" />
        <path d="M4 20h16" />
        <path d="M8 6v6" />
        <path d="M12 5v7" />
        <path d="M16 7v5" />
      </svg>
    ),
  },
  {
    href: "/discover",
    label: "Inspirations",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <polygon points="15.5 8.5 13.5 13.5 8.5 15.5 10.5 10.5 15.5 8.5" />
      </svg>
    ),
  },
];

export default function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, isPro, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";
  const [authOpen, setAuthOpen] = useState(false);

  const [isHovered, setIsHovered] = useState(false);
  const [isFocusedInside, setIsFocusedInside] = useState(false);
  const [isPinnedOpen, setIsPinnedOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const [avatarLoadError, setAvatarLoadError] = useState(false);

  const headerRef = useRef<HTMLElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const isSidebarExpanded = isHovered || isFocusedInside || isPinnedOpen;

  // Sync user's profile photo from Auth context or local storage fallback
  useEffect(() => {
    const readLocalAvatar = () => {
      try {
        const saved =
          window.localStorage.getItem("entre-cartas:profile:avatar") ||
          window.localStorage.getItem("entre-cartas:user:avatar");
        setLocalAvatar(saved || null);
      } catch {
        setLocalAvatar(null);
      }
    };

    readLocalAvatar();
    window.addEventListener("storage", readLocalAvatar);
    window.addEventListener("entre-cartas:profile-updated", readLocalAvatar);
    return () => {
      window.removeEventListener("storage", readLocalAvatar);
      window.removeEventListener("entre-cartas:profile-updated", readLocalAvatar);
    };
  }, []);

  const profilePhotoUrl = user?.foto_url || localAvatar || null;

  useEffect(() => {
    setAvatarLoadError(false);
  }, [profilePhotoUrl]);

  // Collapse sidebar when user clicks outside of it
  useEffect(() => {
    const handlePointerDownOutside = (event: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setIsFocusedInside(false);
        setIsPinnedOpen(false);
        setIsHovered(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDownOutside);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDownOutside);
    };
  }, []);

  // Collapse transient open states on route change
  useEffect(() => {
    setIsPinnedOpen(false);
    setIsFocusedInside(false);
  }, [pathname]);

  const isPresentationPage =
    pathname === "/" ||
    pathname === "/notebook" ||
    pathname.startsWith("/notebook/");

  if (isPresentationPage) {
    return (
      <div className="site-wrap site-wrap--presentation">
        <main className="site-main-presentation">{children}</main>
        <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    );
  }

  const userInitials = user?.nome
    ? user.nome
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || "")
        .join("")
    : null;

  const isMyDeskPage =
    pathname === "/my-desk" || pathname.startsWith("/my-desk/");

  return (
    <div
      className={`site-wrap site-wrap--with-sidebar ${
        isMyDeskPage ? "site-wrap--my-desk" : ""
      } ${isSidebarExpanded ? "sidebar-is-open" : "sidebar-is-collapsed"}`}
    >
      {!isMyDeskPage && (
        <div className="top-note">
          An intimate digital journal to write your day and cherish memories
          {isPro && (
            <span style={{ marginLeft: "12px", color: "var(--color-pollen)" }}>
              ✦ Pro Sender
            </span>
          )}
        </div>
      )}

      <header
        ref={headerRef}
        className={`site-header site-header--vertical ${isSidebarExpanded ? "is-expanded" : "is-collapsed"}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocusCapture={() => setIsFocusedInside(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsFocusedInside(false);
          }
        }}
      >
        <div className="nav-inner">
          {/* 1. First Element: User Profile Option with Profile Photo */}
          <button
            type="button"
            className="sidebar-profile-option"
            onClick={() => {
              setIsPinnedOpen((prev) => !prev);
            }}
            aria-label={user ? `Profile: ${user.nome}` : "User profile"}
            title={user ? `${user.nome} · Profile` : "Profile"}
          >
            <span className="sidebar-profile-avatar" aria-hidden="true">
              {profilePhotoUrl && !avatarLoadError ? (
                <img
                  src={profilePhotoUrl}
                  alt={user?.nome ? `${user.nome} profile photo` : "User profile photo"}
                  className="sidebar-profile-avatar-img"
                  onError={() => setAvatarLoadError(true)}
                />
              ) : userInitials ? (
                <span className="sidebar-profile-initials">{userInitials}</span>
              ) : (
                <svg
                  className="sidebar-profile-placeholder-icon"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
                </svg>
              )}
              <span
                className={`sidebar-profile-status-dot ${
                  isPro ? "is-pro" : user ? "is-online" : ""
                }`}
              />
            </span>

            <span className="sidebar-profile-meta sidebar-collapsible-content">
              <span className="sidebar-profile-name">
                {user ? user.nome.split(" ")[0] : "Profile"}
              </span>
              <span className="sidebar-profile-role">
                {user ? (isPro ? "✦ Pro Sender" : "Personal Profile") : "Personal Profile"}
              </span>
            </span>
          </button>

          {/* 2. Vertical Navigation Links */}
          <nav className="nav-links" aria-label="Main navigation">
            {navItems.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link${active ? " active" : ""}`}
                  aria-current={active ? "page" : undefined}
                  title={item.label}
                >
                  <span className="nav-link-symbol" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="nav-link-label sidebar-collapsible-content">
                    {item.label}
                  </span>
                </Link>
              );
            })}

            {/* 3. Settings Item with Collapsible Submenu */}
            <div className="nav-settings-block">
              <button
                type="button"
                className={`nav-link nav-link--settings ${isSettingsOpen ? "active" : ""}`}
                onClick={() => {
                  setIsPinnedOpen(true);
                  setIsSettingsOpen((prev) => !prev);
                }}
                aria-expanded={isSettingsOpen}
                title="Settings"
              >
                <span className="nav-link-symbol" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </span>
                <span className="nav-link-label sidebar-collapsible-content">
                  Settings
                </span>
                <span
                  className={`nav-link-chevron sidebar-collapsible-content ${isSettingsOpen ? "is-rotated" : ""}`}
                  aria-hidden="true"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </button>

              {/* Settings Sub-options (Dark/Light Mode & Pro Club) */}
              {isSettingsOpen && (
                <div className="nav-submenu">
                  {/* Option A: Dark / Light Mode */}
                  <button
                    type="button"
                    className="nav-submenu-item"
                    onClick={toggleTheme}
                    title={`Switch to ${isLight ? "Dark" : "Light"} mode`}
                  >
                    <span className="nav-submenu-symbol" aria-hidden="true">
                      {isLight ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="4" />
                          <path d="M12 2v2" />
                          <path d="M12 20v2" />
                          <path d="m4.93 4.93 1.41 1.41" />
                          <path d="m17.66 17.66 1.41 1.41" />
                          <path d="M2 12h2" />
                          <path d="M20 12h2" />
                          <path d="m6.34 17.66-1.41 1.41" />
                          <path d="m19.07 4.93-1.41 1.41" />
                        </svg>
                      )}
                    </span>
                    <span className="nav-submenu-label sidebar-collapsible-content">
                      {isLight ? "Dark Mode" : "Light Mode"}
                    </span>
                  </button>

                  {/* Option B: Pro Club */}
                  <Link
                    href="/clube-pro"
                    className={`nav-submenu-item ${pathname === "/clube-pro" ? "active" : ""}`}
                    title="Pro Club"
                  >
                    <span className="nav-submenu-symbol" aria-hidden="true">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3z" />
                      </svg>
                    </span>
                    <span className="nav-submenu-label sidebar-collapsible-content">
                      Pro Club
                    </span>
                  </Link>
                </div>
              )}
            </div>
          </nav>

          {/* 4. Bottom Controls: Search & Sign In / Account */}
          <div className="sidebar-bottom-actions">
            <form
              className="header-search"
              action="/discover"
              method="get"
              role="search"
              onClick={() => {
                if (!isSidebarExpanded) {
                  setIsPinnedOpen(true);
                  setTimeout(() => searchInputRef.current?.focus(), 60);
                }
              }}
            >
              <button
                type="submit"
                aria-label="Search"
                title="Search archive"
                onClick={(e) => {
                  if (!isSidebarExpanded) {
                    e.preventDefault();
                    setIsPinnedOpen(true);
                    setTimeout(() => searchInputRef.current?.focus(), 60);
                  }
                }}
              >
                ⌕
              </button>
              <input
                ref={searchInputRef}
                name="q"
                aria-label="Search letters"
                placeholder="search archive..."
                className="sidebar-collapsible-content"
              />
            </form>

            {user ? (
              <div className="sidebar-auth-box">
                <span
                  className="stamp-mark sidebar-auth-stamp"
                  title={isPro ? "Pro Sender Member" : "Registered Reader"}
                >
                  {isPro ? "PRO" : "RDR"}
                </span>
                <div className="sidebar-auth-details sidebar-collapsible-content">
                  <span className="sidebar-auth-username">
                    {user.nome.split(" ")[0]}
                  </span>
                  <button
                    type="button"
                    onClick={logout}
                    className="sidebar-signout-btn"
                    title="Sign out of account"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                className="stamp-button compact sidebar-signin-btn"
                title="Sign In"
              >
                <span className="sidebar-signin-symbol" aria-hidden="true">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                </span>
                <span className="sidebar-signin-label sidebar-collapsible-content">
                  Sign In
                </span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className={`site-main ${isMyDeskPage ? "site-main--desk" : ""}`}>
        {children}
      </main>

      {!isMyDeskPage && (
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
      )}

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
