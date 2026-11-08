"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { motion } from "framer-motion";
import {
  filterWrittenPages,
  loadSavedLetters,
  loadUserNotebooks,
} from "@/lib/journal-storage";
import { useAuth } from "@/hooks/useAuth";

export default function MyDeskPage() {
  const router = useRouter();
  const { user } = useAuth();

  const deskRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const notebookObjRef = useRef<HTMLDivElement>(null);
  const letterObjRef = useRef<HTMLDivElement>(null);

  const [journalSummary, setJournalSummary] = useState<{
    title: string;
    writtenPages: number;
    count: number;
  }>({
    title: "Volume I",
    writtenPages: 0,
    count: 1,
  });

  const [letterSummary, setLetterSummary] = useState<{
    latestTitle: string;
    latestRecipient: string;
    count: number;
  }>({
    latestTitle: "Words Kept in Quiet",
    latestRecipient: "A kindred spirit",
    count: 0,
  });

  // Load subtle real metadata from user's saved journals and letters
  useEffect(() => {
    const syncDeskMetadata = () => {
      try {
        const notebooks = loadUserNotebooks(user?.id);
        if (notebooks.length > 0) {
          const primary = notebooks[0];
          const totalWritten = notebooks.reduce(
            (acc, nb) => acc + filterWrittenPages(nb.paginas).length,
            0
          );
          setJournalSummary({
            title: primary.nome || "Volume I",
            writtenPages: totalWritten,
            count: notebooks.length,
          });
        }

        const letters = loadSavedLetters(user?.id);
        if (letters.length > 0) {
          const latest = letters[0];
          setLetterSummary({
            latestTitle: latest.titulo || "Untitled Letter",
            latestRecipient: latest.destinatario || "A kindred spirit",
            count: letters.length,
          });
        }
      } catch {
        // Fallback to defaults if localStorage is unavailable
      }
    };

    syncDeskMetadata();
    window.addEventListener("storage", syncDeskMetadata);
    window.addEventListener("entre-cartas:journal-updated", syncDeskMetadata);
    return () => {
      window.removeEventListener("storage", syncDeskMetadata);
      window.removeEventListener("entre-cartas:journal-updated", syncDeskMetadata);
    };
  }, [user?.id]);

  // Coordinated GSAP Entrance Sequence (Section 8)
  useEffect(() => {
    if (typeof window === "undefined" || !deskRef.current) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

      // 1. Wooden desk background appears
      if (bgRef.current) {
        tl.fromTo(
          bgRef.current,
          { opacity: 0, scale: 1.02 },
          { opacity: 1, scale: 1, duration: 0.85, ease: "power1.out" },
          0
        );
      }

      // 2. Antique journal notebook gently fades and settles onto the desk
      if (notebookObjRef.current) {
        tl.fromTo(
          notebookObjRef.current,
          { opacity: 0, y: 28, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.85, ease: "power3.out" },
          0.18
        );
      }

      // 3. Handwritten vintage letter appears with a slight delay
      if (letterObjRef.current) {
        tl.fromTo(
          letterObjRef.current,
          { opacity: 0, y: 28, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.85, ease: "power3.out" },
          0.34
        );
      }

      // 4. Supporting title and microcopy appear subtly
      if (headerRef.current) {
        tl.fromTo(
          headerRef.current,
          { opacity: 0, y: -12 },
          { opacity: 1, y: 0, duration: 0.75, ease: "power2.out" },
          0.48
        );
      }
    }, deskRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={deskRef}
      className="my-desk-sanctuary"
      aria-label="My Desk — Personal Literary Workspace"
    >
      {/* SVG Organic Wood Grain & Paper Texture Filter */}
      <svg
        aria-hidden="true"
        style={{ position: "absolute", width: 0, height: 0, pointerEvents: "none" }}
      >
        <filter id="desk-wood-grain" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.012 0.14"
            numOctaves="4"
            seed="11"
            result="woodNoise"
          />
          <feColorMatrix
            type="matrix"
            values="
              0.22 0 0 0 0.12
              0.13 0 0 0 0.07
              0.07 0 0 0 0.03
              0    0 0 0.16 0"
          />
        </filter>
      </svg>

      {/* 1. Full-Viewport Antique Wooden Writing Desk Surface */}
      <div ref={bgRef} className="my-desk-wood-surface" aria-hidden="true">
        <div className="my-desk-wood-grain-layer" />
        <div className="my-desk-plank-lines" />
        <div className="my-desk-sunlight-wash" />
        <div className="my-desk-vignette" />
        <div className="my-desk-brass-inlay" />
      </div>

      {/* 2. Minimal Page Title & Poetic Microcopy */}
      <header ref={headerRef} className="my-desk-header">
        <div className="my-desk-eyebrow-plate">
          <span className="my-desk-eyebrow-star" aria-hidden="true">✦</span>
          <span>PERSONAL SANCTUARY</span>
          <span className="my-desk-eyebrow-star" aria-hidden="true">✦</span>
        </div>
        <h1 className="my-desk-title">My Desk</h1>
        <p className="my-desk-intro">Your little corner of the world.</p>
        <p className="my-desk-sub">
          A place for thoughts, stories, and words worth keeping.
        </p>
      </header>

      {/* 3. Physical Objects Arranged on the Wooden Desk Surface */}
      <div className="my-desk-objects-stage">
        {/* ============================================================
            OBJECT 1 — REALISTIC ANTIQUE JOURNAL NOTEBOOK -> /journal
            ============================================================ */}
        <div ref={notebookObjRef} className="desk-object-slot desk-object-slot--journal">
          <motion.div
            className="desk-physical-notebook-wrapper"
            whileHover={{
              y: -7,
              rotate: 1.4,
              scale: 1.022,
            }}
            whileTap={{
              scale: 0.99,
              y: -2,
            }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 22,
            }}
          >
            <Link
              href="/journal"
              className="desk-notebook-object"
              aria-label="Open Journal — Notebook writing experience"
            >
              {/* Realistic multi-layered cast shadow on the wooden surface */}
              <span className="desk-notebook-cast-shadow" aria-hidden="true" />

              {/* Aged cream paper block thickness (right fore-edge & bottom edge) */}
              <span className="desk-notebook-pages-right" aria-hidden="true" />
              <span className="desk-notebook-pages-bottom" aria-hidden="true" />

              {/* Brass corner protectors */}
              <span className="desk-notebook-brass-corner corner-tr" aria-hidden="true" />
              <span className="desk-notebook-brass-corner corner-br" aria-hidden="true" />

              {/* Main Antique Leather Cover */}
              <div className="desk-notebook-leather-cover">
                {/* Raised Spine & Binding Ribs */}
                <div className="desk-notebook-spine" aria-hidden="true">
                  <span className="spine-rib" />
                  <span className="spine-rib" />
                  <span className="spine-rib" />
                  <span className="spine-rib" />
                  <span className="spine-rib" />
                </div>

                {/* Stitched Perimeter & Embossed Gold Frame */}
                <div className="desk-notebook-gold-frame">
                  <span className="gold-corner-ornament tl" aria-hidden="true">❧</span>
                  <span className="gold-corner-ornament tr" aria-hidden="true">❧</span>
                  <span className="gold-corner-ornament bl" aria-hidden="true">❧</span>
                  <span className="gold-corner-ornament br" aria-hidden="true">❧</span>

                  {/* Top Embossed Monogram */}
                  <div className="desk-notebook-embossed-header">
                    <span className="embossed-kicker">HARDBOUND VOLUME</span>
                    <span className="embossed-divider" aria-hidden="true">✦</span>
                  </div>

                  {/* Embedded Parchment Ex-Libris Bookplate */}
                  <div className="desk-notebook-bookplate">
                    <span className="bookplate-eyebrow">EX LIBRIS · PRIVATE JOURNAL</span>
                    <span className="bookplate-title">Journal</span>
                    <span className="bookplate-subtitle">{journalSummary.title}</span>
                    <span className="bookplate-meta">
                      {journalSummary.writtenPages > 0
                        ? `${journalSummary.writtenPages} ${
                            journalSummary.writtenPages === 1 ? "written page" : "written pages"
                          }`
                        : "Ruled archival pages"}
                    </span>
                  </div>

                  {/* Bottom Embossed Stamp */}
                  <div className="desk-notebook-embossed-footer">
                    <span>BETWEEN LETTERS · ARCHIVE</span>
                  </div>
                </div>
              </div>

              {/* Silk Bookmark Ribbon Draping Below the Notebook */}
              <span className="desk-notebook-silk-ribbon" aria-hidden="true" />
            </Link>

            {/* Subtle Physical Object Caption on the Desk */}
            <div className="desk-object-whisper">
              <button
                type="button"
                onClick={() => router.push("/journal")}
                className="desk-object-whisper-link"
              >
                <span className="whisper-name">Journal</span>
                <span className="whisper-sep" aria-hidden="true">·</span>
                <span className="whisper-action">Open Notebook →</span>
              </button>
            </div>
          </motion.div>
        </div>

        {/* ============================================================
            OBJECT 2 — HANDWRITTEN VINTAGE LETTER -> /letters
            ============================================================ */}
        <div ref={letterObjRef} className="desk-object-slot desk-object-slot--letter">
          <motion.div
            className="desk-physical-letter-wrapper"
            whileHover={{
              y: -7,
              rotate: -1.4,
              scale: 1.022,
            }}
            whileTap={{
              scale: 0.99,
              y: -2,
            }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 22,
            }}
          >
            <Link
              href="/letters"
              className="desk-letter-object"
              aria-label="Open Letters — Personal letter writing experience"
            >
              {/* Soft contact shadow on the wooden surface */}
              <span className="desk-letter-cast-shadow" aria-hidden="true" />

              {/* Tucked Vintage Kraft Postal Envelope Beneath the Letter */}
              <div className="desk-letter-under-envelope" aria-hidden="true">
                <div className="under-envelope-flap" />
                <div className="under-envelope-postmark">
                  <span>PAR AVION · VIA AIR MAIL</span>
                </div>
              </div>

              {/* Main Aged Cream Handwritten Stationery Sheet */}
              <div className="desk-letter-paper-sheet">
                {/* Subtle Manuscript Texture Overlay */}
                <div className="desk-letter-manuscript-wash" aria-hidden="true" />

                {/* Natural Tri-Fold Paper Crease Lines */}
                <div className="desk-letter-fold-crease crease-upper" aria-hidden="true" />
                <div className="desk-letter-fold-crease crease-lower" aria-hidden="true" />

                {/* Top Row: Fountain-Pen Date & Perforated Vintage Postage Stamp */}
                <div className="desk-letter-top-row">
                  <div className="desk-letter-date-block">
                    <span className="desk-letter-stationery-kicker">
                      PERSONAL CORRESPONDENCE
                    </span>
                    <span className="desk-letter-hand-date">
                      Quiet evening, by candlelight
                    </span>
                  </div>

                  {/* Vintage Perforated Postage Stamp & Postmark */}
                  <div className="desk-letter-postage-group" aria-hidden="true">
                    <div className="desk-letter-postmark-circle">
                      <span>ARCHIVE</span>
                      <span>1924</span>
                    </div>
                    <div className="desk-letter-stamp-box">
                      <div className="stamp-inner-frame">
                        <span className="stamp-country">POSTAGE</span>
                        <span className="stamp-emblem">✉</span>
                        <span className="stamp-value">5¢</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Handwritten Letter Content */}
                <div className="desk-letter-handwriting-body">
                  <p className="desk-letter-salutation">
                    To {letterSummary.latestRecipient},
                  </p>
                  <p className="desk-letter-script-paragraph">
                    Some words are meant to be written slowly, folded with care,
                    and kept where time cannot fade them.
                  </p>
                  <p className="desk-letter-script-paragraph secondary">
                    I am setting these lines down on paper so they may wait for
                    you whenever quiet returns...
                  </p>
                </div>

                {/* Bottom Row: Signature & Embossed Crimson Wax Seal */}
                <div className="desk-letter-bottom-row">
                  <div className="desk-letter-signature-block">
                    <span className="signature-closing">With warm remembrance,</span>
                    <span className="signature-title">Letters</span>
                    <span className="signature-meta">
                      {letterSummary.count > 0
                        ? `${letterSummary.count} ${
                            letterSummary.count === 1 ? "saved letter" : "saved letters"
                          } on your shelf`
                        : "Vintage stationery & wax seals"}
                    </span>
                  </div>

                  {/* Realistic 3D Crimson Wax Seal */}
                  <div className="desk-letter-wax-seal" aria-hidden="true">
                    <div className="wax-seal-inner-ring">
                      <span className="wax-seal-monogram">BL</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>

            {/* Subtle Physical Object Caption on the Desk */}
            <div className="desk-object-whisper">
              <button
                type="button"
                onClick={() => router.push("/letters")}
                className="desk-object-whisper-link"
              >
                <span className="whisper-name">Letters</span>
                <span className="whisper-sep" aria-hidden="true">·</span>
                <span className="whisper-action">Write a Letter →</span>
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
