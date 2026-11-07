"use client";

import React, { useRef } from "react";
import Link from "next/link";

export interface NotebookControlsProps {
  isOpen: boolean;
  isAnimating: boolean;
  spreadIndex: number;
  totalSpreads: number;
  onCloseBook?: () => void;
}

/**
 * Minimalist bottom dock positioned cleanly beneath the 3D notebook.
 * Features a subtle tactile hint and the primary CTA button linking to the
 * existing journal creation & writing flow (/journal) in strict English UI.
 */
export function NotebookControls({
  isOpen,
  isAnimating,
  spreadIndex,
  totalSpreads,
  onCloseBook,
}: NotebookControlsProps) {
  const btnRef = useRef<HTMLAnchorElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    const rotX = ny * -8;
    const rotY = nx * 8;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (btnRef.current) {
        btnRef.current.style.transform = `perspective(800px) rotateX(${rotX.toFixed(
          2
        )}deg) rotateY(${rotY.toFixed(2)}deg) translateY(-2px)`;
      }
    });
  };

  const handleMouseLeave = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (btnRef.current) {
      btnRef.current.style.transform =
        "perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0px)";
    }
  };

  const formattedCurrent = String(spreadIndex + 1).padStart(2, "0");
  const formattedTotal = String(totalSpreads).padStart(2, "0");

  return (
    <div className="nb-controls" role="region" aria-label="Notebook actions">
      {/* Whisper-quiet status caption that never competes with the notebook */}
      <div className="nb-controls__whisper" aria-live="polite">
        {!isOpen ? (
          <span>Click the leather volume to open</span>
        ) : (
          <span className="nb-controls__spread-meta">
            <span>
              Spread {formattedCurrent} / {formattedTotal} · Click left or right
              page to turn
            </span>
            {spreadIndex === 0 && onCloseBook && (
              <>
                <span className="nb-controls__dot" aria-hidden="true">
                  ·
                </span>
                <button
                  type="button"
                  className="nb-controls__close-link"
                  onClick={onCloseBook}
                  disabled={isAnimating}
                >
                  Close cover
                </button>
              </>
            )}
          </span>
        )}
      </div>

      {/* Primary vintage paper CTA button directing to existing /journal flow */}
      <Link
        ref={btnRef}
        href="/journal"
        className="nb-start-button"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        aria-label="Start My Journal — Open your personal writing desk"
      >
        <span className="nb-start-button__inner-rule" aria-hidden="true" />
        <span className="nb-start-button__label">Start My Journal</span>
        <span className="nb-start-button__arrow" aria-hidden="true">
          →
        </span>
      </Link>
    </div>
  );
}

export default NotebookControls;
