"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface NotebookControlsProps {
  isOpen: boolean;
  isAnimating: boolean;
  spreadIndex: number;
  totalSpreads: number;
  notebookName?: string;
  notebookId?: string;
  onCloseBook?: () => void;
  onBackToShelf?: () => void;
  onContinueWriting?: () => void;
}

/**
 * Minimalist bottom dock positioned cleanly beneath the 3D notebook.
 * Features tactile status hint, quick navigation between spreads,
 * return link back to My Shelf, and the primary "Continue Writing" CTA button.
 */
export function NotebookControls({
  isOpen,
  isAnimating,
  spreadIndex,
  totalSpreads,
  notebookName = "Between Letters",
  notebookId,
  onCloseBook,
  onBackToShelf,
  onContinueWriting,
}: NotebookControlsProps) {
  const router = useRouter();
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
  const formattedTotal = String(Math.max(totalSpreads, 1)).padStart(2, "0");

  const returnTarget = "/my-shelf";
  const continueTarget = notebookId
    ? `/journal?notebook=${encodeURIComponent(notebookId)}`
    : "/journal";

  const handleReturn = () => {
    if (onBackToShelf) {
      onBackToShelf();
    } else {
      router.push(returnTarget);
    }
  };

  return (
    <div className="nb-controls" role="region" aria-label="Notebook actions">
      {/* Whisper-quiet status caption with navigation hints and return link */}
      <div className="nb-controls__whisper" aria-live="polite">
        {!isOpen ? (
          <div className="nb-controls__closed-row">
            <span>Click the leather volume to open</span>
            <span className="nb-controls__dot" aria-hidden="true">·</span>
            <button
              type="button"
              className="nb-controls__close-link"
              onClick={handleReturn}
              title="Return to My Shelf archive"
            >
              ← Back to My Shelf
            </button>
          </div>
        ) : (
          <span className="nb-controls__spread-meta">
            <button
              type="button"
              className="nb-controls__close-link"
              onClick={handleReturn}
              title="Return to My Shelf archive"
            >
              ← Back to My Shelf
            </button>
            <span className="nb-controls__dot" aria-hidden="true">·</span>
            <span>
              {notebookName} · Spread {formattedCurrent} / {formattedTotal} · Click left or right page to turn
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

      {/* Primary vintage paper CTA button directing to existing /journal writing desk */}
      <Link
        ref={btnRef}
        href={continueTarget}
        className="nb-start-button"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        aria-label="Continue writing in this journal"
        title="Open this journal on your writing desk to write new entries"
        onClick={(e) => {
          if (onContinueWriting) {
            e.preventDefault();
            onContinueWriting();
          }
        }}
      >
        <span className="nb-start-button__inner-rule" aria-hidden="true" />
        <span className="nb-start-button__label">Continue Writing ✎</span>
        <span className="nb-start-button__arrow" aria-hidden="true">
          →
        </span>
      </Link>
    </div>
  );
}

export default NotebookControls;
