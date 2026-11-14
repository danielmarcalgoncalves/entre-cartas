"use client";

import React, { useEffect, useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FONT_OPTIONS, INK_OPTIONS, PAPER_OPTIONS, playPaperSound } from "@/lib/journal-storage";

interface PaperInkModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheetBgId: string;
  sheetBgColor: string;
  inkColorId: string;
  inkColor: string;
  fontFamilyId: string;
  onSelectPaper: (paperId: string, color: string) => void;
  onSelectInk: (inkId: string, color: string) => void;
  onSelectFont: (fontId: string) => void;
}

const LEGACY_PAPER_MAP: Record<string, string> = {
  marfim: "ivory",
  pergaminho: "cream",
  kraft: "warm-beige",
  branco: "antique-white",
};

export default function PaperInkModal({
  isOpen,
  onClose,
  sheetBgId,
  sheetBgColor,
  inkColorId,
  inkColor,
  fontFamilyId,
  onSelectPaper,
  onSelectInk,
  onSelectFont,
}: PaperInkModalProps) {
  const prefersReducedMotion = useReducedMotion();

  // Deduplicate backwards-compatibility aliases while preserving all 6 unique papers
  const uniquePapers = useMemo(() => {
    const seen = new Set<string>();
    return PAPER_OPTIONS.filter((paper) => {
      if (seen.has(paper.name)) return false;
      seen.add(paper.name);
      return true;
    });
  }, []);

  const normalizedPaperId = LEGACY_PAPER_MAP[sheetBgId] || sheetBgId;
  const activePaper =
    uniquePapers.find((p) => p.id === normalizedPaperId) ||
    PAPER_OPTIONS.find((p) => p.id === sheetBgId) ||
    uniquePapers[0];

  const activeInk =
    INK_OPTIONS.find((i) => i.id === inkColorId) || INK_OPTIONS[0];

  const activeFont =
    FONT_OPTIONS.find((f) => f.id === fontFamilyId) || FONT_OPTIONS[0];

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="paper-ink-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="paper-ink-modal-title"
        >
          <motion.div
            className="paper-ink-modal-sheet"
            onClick={(e) => e.stopPropagation()}
            initial={
              prefersReducedMotion
                ? false
                : { opacity: 0, y: 18, scale: 0.97 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 14, scale: 0.97 }
            }
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Header */}
            <header className="paper-ink-modal-header">
              <div>
                <h2 id="paper-ink-modal-title" className="paper-ink-modal-title">
                  Paper &amp; Ink
                </h2>
                <p className="paper-ink-modal-subtitle">
                  Choose your sheet tone, fountain pen ink, and writing script. Changes apply immediately to your page.
                </p>
              </div>
              <button
                type="button"
                className="paper-ink-close-btn"
                onClick={() => {
                  playPaperSound();
                  onClose();
                }}
                aria-label="Close Paper & Ink settings"
                title="Close (Esc)"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </header>

            {/* Live Stationery Sample Strip */}
            <div
              className="paper-ink-live-specimen"
              style={{
                backgroundColor: sheetBgColor,
                color: inkColor,
              }}
              aria-live="polite"
            >
              <div className="paper-ink-specimen-meta">
                <span>{activePaper?.name}</span>
                <span aria-hidden="true">·</span>
                <span>{activeInk?.name}</span>
                <span aria-hidden="true">·</span>
                <span>{activeFont?.name}</span>
              </div>
              <p
                className="paper-ink-specimen-line"
                style={{
                  fontFamily: activeFont?.styleFamily,
                  fontStyle: activeFont?.id === "literary" ? "italic" : "normal",
                }}
              >
                &ldquo;What is written with care never truly fades.&rdquo;
              </p>
            </div>

            <div className="paper-ink-modal-body">
              {/* Section A: Sheet Paper */}
              <section className="paper-ink-section" aria-labelledby="paper-section-label">
                <div className="paper-ink-section-head">
                  <h3 id="paper-section-label" className="paper-ink-section-title">
                    Sheet Paper
                  </h3>
                  <span className="paper-ink-selected-name">{activePaper?.name}</span>
                </div>

                <div className="paper-ink-paper-grid" role="radiogroup" aria-label="Sheet Paper Color">
                  {uniquePapers.map((paper) => {
                    const isSelected = normalizedPaperId === paper.id;
                    return (
                      <button
                        key={paper.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        className={`paper-specimen-btn ${isSelected ? "is-selected" : ""}`}
                        onClick={() => {
                          playPaperSound();
                          onSelectPaper(paper.id, paper.color);
                        }}
                      >
                        <span
                          className="paper-specimen-swatch"
                          style={{ backgroundColor: paper.color }}
                        >
                          {isSelected && (
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#2d231a"
                              strokeWidth="2.4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </span>
                        <span className="paper-specimen-label">{paper.name}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Section B: Ink Color */}
              <section className="paper-ink-section" aria-labelledby="ink-section-label">
                <div className="paper-ink-section-head">
                  <h3 id="ink-section-label" className="paper-ink-section-title">
                    Ink Color
                  </h3>
                  <span className="paper-ink-selected-name">{activeInk?.name}</span>
                </div>

                <div className="paper-ink-ink-row" role="radiogroup" aria-label="Ink Color">
                  {INK_OPTIONS.map((ink) => {
                    const isSelected = inkColorId === ink.id;
                    return (
                      <button
                        key={ink.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        className={`ink-well-btn ${isSelected ? "is-selected" : ""}`}
                        onClick={() => {
                          playPaperSound();
                          onSelectInk(ink.id, ink.color);
                        }}
                      >
                        <span
                          className="ink-well-circle"
                          style={{ backgroundColor: ink.color }}
                        >
                          {isSelected && (
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#fcfbf7"
                              strokeWidth="2.4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </span>
                        <span className="ink-well-label">{ink.name}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Section C: Script & Typography */}
              <section className="paper-ink-section" aria-labelledby="font-section-label">
                <div className="paper-ink-section-head">
                  <h3 id="font-section-label" className="paper-ink-section-title">
                    Script &amp; Typography
                  </h3>
                  <span className="paper-ink-selected-name">{activeFont?.name}</span>
                </div>

                <div className="paper-ink-font-list" role="radiogroup" aria-label="Writing Typography">
                  {FONT_OPTIONS.map((font) => {
                    const isSelected = fontFamilyId === font.id;
                    const isItalic = font.id === "literary";
                    return (
                      <button
                        key={font.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        className={`font-specimen-btn ${isSelected ? "is-selected" : ""}`}
                        onClick={() => {
                          playPaperSound();
                          onSelectFont(font.id);
                        }}
                      >
                        <div className="font-specimen-copy">
                          <span
                            className="font-specimen-name"
                            style={{
                              fontFamily: font.styleFamily,
                              fontStyle: isItalic ? "italic" : "normal",
                            }}
                          >
                            {font.name}
                          </span>
                          <span
                            className="font-specimen-preview"
                            style={{
                              fontFamily: font.styleFamily,
                              fontStyle: isItalic ? "italic" : "normal",
                            }}
                          >
                            {font.previewText} — Dear diary, today the light fell softly across the desk.
                          </span>
                        </div>
                        <span className="font-specimen-indicator" aria-hidden="true">
                          {isSelected ? (
                            <svg
                              width="15"
                              height="15"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
