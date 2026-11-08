import type { Metadata } from "next";
import LetterEditor from "@/components/LetterEditor";

export const metadata: Metadata = {
  title: "Letters — Personal Correspondence Desk",
  description:
    "Write, seal, and preserve personal letters on vintage stationery with custom inks, postage stamps, and correspondence folders.",
};

export default function LettersPage() {
  return (
    <div className="home-journal-experience">
      {/* 1. Poetic Header Dedicated Exclusively to Personal Letter Writing */}
      <section className="journal-intro" aria-labelledby="letters-desk-title">
        <span className="eyebrow">VINTAGE STATIONERY · PERSONAL CORRESPONDENCE</span>
        <h1 id="letters-desk-title">
          Words meant to be <em>sealed and kept.</em>
        </h1>
        <p className="journal-intro-sub">
          Choose your stationery paper, ink, and postage stamp. Write a letter to someone dear, to your future self, or for the quiet of your personal archive.
        </p>
      </section>

      {/* 2. Independent Letter Editor */}
      <LetterEditor />

      {/* 3. Poetic Closing Note */}
      <section className="closing-note" aria-label="A note for the correspondent">
        <span className="closing-note__ornament" aria-hidden="true">❧</span>
        <p>A letter is a small shelter where time slows down.</p>
        <span className="closing-note__sign">
          — Between Letters <span aria-hidden="true">✦</span>
        </span>
      </section>
    </div>
  );
}
