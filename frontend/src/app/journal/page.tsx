import type { Metadata } from "next";
import JournalEditor from "@/components/JournalEditor";
import PersonalJournalShelf from "@/components/PersonalJournalShelf";

export const metadata: Metadata = {
  title: "My Journal & Archive Desk",
  description: "An intimate digital journal to write your day and cherish memories in hardbound volumes.",
};

export default function JournalPage() {
  return (
    <div className="home-journal-experience">
      {/* 1. Poetic Header for Personal Journal */}
      <section className="journal-intro" aria-labelledby="journal-desk-title">
        <h1 id="journal-desk-title">
          A sanctuary for <em>your day.</em>
        </h1>
        <p className="journal-intro-sub">
          Rest your thoughts in hardbound journals or seal thoughtful letters sheltered from time.
        </p>
      </section>

      {/* 2. Digital Journal Editor (Editorial Writing Desk) */}
      <JournalEditor />

      {/* 3. Personal Shelf: My Journals, Reading Room, and Letters Archive */}
      <PersonalJournalShelf />

      {/* 4. Poetic Closing Note */}
      <section className="closing-note" aria-label="A note for the author">
        <span className="closing-note__ornament" aria-hidden="true">❧</span>
        <p>Some words find their true home in the silence of paper.</p>
        <span className="closing-note__sign">
          — Between Letters <span aria-hidden="true">✦</span>
        </span>
      </section>
    </div>
  );
}
