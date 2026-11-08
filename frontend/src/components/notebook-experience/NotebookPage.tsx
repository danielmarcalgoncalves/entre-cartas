"use client";

import {
  type Notebook,
  type NotebookPage as StoredNotebookPage,
  getFontFamilyById,
  getInkColorById,
  getPaperColorById,
  getNotebookDates,
} from "@/lib/journal-storage";


import React, { type ReactNode } from "react";

export type PageSide = "left" | "right";
export type PageVariant = "ruled" | "parchment" | "linen" | "endpaper";

export interface NotebookPageProps {
  side: PageSide;
  pageNumber?: string;
  variant?: PageVariant;
  scale?: number;
  children: ReactNode;
  className?: string;
}

export const CANONICAL_PAGE_WIDTH = 380;
export const CANONICAL_PAGE_HEIGHT = 514;

/**
 * Reusable physical sheet container for each independent page composition.
 * Preserves aspect-ratio layout across desktop, tablet, and mobile viewports without scroll.
 */
export function NotebookPage({
  side,
  pageNumber,
  variant = "ruled",
  scale = 1,
  children,
  className = "",
}: NotebookPageProps) {
  return (
    <div
      className={`nb-page nb-page--${side} nb-page--${variant} ${className}`}
    >
      {/* Scaled canonical canvas so rich scrapbook compositions never overflow on smaller screens */}
      <div
        className="nb-page__canvas"
        style={{
          width: `${CANONICAL_PAGE_WIDTH}px`,
          height: `${CANONICAL_PAGE_HEIGHT}px`,
          transform: `scale(${scale})`,
        }}
      >
        <div className="nb-page__inner">{children}</div>

        {pageNumber && (
          <span
            className={`nb-page__folio nb-page__folio--${side}`}
            aria-hidden="true"
          >
            {pageNumber}
          </span>
        )}
      </div>

      {/* Physical spine gutter crease & paper grain overlays */}
      <div
        className={`nb-page__gutter nb-page__gutter--${side}`}
        aria-hidden="true"
      />
      <div className="nb-page__grain" aria-hidden="true" />
    </div>
  );
}

/* ============================================================================
 * INDEPENDENT PAGE COMPOSITIONS (8 FACES = 4 FULL SPREADS)
 * ============================================================================ */

/**
 * Spread 0 · Left Page (Inside Front Cover — Ex-Libris & Botanical Frontispiece)
 */
