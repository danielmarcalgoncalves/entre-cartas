"use client";

import { useTheme } from "@/hooks/useTheme";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  const nextThemeLabel = isLight ? "Dark Organic Editorial" : "Light Academy";
  const actionTitle = isLight
    ? "Switch to dark theme (Dark Organic Editorial)"
    : "Switch to light theme (Light Academy)";
  const ariaLabel = isLight ? "Switch to dark theme" : "Switch to light theme";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle-btn"
      aria-label={ariaLabel}
      title={actionTitle}
      data-active-theme={theme}
    >
      <span className="theme-toggle-indicator" aria-hidden="true">
        {isLight ? (
          /* Moon icon for switching to dark */
          <svg
            className="theme-icon theme-icon-moon"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
        ) : (
          /* Sun icon with warm floral rays for switching to light */
          <svg
            className="theme-icon theme-icon-sun"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
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
      <span className="theme-toggle-label">
        {isLight ? "Light" : "Dark"}
      </span>
    </button>
  );
}
