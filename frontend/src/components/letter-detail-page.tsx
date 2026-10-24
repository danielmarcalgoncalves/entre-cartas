"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { getCategory, getLetter } from "@/lib/letters";
import { folders } from "@/lib/folders";
import { useArchive } from "@/components/archive-store";
import { CategoryLabel, Paper, Polaroid, Stamp, Sticker, Tape } from "@/components/paper-kit";

export function LetterDetailPage({ id }: { id: string }) {
  const letter = getLetter(id);
  const { isSaved, toggleSaved, moveToFolder, folderById } = useArchive();
  const [notice, setNotice] = useState("");
  const [filingFolder, setFilingFolder] = useState<string | null>(null);
  const saved = letter ? isSaved(letter.id) : false;
  const category = letter ? getCategory(letter.category) : undefined;
  const filingTarget = folders.find((folder) => folder.id === filingFolder);

  if (!letter) {
    return (
      <main className="site-main not-found-paper">
        <span aria-hidden="true">✉</span>
        <h1>This letter has not yet arrived.</h1>
        <Link href="/discover">Return to archive ↗</Link>
      </main>
    );
  }

  const handleSave = () => {
    toggleSaved(letter.id);
    setNotice(saved ? "The letter returned to the desk." : "A red stamp marked this letter as archived.");
  };

  return (
    <main className="site-main detail-page">
      <div className="page-ribbon">
        <Link href="/">HOME</Link>
        <span> / </span>
        <Link href="/discover">THE ARCHIVE</Link>
        <span> / </span>
        <span>{category?.name.toLocaleUpperCase("en-US")}</span>
      </div>

      <div className="detail-back">
        <Link href="/discover">← Back to other letters</Link>
        <span className="reading-time">{letter.readingTime}</span>
      </div>

      <section className="scrapbook-detail" aria-labelledby="letter-title">
        <aside className="detail-margin detail-margin--left" aria-label="Scrapbook margin notes">
          <span className="margin-star">✳</span>
          <p>one thing<br />at a time</p>
          <span className="margin-line" />
          <span className="margin-date">ARCHIVE<br />NO. {letter.id.slice(0, 2).toUpperCase()}</span>
        </aside>

        <motion.article
          className="letter-sheet"
          initial={{ opacity: 0, y: 14, rotate: -0.35 }}
          animate={{ opacity: 1, y: 0, rotate: -0.35 }}
          transition={{ duration: 0.5 }}
        >
          <Tape className="letter-sheet__tape" />
          <div className="letter-sheet__topline">
            <span>BETWEEN LETTERS · UNADDRESSED CORRESPONDENCE</span>
            <span>✦</span>
          </div>

          <div className="letter-sheet__address">
            <CategoryLabel categoryId={letter.category} />
            <span>{letter.date}</span>
          </div>

          <h1 id="letter-title">{letter.title}</h1>

          <p className="letter-sheet__greeting">Dear soul,</p>

          <div className="letter-content">
            {letter.content.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>

          <p className="letter-sheet__farewell">With affection,</p>
          <p className="letter-sheet__signature">{letter.sender}</p>
          <span className="letter-sheet__folio">— 01 —</span>

          <AnimatePresence>
            {saved && (
              <motion.span
                className="letter-sheet__archive-stamp"
                initial={{ scale: 2.1, rotate: 7, opacity: 0 }}
                animate={{ scale: 1, rotate: 7, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
              >
                ARCHIVED<br />
                <small>IN YOUR ARCHIVE</small>
              </motion.span>
            )}
          </AnimatePresence>
        </motion.article>

        <aside className="detail-margin detail-margin--right" aria-label="Archive reminder">
          <Sticker className="detail-sticker">keep<br />what lasts</Sticker>
          <Polaroid
            className="detail-polaroid"
            src="/images/manuscrito-pixabay.jpg"
            alt="Old manuscript page preserved in time"
            caption="kept clipping"
          />
          <Stamp className="detail-postmark">
            ✧<small>NO EXPIRATION<br />DATE</small>
          </Stamp>
          <span className="hand-note">by hand, always</span>
        </aside>
      </section>

      <section className="detail-actions" aria-label="Letter actions">
        <button
          className={`primary-cta ${saved ? "primary-cta--filed" : ""}`}
          type="button"
          onClick={handleSave}
          aria-pressed={saved}
        >
          <span>{saved ? "Remove from archive" : "Stamp as favorite"}</span>
          <span className="cta-arrow" aria-hidden="true">✳</span>
        </button>

        <Link
          href="/#journal-main-heading"
          className="primary-cta"
          style={{ background: "#223a70", boxShadow: "0 3px 0 #142447, 0 8px 18px rgba(34,58,112,.2)" }}
        >
          <span>Write in my journal from this letter</span>
          <span className="cta-arrow" aria-hidden="true">↗</span>
        </Link>

        <label className="folder-picker">
          Move to folder
          <select
            aria-label="Choose folder for this letter"
            value={folderById[letter.id] ?? folders[0].id}
            onChange={(event) => {
              moveToFolder(letter.id, event.target.value);
              setFilingFolder(event.target.value);
              setNotice("The letter was filed in your folder.");
            }}
          >
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.label}
              </option>
            ))}
          </select>
        </label>

        <AnimatePresence mode="wait">
          <motion.span
            key={notice || "empty"}
            className="action-notice"
            role="status"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
          >
            {notice}
          </motion.span>
        </AnimatePresence>
      </section>

      <AnimatePresence initial={false}>
        {filingTarget && (
          <motion.div
            key={filingTarget.id}
            className="filing-journey"
            role="status"
            aria-label={`Letter filed into folder ${filingTarget.label}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
          >
            <motion.span
              className="filing-journey__letter"
              aria-hidden="true"
              initial={{ x: -8, y: -10, rotate: -9, scale: 0.9 }}
              animate={{ x: 99, y: 8, rotate: 2, scale: 0.62, opacity: 0.48 }}
              transition={{ type: "spring", stiffness: 110, damping: 16, duration: 0.8 }}
            >
              ✉
            </motion.span>
            <span className="filing-journey__arrow" aria-hidden="true">↗</span>
            <span className="filing-journey__folder">
              <span className="filing-journey__tab" />
              <b>{filingTarget.label}</b>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="detail-source-note">
        {letter.sender}
        <span aria-hidden="true"> · </span> Between Letters archive
      </div>

      <Paper className="detail-next-note">
        <span>Next fold?</span>
        <Link href="/discover">
          Find another letter <span aria-hidden="true">↗</span>
        </Link>
      </Paper>
    </main>
  );
}
export default LetterDetailPage;