export function FrontispiecePage() {
  return (
    <div className="nb-comp nb-comp--frontispiece">
      <div className="nb-bookplate">
        <span className="nb-washi nb-washi--top" aria-hidden="true" />

        <div className="nb-bookplate__border">
          <span className="nb-kicker">EX LIBRIS · ARCHIVE VOLUME I</span>

          {/* Hand-drawn botanical chamomile & olive sprig SVG */}
          <svg
            className="nb-botanical-crest nb-float-slow"
            viewBox="0 0 120 76"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M60 68C60 50 59 34 60 16"
              stroke="#5b533b"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <path
              d="M60 52C48 48 39 40 34 30M60 44C72 39 81 32 86 22M60 60C49 58 42 54 36 48"
              stroke="#6d6549"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            {/* Chamomile blossom */}
            <g transform="translate(60, 16)">
              <ellipse cx="0" cy="-9" rx="3" ry="6" fill="#fbf7ee" stroke="#9e8c6c" strokeWidth="0.8" />
              <ellipse cx="0" cy="9" rx="3" ry="6" fill="#fbf7ee" stroke="#9e8c6c" strokeWidth="0.8" />
              <ellipse cx="-9" cy="0" rx="6" ry="3" fill="#fbf7ee" stroke="#9e8c6c" strokeWidth="0.8" />
              <ellipse cx="9" cy="0" rx="6" ry="3" fill="#fbf7ee" stroke="#9e8c6c" strokeWidth="0.8" />
              <ellipse cx="-6.5" cy="-6.5" rx="4.5" ry="2.6" transform="rotate(45 -6.5 -6.5)" fill="#fbf7ee" stroke="#9e8c6c" strokeWidth="0.8" />
              <ellipse cx="6.5" cy="-6.5" rx="4.5" ry="2.6" transform="rotate(-45 6.5 -6.5)" fill="#fbf7ee" stroke="#9e8c6c" strokeWidth="0.8" />
              <ellipse cx="-6.5" cy="6.5" rx="4.5" ry="2.6" transform="rotate(-45 -6.5 6.5)" fill="#fbf7ee" stroke="#9e8c6c" strokeWidth="0.8" />
              <ellipse cx="6.5" cy="6.5" rx="4.5" ry="2.6" transform="rotate(45 6.5 6.5)" fill="#fbf7ee" stroke="#9e8c6c" strokeWidth="0.8" />
              <circle cx="0" cy="0" r="4.8" fill="#cfa96f" stroke="#8a6836" strokeWidth="0.9" />
            </g>
          </svg>

          <h2 className="nb-serif-heading">Between Letters</h2>
          <p className="nb-bookplate__motto">
            This volume belongs to the slower hours — kept for honest mornings,
            unsent confessions, and memories too tender to rush.
          </p>

          <div className="nb-signature-line">
            <span className="nb-signature-label">KEEPER OF PAGES</span>
            <span className="nb-hand-script nb-signature-script">
              A quiet correspondent
            </span>
          </div>

          <div className="nb-stamp-row">
            <span className="nb-ink-postmark">HAND-BOUND · SLOW WRITING</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Spread 0 · Right Page (Page 01 — Morning Light & First Lines)
 */
export function MorningWindowPage() {
  return (
    <div className="nb-comp nb-comp--morning">
      <header className="nb-entry-head">
        <span className="nb-entry-date">OCTOBER 14 · 07:15 AM</span>
        <span className="nb-entry-weather">☼ Crisp Autumn Air</span>
      </header>

      <h3 className="nb-hand-title">The Window at Seven</h3>

      <div className="nb-polaroid-float nb-polaroid-float--right">
        <span className="nb-washi nb-washi--tilt" aria-hidden="true" />
        <div className="nb-mini-polaroid">
          <div className="nb-mini-polaroid__img-wrap">
            <img
              src="/images/botanical-wide.jpg"
              alt="Pressed botanicals beside morning light"
              draggable={false}
            />
          </div>
          <span className="nb-mini-polaroid__cap">first light on the desk</span>
        </div>
      </div>

      <div className="nb-hand-body">
        <p>
          The kettle began to hum before the rest of the street woke up. I
          pulled the wooden chair closer to the window just to watch the pale
          amber light settle across the table.
        </p>
        <p>
          How strange that our most permanent memories are rarely the grand
          announcements — they are the quiet pauses nobody else witnessed.
        </p>
      </div>

      <div className="nb-torn-quote">
        <p>“To write is to live twice: in the moment, and in hindsight.”</p>
      </div>

      <div className="nb-page-foot-meta">
        <span className="nb-tag-chip">#MorningRitual</span>
        <span className="nb-tag-chip">#FountainInk</span>
      </div>
    </div>
  );
}

/**
 * Spread 1 · Left Page (Page 02 — Pressed Petals & Manuscript Fragment)
 */
export function PressedBotanicalsPage() {
  return (
    <div className="nb-comp nb-comp--botanicals">
      <div className="nb-specimen-header">
        <span className="nb-typewriter-tag">HERBARIUM &amp; EPHEMERA · NO. 02</span>
        <span className="nb-wax-medallion" aria-hidden="true">
          BL
        </span>
      </div>

      {/* Mounted vintage manuscript clipping with photo corners */}
      <div className="nb-mounted-clipping">
        <span className="nb-photo-corner nb-photo-corner--tl" />
        <span className="nb-photo-corner nb-photo-corner--tr" />
        <span className="nb-photo-corner nb-photo-corner--bl" />
        <span className="nb-photo-corner nb-photo-corner--br" />
        <img
          src="/images/manuscrito-pixabay.jpg"
          alt="Aged handwritten manuscript fragment"
          className="nb-mounted-clipping__img"
          draggable={false}
        />
      </div>

      {/* Illustrated Herbarium sprig + taped label */}
      <div className="nb-herbarium-card">
        <svg
          className="nb-herbarium-svg"
          viewBox="0 0 90 90"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M26 78C36 58 49 38 64 14"
            stroke="#514c34"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <ellipse cx="44" cy="46" rx="8" ry="3.2" transform="rotate(-35 44 46)" fill="#7d8461" opacity="0.85" />
          <ellipse cx="53" cy="34" rx="7.5" ry="3" transform="rotate(25 53 34)" fill="#6b7351" opacity="0.85" />
          <ellipse cx="36" cy="60" rx="8.5" ry="3.2" transform="rotate(20 36 60)" fill="#7d8461" opacity="0.85" />
          <ellipse cx="56" cy="22" rx="6" ry="2.5" transform="rotate(-40 56 22)" fill="#8e9472" />
          {/* Tiny tape across stem */}
          <rect
            x="33"
            y="50"
            width="22"
            height="7"
            rx="1"
            transform="rotate(28 33 50)"
            fill="#e6d7b8"
            opacity="0.82"
            stroke="#bfa982"
            strokeWidth="0.6"
          />
        </svg>

        <div className="nb-herbarium-notes">
          <h4 className="nb-serif-sub">Pressed Along the Walk Home</h4>
          <p className="nb-hand-small">
            Tucked between pages 18 &amp; 19 after the rain cleared. Even dry
            leaves remember the season that shaped them.
          </p>
        </div>
      </div>

      <p className="nb-typewriter-footnote">
        ✦ INK ON AGED COTTON FIBERS PRESERVES THE CADENCE OF THE HAND.
      </p>
    </div>
  );
}

/**
 * Spread 1 · Right Page (Page 03 — Secret Correspondence & Leather Folders)
 */
export function SecretCorrespondencePage() {
  return (
    <div className="nb-comp nb-comp--correspondence">
      <div className="nb-paperclip-top" aria-hidden="true">
        <svg width="22" height="46" viewBox="0 0 22 46" fill="none">
          <path
            d="M6 12V34C6 38.4 9.6 42 14 42C18.4 42 21 38.4 21 34V10C21 4.8 16.8 1 11.5 1C6.2 1 2 4.8 2 10V31"
            stroke="#9a7b4f"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <span className="nb-kicker">EPISTOLARY ARCHIVE · SEALED LETTERS</span>
      <h3 className="nb-serif-page-title">Words Meant for Envelopes</h3>

      {/* Miniature tactile envelope illustration */}
      <div className="nb-mini-envelope-card">
        <div className="nb-mini-envelope">
          <div className="nb-mini-envelope__flap" />
          <span className="nb-mini-envelope__seal">✦</span>
          <span className="nb-mini-envelope__postmark">SLOW MAIL</span>
        </div>
        <div className="nb-mini-envelope-caption">
          <p className="nb-typewriter-quote">
            “Some confessions belong in a sealed envelope, shielded from the
            rush of timelines.”
          </p>
        </div>
      </div>

      <p className="nb-hand-paragraph">
        Letters written here can be folded, stamped with affective postmarks,
        and organized inside three-dimensional correspondence folders:
      </p>

      {/* Three allowed leather color swatches matching AGENTS.md */}
      <div className="nb-leather-swatches">
        <div className="nb-swatch">
          <span className="nb-swatch__chip nb-swatch__chip--brown" />
          <span className="nb-swatch__name">Rustic Brown</span>
        </div>
        <div className="nb-swatch">
          <span className="nb-swatch__chip nb-swatch__chip--green" />
          <span className="nb-swatch__name">Botanical Moss</span>
        </div>
        <div className="nb-swatch">
          <span className="nb-swatch__chip nb-swatch__chip--wine" />
          <span className="nb-swatch__name">Noble Burgundy</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Spread 2 · Left Page (Page 04 — Dusk Cinema & Twilight Woods)
 */
export function DuskReflectionsPage() {
  return (
    <div className="nb-comp nb-comp--dusk">
      <div className="nb-dusk-top-row">
        <span className="nb-ticket-stub">ADMIT ONE · QUIET MEMORY</span>
        <span className="nb-star-cluster" aria-hidden="true">
          ✦ ✳ ✦
        </span>
      </div>

      <div className="nb-darkroom-print">
        <span className="nb-washi nb-washi--center" aria-hidden="true" />
        <div className="nb-darkroom-print__frame">
          <img
            src="/images/nova-ui/sunset-trees-bg.jpg"
            alt="Twilight amber sky through forest silhouettes"
            draggable={false}
          />
        </div>
        <div className="nb-darkroom-print__meta">
          <span>FILM STILL IV</span>
          <span>18:42 · TWILIGHT WOODS</span>
        </div>
      </div>

      <blockquote className="nb-literary-callout">
        “Beauty hides in the smallest details of the ordinary day — waiting only
        for someone unhurried enough to notice.”
      </blockquote>

      <p className="nb-hand-small">
        The sky turned copper behind the pines for barely four minutes. Enough
        time to remember an old conversation word for word.
      </p>
    </div>
  );
}

/**
 * Spread 2 · Right Page (Page 05 — Chamomile Meadow & Gentle Forgiveness)
 */
export function MeadowKeepsakePage() {
  return (
    <div className="nb-comp nb-comp--meadow">
      <header className="nb-entry-head">
        <span className="nb-entry-date">LATE AFTERNOON · FIELD NOTES</span>
        <span className="nb-ink-badge">KEEP TENDERLY</span>
      </header>

      <div className="nb-meadow-row">
        <div className="nb-mini-polaroid nb-mini-polaroid--tilted-left">
          <div className="nb-mini-polaroid__img-wrap">
            <img
              src="/images/nova-ui/chamomile-meadow-bg.jpg"
              alt="Wild chamomile meadow in warm sunlight"
              draggable={false}
            />
          </div>
          <span className="nb-mini-polaroid__cap">wildflowers in June</span>
        </div>

        <div className="nb-meadow-side-note">
          {/* Fountain pen nib SVG */}
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M16 3L23 17L19 28H13L9 17L16 3Z"
              stroke="#4a3726"
              strokeWidth="1.4"
              fill="#efe3cc"
            />
            <path d="M16 3V16" stroke="#4a3726" strokeWidth="1.2" />
            <circle cx="16" cy="17.5" r="1.8" fill="#4a3726" />
          </svg>
          <span className="nb-hand-caption">
            Written with archival sepia ink on mellow parchment.
          </span>
        </div>
      </div>

      <div className="nb-hand-body">
        <p>
          Even our discarded thoughts are treated gently here — resting in the
          postal bin until we choose to restore them to their folder or let them
          go in peace.
        </p>
        <p>
          <mark className="nb-pollen-highlight">
            Nothing written from the heart is ever truly wasted.
          </mark>
        </p>
      </div>
    </div>
  );
}

/**
 * Spread 3 · Left Page (Page 06 — A Blank Sheet Waiting for Your Hand)
 */
export function AwaitingYourHandPage() {
  return (
    <div className="nb-comp nb-comp--blank-invite">
      <header className="nb-entry-head">
        <span className="nb-entry-date">TODAY · YOUR FIRST ENTRY</span>
        <span className="nb-entry-weather">PAGE 01 OF YOUR VOLUME</span>
      </header>

      <h3 className="nb-hand-title">Where Your Own Words Begin...</h3>

      <div className="nb-live-writing-preview">
        <p className="nb-hand-live-line">
          Dear future self, today I decided to slow down and keep what matters
          <span className="nb-ink-caret" aria-hidden="true" />
        </p>
      </div>

      <div className="nb-blank-ruled-spacer" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className="nb-desk-specs-box">
        <span className="nb-typewriter-tag">WRITING DESK SPECIFICATIONS</span>
        <p className="nb-specs-copy">
          Fourteen ruled lines per sheet · Four tactile papers · Four fountain
          inks · Automatic saving of every written page.
        </p>
      </div>
    </div>
  );
}

/**
 * Spread 3 · Right Page (Page 07 — Colophon & Final Invitation)
 */
export function ColophonSanctuaryPage() {
  return (
    <div className="nb-comp nb-comp--colophon">
      <div className="nb-colophon-frame">
        <span className="nb-colophon-ornament" aria-hidden="true">
          ❧
        </span>
        <span className="nb-kicker">COLOPHON · THE WRITING DESK</span>
        <h3 className="nb-serif-heading">Your Sanctuary Awaits</h3>

        <ul className="nb-colophon-list">
          <li>
            <strong>I. Hardbound Leather Volumes</strong>
            <span>Pure artisan covers embossed in gold with silk ribbons.</span>
          </li>
          <li>
            <strong>II. Sealed Correspondence</strong>
            <span>Fold personal letters into 3D leather folders.</span>
          </li>
          <li>
            <strong>III. Unhurried Privacy</strong>
            <span>No metrics, no noise — only paper that listens.</span>
          </li>
        </ul>

        <div className="nb-colophon-cta-whisper">
          <span className="nb-hand-script">
            Open your own volume just below ↓
          </span>
        </div>
      </div>
    </div>
  );
}

export default NotebookPage;

/* ============================================================================
 * REAL USER JOURNAL PAGE RENDERERS — DATA INTEGRATION
 * ============================================================================ */

export interface JournalUserPageProps {
  page: StoredNotebookPage;
  pageNumber: string;
  side: PageSide;
  notebookName: string;
}

/**
 * Renders the EXACT user content of a saved journal page on a physical sheet.
 * Faithfully preserves written text, titles, dates, fonts, inks, paper tones,
 * favorited wax seals, and attached photographs.
 */
export function JournalUserPage({
  page,
  pageNumber,
  side,
  notebookName,
}: JournalUserPageProps) {
  const paperColor = getPaperColorById(page.tipoPapel);
  const inkColor = getInkColorById(page.corTinta);
  const fontFamily = getFontFamilyById(page.fonte || "caveat");

  // Extract attached photo/polaroid if present in content or properties
  let imageUrl: string | null = (page as any).polaroid_url || null;
  let imageCaption: string | null = (page as any).polaroid_legenda || null;
  let cleanContent = page.conteudo || "";

  const markdownImgMatch = cleanContent.match(/!\[(.*?)\]\((.*?)\)/);
  if (markdownImgMatch) {
    if (!imageUrl) {
      imageUrl = markdownImgMatch[2];
      imageCaption = markdownImgMatch[1] || null;
    }
    cleanContent = cleanContent.replace(/!\[(.*?)\]\((.*?)\)/g, "").trim();
  }

  const hasContent = cleanContent.trim().length > 0;
  const hasTitle = Boolean(page.titulo && page.titulo.trim().length > 0);

  return (
    <div
      className="nb-user-entry-page"
      style={{
        backgroundColor: paperColor,
        color: inkColor,
      }}
    >
      {/* Subtle ruled notebook lines */}
      <div className="nb-user-ruled-lines" aria-hidden="true">
        {Array.from({ length: 14 }).map((_, i) => (
          <span key={i} className="nb-user-rule-line" />
        ))}
      </div>

      <div className="nb-user-entry-content">
        {/* Top Header: Date & Favorited Wax Heart Stamp */}
        <div className="nb-user-entry-header">
          <span className="nb-user-entry-date">
            {page.dataFormatada || "Recorded Entry"}
          </span>
          {page.favoritado && (
            <span className="nb-user-favorite-stamp" title="Favorited entry in your archive">
              ♥ FAVORITED
            </span>
          )}
        </div>

        {/* Entry Title */}
        {hasTitle && (
          <h3
            className="nb-user-entry-title"
            style={{
              fontFamily: fontFamily.includes("cursive") ? "'Cormorant Garamond', Georgia, serif" : fontFamily,
              color: inkColor,
            }}
          >
            {page.titulo}
          </h3>
        )}

        {/* Optional Attached Polaroid Photograph */}
        {imageUrl && (
          <div className={`nb-user-polaroid-wrap ${side === "left" ? "nb-user-polaroid--left" : "nb-user-polaroid--right"}`}>
            <div className="nb-mini-polaroid">
              <span className="nb-washi nb-washi--top" aria-hidden="true" />
              <div className="nb-mini-polaroid__img-wrap">
                <img src={imageUrl} alt={imageCaption || "Journal photograph"} loading="lazy" />
              </div>
              {imageCaption && <span className="nb-mini-polaroid__cap">{imageCaption}</span>}
            </div>
          </div>
        )}

        {/* Written Journal Text */}
        <div
          className="nb-user-entry-body"
          style={{
            fontFamily,
            color: inkColor,
          }}
        >
          {hasContent ? (
            cleanContent
          ) : (
            <em className="nb-user-entry-empty">
              This page contains no written text yet.
            </em>
          )}
        </div>

        {/* Page Footer Folio */}
        <div className="nb-user-entry-footer">
          <span className="nb-user-volume-tag">VOL · {notebookName}</span>
          <span className="nb-user-page-folio">P. {pageNumber}</span>
        </div>
      </div>
    </div>
  );
}

export interface JournalFrontispiecePageProps {
  notebook: Notebook;
}

/**
 * Dedicated Frontispiece / Ex-Libris plate for the user's saved journal volume.
 */
export function JournalFrontispiecePage({ notebook }: JournalFrontispiecePageProps) {
  const dates = getNotebookDates(notebook);
  const writtenCount = (notebook.paginas || []).filter(
    (p) => Boolean(p.conteudo && p.conteudo.trim().length > 0) || Boolean(p.titulo && p.titulo.trim().length > 0)
  ).length;

  return (
    <div className="nb-comp nb-comp--frontispiece">
      <div className="nb-bookplate">
        <span className="nb-washi nb-washi--top" aria-hidden="true" />

        <div className="nb-bookplate__border">
          <span className="nb-kicker">EX LIBRIS · PERSONAL VOLUME</span>

          {/* Chamomile & olive sprig crest */}
          <svg
            className="nb-botanical-crest nb-float-slow"
            viewBox="0 0 120 76"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M60 68C60 50 59 34 60 16"
              stroke="#5b533b"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <path
              d="M60 52C48 48 39 40 34 30M60 44C72 39 81 32 86 22M60 60C49 58 42 54 36 48"
              stroke="#6d6549"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            <g transform="translate(60, 16)">
              <ellipse cx="0" cy="-9" rx="3" ry="6" fill="#fbf7ee" stroke="#9e8c6c" strokeWidth="0.8" />
              <ellipse cx="0" cy="9" rx="3" ry="6" fill="#fbf7ee" stroke="#9e8c6c" strokeWidth="0.8" />
              <ellipse cx="-9" cy="0" rx="6" ry="3" fill="#fbf7ee" stroke="#9e8c6c" strokeWidth="0.8" />
              <ellipse cx="9" cy="0" rx="6" ry="3" fill="#fbf7ee" stroke="#9e8c6c" strokeWidth="0.8" />
              <ellipse cx="-6.5" cy="-6.5" rx="4.5" ry="2.6" transform="rotate(45 -6.5 -6.5)" fill="#fbf7ee" stroke="#9e8c6c" strokeWidth="0.8" />
              <ellipse cx="6.5" cy="-6.5" rx="4.5" ry="2.6" transform="rotate(-45 6.5 -6.5)" fill="#fbf7ee" stroke="#9e8c6c" strokeWidth="0.8" />
              <ellipse cx="-6.5" cy="6.5" rx="4.5" ry="2.6" transform="rotate(-45 -6.5 6.5)" fill="#fbf7ee" stroke="#9e8c6c" strokeWidth="0.8" />
              <ellipse cx="6.5" cy="6.5" rx="4.5" ry="2.6" transform="rotate(45 6.5 6.5)" fill="#fbf7ee" stroke="#9e8c6c" strokeWidth="0.8" />
              <circle cx="0" cy="0" r="4.8" fill="#cfa96f" stroke="#8a6836" strokeWidth="0.9" />
            </g>
          </svg>

          <h2 className="nb-serif-heading">{notebook.nome}</h2>
          <p className="nb-bookplate__motto">
            This private volume holds authentic thoughts, unhurried memories,
            and personal reflections recorded in Between Letters.
          </p>

          <div className="nb-signature-line">
            <span className="nb-signature-label">CHRONICLE BOUND</span>
            <span className="nb-hand-script nb-signature-script">
              {writtenCount} {writtenCount === 1 ? "page recorded" : "pages recorded"}
            </span>
          </div>

          <div className="nb-stamp-row">
            <span className="nb-ink-postmark">
              BEGUN: {dates.created.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export interface JournalColophonPageProps {
  notebook: Notebook;
  onContinueWriting?: () => void;
  onBackToShelf?: () => void;
}

/**
 * Sanctuary closing plate at the end of the user's journal volume.
 */
export function JournalColophonPage({
  notebook,
  onContinueWriting,
  onBackToShelf,
}: JournalColophonPageProps) {
  const dates = getNotebookDates(notebook);
  const writtenCount = (notebook.paginas || []).filter(
    (p) => Boolean(p.conteudo && p.conteudo.trim().length > 0) || Boolean(p.titulo && p.titulo.trim().length > 0)
  ).length;

  return (
    <div className="nb-comp nb-comp--colophon">
      <div className="nb-colophon-frame">
        <span className="nb-colophon-ornament" aria-hidden="true">
          ❧
        </span>
        <span className="nb-kicker">COLOPHON · PERSONAL ARCHIVE</span>
        <h3 className="nb-serif-heading">{notebook.nome}</h3>

        <ul className="nb-colophon-list">
          <li>
            <strong>I. Archival Record</strong>
            <span>
              {writtenCount} {writtenCount === 1 ? "page" : "pages"} preserved in this volume.
            </span>
          </li>
          <li>
            <strong>II. Last Chronicle</strong>
            <span>Recorded on {dates.updated}.</span>
          </li>
          <li>
            <strong>III. Personal Sanctuary</strong>
            <span>Saved permanently in your private browser archive.</span>
          </li>
        </ul>

        <div className="nb-colophon-actions-row">
          {onContinueWriting && (
            <button
              type="button"
              className="nb-colophon-btn nb-colophon-btn--primary"
              onClick={onContinueWriting}
            >
              <span>Continue Writing ✎</span>
            </button>
          )}
          {onBackToShelf && (
            <button
              type="button"
              className="nb-colophon-btn"
              onClick={onBackToShelf}
            >
              <span>Back to My Shelf ↗</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export interface JournalEmptyPromptPageProps {
  notebook: Notebook;
  onContinueWriting?: () => void;
}

/**
 * Shown on Page 1 if the journal has not yet received written text.
 */
export function JournalEmptyPromptPage({
  notebook,
  onContinueWriting,
}: JournalEmptyPromptPageProps) {
  return (
    <div className="nb-comp nb-comp--first-lines">
      <div className="nb-ruled-sheet">
        <div className="nb-ruled-sheet__lines" aria-hidden="true">
          {Array.from({ length: 14 }).map((_, i) => (
            <span key={i} />
          ))}
        </div>

        <div className="nb-date-stamp">
          <span className="nb-date-stamp__day">PAGE 01</span>
          <span className="nb-date-stamp__meta">AWAITING FIRST WORDS</span>
        </div>

        <h3 className="nb-sheet-title">Your story begins here.</h3>

        <p className="nb-sheet-paragraph nb-hand-script" style={{ fontSize: "20px", lineHeight: "34px", color: "#3a2d21" }}>
          This volume has been bound and awaits your honest thoughts.
          Sit down with your favorite beverage, let the quiet settle in,
          and begin your first entry.
        </p>

        {onContinueWriting && (
          <div style={{ marginTop: "24px" }}>
            <button
              type="button"
              className="nb-colophon-btn nb-colophon-btn--primary"
              onClick={onContinueWriting}
              style={{ padding: "10px 18px", fontSize: "13px" }}
            >
              <span>Start Writing on the Desk ✎</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}