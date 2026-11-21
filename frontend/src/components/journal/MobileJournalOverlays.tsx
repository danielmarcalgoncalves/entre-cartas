"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { MobileOverlayState } from "./useMobileJournalGestures";

export type MobileAutosaveStatus = "idle" | "saving" | "saved" | "error";

interface MobileJournalOverlaysProps {
  activeOverlay: MobileOverlayState;
  onCloseOverlay: () => void;
  activeNotebookName: string;
  currentPageIndex: number;
  totalPages: number;
  canAdvancePage: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
  onOpenVolumes: () => void;
  onOpenPaperInk: () => void;
  onOpenStickers: () => void;
  onOpenPhotos: () => void;
  onSavePage: () => void;
  saving: boolean;
  autosaveStatus: MobileAutosaveStatus;
  onNavigate: (href: string) => void;
}

const NAV_ITEMS = [
  { href: "/my-desk", label: "My Desk" },
  { href: "/journal", label: "Journal", active: true },
  { href: "/letters", label: "Letters" },
  { href: "/my-shelf", label: "My Shelf" },
  { href: "/discover", label: "Inspirations" },
];

export default function MobileJournalOverlays({
  activeOverlay,
  onCloseOverlay,
  activeNotebookName,
  currentPageIndex,
  totalPages,
  canAdvancePage,
  onPrevPage,
  onNextPage,
  onOpenVolumes,
  onOpenPaperInk,
  onOpenStickers,
  onOpenPhotos,
  onSavePage,
  saving,
  autosaveStatus,
  onNavigate,
}: MobileJournalOverlaysProps) {
  const prefersReducedMotion = useReducedMotion();
  const drawerTouchRef = useRef<{ x: number; y: number } | null>(null);

  const handleOverlayTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      drawerTouchRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    } else {
      drawerTouchRef.current = null;
    }
  };

  const handleNavDrawerTouchEnd = (e: React.TouchEvent) => {
    const start = drawerTouchRef.current;
    drawerTouchRef.current = null;
    if (!start || e.changedTouches.length !== 1) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    // Allow dismissing the left drawer via left-to-right or right-to-left horizontal swipe
    if (Math.abs(dx) >= 56 && Math.abs(dx) >= Math.abs(dy) * 1.4 && dx < 0) {
      onCloseOverlay();
    }
  };

  useEffect(() => {
    if (activeOverlay === "closed") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseOverlay();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeOverlay, onCloseOverlay]);

  const springTransition = prefersReducedMotion
    ? { duration: 0.01 }
    : { type: "spring" as const, stiffness: 360, damping: 32, mass: 0.85 };

  const fadeTransition = prefersReducedMotion
    ? { duration: 0.01 }
    : { duration: 0.18 };

  return (
    <>
      {/* Shared Backdrop (only mounted when a gesture overlay is open) */}
      <AnimatePresence>
        {activeOverlay !== "closed" && (
          <motion.div
            key="mobile-journal-backdrop"
            className="mobile-journal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fadeTransition}
            onClick={onCloseOverlay}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Left Navigation Submenu Drawer (Swipe Left-to-Right Only — No Persistent FAB) */}
      <AnimatePresence>
        {activeOverlay === "nav" && (
          <motion.aside
            key="mobile-journal-nav-drawer"
            id="mobile-journal-nav-drawer"
            className="mobile-journal-nav-drawer mobile-journal-overlay-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Journal navigation menu"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={springTransition}
            onTouchStart={handleOverlayTouchStart}
            onTouchEnd={handleNavDrawerTouchEnd}
          >
            <div>
              <div className="mobile-nav-header">
                <div>
                  <h2 className="mobile-nav-brand">Between Letters</h2>
                  <p className="mobile-nav-volume">{activeNotebookName}</p>
                </div>
                <button
                  type="button"
                  className="mobile-nav-close"
                  onClick={onCloseOverlay}
                  aria-label="Close navigation menu"
                >
                  ✕
                </button>
              </div>

              <nav className="mobile-nav-links" aria-label="Primary navigation">
                {NAV_ITEMS.map((item) => (
                  <button
                    key={item.href}
                    type="button"
                    className={`mobile-nav-item ${item.active ? "is-active" : ""}`}
                    aria-current={item.active ? "page" : undefined}
                    onClick={() => {
                      onCloseOverlay();
                      if (!item.active) {
                        onNavigate(item.href);
                      }
                    }}
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>

              <div className="mobile-nav-section-divider" />

              <button
                type="button"
                className="mobile-nav-item"
                onClick={() => {
                  onCloseOverlay();
                  onOpenVolumes();
                }}
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
                <span>Switch Volume</span>
              </button>
            </div>

            <div className="mobile-nav-page-controls" aria-label="Page navigation">
              <button
                type="button"
                className="mobile-nav-page-btn"
                onClick={() => {
                  onPrevPage();
                  onCloseOverlay();
                }}
                disabled={currentPageIndex === 0}
              >
                ← Previous
              </button>
              <span className="mobile-nav-page-label">
                Page {currentPageIndex + 1} / {Math.max(totalPages, 1)}
              </span>
              <button
                type="button"
                className="mobile-nav-page-btn"
                onClick={() => {
                  onNextPage();
                  onCloseOverlay();
                }}
                disabled={!canAdvancePage}
              >
                Next →
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Top Contextual Writing Tools Tray (Swipe Downward) */}
      <AnimatePresence>
        {activeOverlay === "tools" && (
          <motion.div
            key="mobile-journal-tools-tray"
            className="mobile-journal-tools-tray mobile-journal-overlay-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Writing tools"
            initial={{ y: "-100%" }}
            animate={{ y: 0 }}
            exit={{ y: "-100%" }}
            transition={springTransition}
          >
            <div className="mobile-tools-grid">
              <button
                type="button"
                className="mobile-tool-action-btn"
                onClick={() => {
                  onCloseOverlay();
                  onOpenPaperInk();
                }}
              >
                <span className="mobile-tool-icon" aria-hidden="true">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 19l7-7 3 3-7 7-3-3z" />
                    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                    <path d="M2 2l7.586 7.586" />
                    <circle cx="11" cy="11" r="2" />
                  </svg>
                </span>
                <span>Paper &amp; Ink</span>
              </button>

              <button
                type="button"
                className="mobile-tool-action-btn"
                onClick={() => {
                  onCloseOverlay();
                  onOpenStickers();
                }}
              >
                <span className="mobile-tool-icon" aria-hidden="true">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 3l1.9 5.8h6.1l-4.95 3.6 1.9 5.8L12 14.6l-4.95 3.6 1.9-5.8L4 8.8h6.1L12 3z" />
                  </svg>
                </span>
                <span>Add Stickers</span>
              </button>

              <button
                type="button"
                className="mobile-tool-action-btn"
                onClick={() => {
                  onCloseOverlay();
                  onOpenPhotos();
                }}
              >
                <span className="mobile-tool-icon" aria-hidden="true">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <circle cx="8.5" cy="10" r="1.5" />
                    <path d="M21 15l-5-5L5 19" />
                  </svg>
                </span>
                <span>Add Photos</span>
              </button>
            </div>
            <div className="mobile-tray-handle" aria-hidden="true" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Contextual Save Bar (Swipe Upward) */}
      <AnimatePresence>
        {activeOverlay === "save" && (
          <motion.div
            key="mobile-journal-save-sheet"
            className="mobile-journal-save-sheet mobile-journal-overlay-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Save journal page"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={springTransition}
          >
            <div className="mobile-save-handle" aria-hidden="true" />

            <button
              type="button"
              className="mobile-save-primary-btn"
              disabled={saving}
              onClick={() => {
                onSavePage();
              }}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              <span>{saving ? "Saving..." : "Save Journal Page"}</span>
            </button>

            <div className="mobile-save-status-line" role={autosaveStatus === "error" ? "alert" : "status"}>
              {autosaveStatus === "saving" && "Saving changes..."}
              {autosaveStatus === "saved" && "✓ Saved to your journal"}
              {autosaveStatus === "error" && "Unable to save right now. Tap above to retry."}
              {autosaveStatus === "idle" && `Page ${currentPageIndex + 1} of ${Math.max(totalPages, 1)}`}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
