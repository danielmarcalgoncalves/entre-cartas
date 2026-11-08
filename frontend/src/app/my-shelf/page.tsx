import type { Metadata } from "next";
import MyShelfPage from "@/components/MyShelfPage";

export const metadata: Metadata = {
  title: "My Shelf — Personal Journals & Letters Archive",
  description:
    "Browse, open, edit, rename, and organize all your personal hardbound journals and sealed correspondence in one literary archive.",
};

export default function MyShelfRoutePage() {
  return (
    <div className="home-journal-experience">
      {/* 1. Poetic Header for My Shelf Personal Archive */}
      <section className="journal-intro" aria-labelledby="my-shelf-page-title">
        <span className="eyebrow">PERSONAL ARCHIVE · KEPT VOLUMES & CORRESPONDENCE</span>
        <h1 id="my-shelf-page-title">
          My <em>Shelf.</em>
        </h1>
        <p className="journal-intro-sub">
          Every leather-bound journal and personal letter you have written rests here, ready to be reopened, reread, or continued whenever memory calls.
        </p>
      </section>

      {/* 2. Personal Archive containing My Journal and My Letters */}
      <MyShelfPage />

      {/* 3. Poetic Closing Note */}
      <section className="closing-note" aria-label="A note for the collector">
        <span className="closing-note__ornament" aria-hidden="true">❧</span>
        <p>What is written with care never truly fades.</p>
        <span className="closing-note__sign">
          — Between Letters <span aria-hidden="true">✦</span>
        </span>
      </section>
    </div>
  );
}
