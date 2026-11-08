"use client";

import React, { useRef } from "react";
import { type NotebookColorOption, getNotebookTheme } from "@/lib/journal-storage";

export interface ClosedNotebookProps {
  isClosed: boolean;
  isAnimating: boolean;
  onOpen: () => void;
  onHoverTilt?: (rotX: number, rotY: number, isHovering: boolean) => void;
  notebookTitle?: string;
  notebookColor?: string;
  theme?: NotebookColorOption;
  createdDate?: string;
  totalPages?: number;
}

/**
 * Pure CSS Artisan Leather Cover adapting dynamically to user-selected color
 * (Rustic Brown, Botanical Green, Noble Burgundy, Obsidian Black).
 * Features perimeter saddle stitching, embossed gold framing, raised spine hubs,
 * central gold foil medallion, dynamic journal title, and silk bookmark ribbon.
 */
export function ClosedNotebook({
  isClosed,
  isAnimating,
  onOpen,
  onHoverTilt,
  notebookTitle = "Between Letters",
  notebookColor,
  theme: explicitTheme,
  createdDate,
  totalPages,
}: ClosedNotebookProps) {
  const rafRef = useRef<number | null>(null);
  const theme = explicitTheme || getNotebookTheme(notebookColor);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isClosed || isAnimating || !onHoverTilt) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 .. 0.5
    const ny = (e.clientY - rect.top) / rect.height - 0.5; // -0.5 .. 0.5

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      onHoverTilt(ny * -5, nx * 6, true);
    });
  };

  const handleMouseLeave = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (onHoverTilt && isClosed && !isAnimating) {
      onHoverTilt(0, 0, false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!isClosed || isAnimating) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen();
    }
  };

  const displayTitle = notebookTitle?.trim() || "Between Letters";

  return (
    <button
      type="button"
      className={`nb-leather-cover nb-leather-cover--${theme.id} ${
        isClosed ? "nb-leather-cover--interactive" : "nb-leather-cover--opened"
      }`}
      onClick={() => {
        if (isClosed && !isAnimating) {
          onOpen();
        }
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
      disabled={!isClosed || isAnimating}
      aria-label={`Closed leather journal "${displayTitle}" — Click to open and read`}
      title={isClosed ? `Click to open "${displayTitle}"` : undefined}
    >
      {/* Subtle organic leather grain & aged patina */}
      <span className="nb-leather-cover__grain" aria-hidden="true" />
      <span className="nb-leather-cover__sheen" aria-hidden="true" />

      {/* Perimeter saddle stitching contouring the outer cover border */}
      <span className="nb-leather-cover__edge-stitch" aria-hidden="true" />

      {/* Left bound spine band, raised ribs, and binding seam */}
      <span className="nb-leather-cover__spine-band" aria-hidden="true">
        <span className="nb-spine-rib nb-spine-rib--1" />
        <span className="nb-spine-rib nb-spine-rib--2" />
        <span className="nb-spine-rib nb-spine-rib--3" />
        <span className="nb-spine-rib nb-spine-rib--4" />
        <span className="nb-spine-stitch" />
      </span>

      {/* Double embossed gold frame with corner ornaments */}
      <span className="nb-leather-cover__gold-frame" aria-hidden="true">
        <span className="nb-gold-corner nb-gold-corner--tl" />
        <span className="nb-gold-corner nb-gold-corner--tr" />
        <span className="nb-gold-corner nb-gold-corner--bl" />
        <span className="nb-gold-corner nb-gold-corner--br" />

        {/* Central embossed cartouche */}
        <span className="nb-leather-cover__cartouche">
          <span className="nb-cover-kicker">
            {theme.etiqueta.toUpperCase()} · ARCHIVE
          </span>

          {/* Gold-stamped wax/botanical medallion SVG */}
          <svg
            className="nb-cover-emblem"
            viewBox="0 0 84 84"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="42"
              cy="42"
              r="36"
              stroke="rgba(218, 179, 112, 0.68)"
              strokeWidth="1"
              strokeDasharray="2.5 2.5"
            />
            <circle
              cx="42"
              cy="42"
              r="30"
              stroke="rgba(218, 179, 112, 0.85)"
              strokeWidth="1.2"
            />
            {/* Delicate quill & olive branch */}
            <path
              d="M28 55C35 44 45 33 57 24C54 36 46 46 34 52"
              stroke="rgba(232, 198, 138, 0.9)"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M26 57L36 49"
              stroke="rgba(232, 198, 138, 0.9)"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
            <circle cx="42" cy="20" r="1.8" fill="rgba(232, 198, 138, 0.85)" />
            <circle cx="42" cy="64" r="1.8" fill="rgba(232, 198, 138, 0.85)" />
          </svg>

          <span className="nb-cover-title">{displayTitle}</span>
          <span className="nb-cover-rule" />
          <span className="nb-cover-subtitle">
            Personal Memory &amp; Reflection Volume
          </span>
          <span className="nb-cover-edition">
            {typeof totalPages === "number" && totalPages > 0
              ? `${totalPages} ${totalPages === 1 ? "PAGE" : "PAGES"} RECORDED · ARCHIVAL EDITION`
              : createdDate
              ? `BOUND ${createdDate.toUpperCase()}`
              : "HAND-BOUND PERSONAL EDITION"}
          </span>
        </span>
      </span>

      {/* Silk bookmark ribbon in matching theme color peeking from bottom edge */}
      <span
        className={`nb-silk-ribbon nb-silk-ribbon--${theme.id}`}
        style={{ backgroundColor: theme.ribbonColor }}
        aria-hidden="true"
      />
    </button>
  );
}

export default ClosedNotebook;
