"use client";

import React, { useEffect, useState } from "react";
import "./auth-loading.css";

const BRAND_PHRASE = "between letters";
const CHAR_INTERVAL_MS = 52;

export function AuthSessionLoadingScreen() {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      setVisibleCount(BRAND_PHRASE.length);
      return;
    }

    let current = 0;
    const timer = window.setInterval(() => {
      current += 1;
      setVisibleCount(current);
      if (current >= BRAND_PHRASE.length) {
        window.clearInterval(timer);
      }
    }, CHAR_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, []);

  const typedText = BRAND_PHRASE.slice(0, visibleCount);
  const isComplete = visibleCount >= BRAND_PHRASE.length;

  return (
    <div
      className="bl-session-loading-screen"
      role="status"
      aria-live="polite"
      aria-label="Restoring your Between Letters session"
    >
      <div className="bl-session-loading-brand">
        {/* Refined BT monogram seal icon */}
        <svg
          className="bl-session-loading-icon"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle
            cx="24"
            cy="24"
            r="21.5"
            stroke="#c9a86a"
            strokeOpacity="0.65"
            strokeWidth="1.2"
          />
          <circle
            cx="24"
            cy="24"
            r="17.5"
            stroke="#c9a86a"
            strokeOpacity="0.32"
            strokeWidth="0.9"
            strokeDasharray="2 2.2"
          />
          <text
            x="24"
            y="29.5"
            textAnchor="middle"
            fill="#f4ead7"
            fontFamily="Cormorant Garamond, Georgia, serif"
            fontSize="16.5"
            fontStyle="italic"
            fontWeight="500"
            letterSpacing="0.06em"
          >
            BT
          </text>
        </svg>

        <span className="bl-session-loading-text-wrap">
          <span>{typedText}</span>
          <span
            className={`bl-session-loading-cursor${isComplete ? " is-complete" : ""}`}
            aria-hidden="true"
          />
        </span>
      </div>
    </div>
  );
}

export default AuthSessionLoadingScreen;
