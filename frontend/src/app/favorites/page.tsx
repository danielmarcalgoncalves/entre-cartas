"use client";

import Link from "next/link";
import { useArchive } from "@/hooks/useArchive";
import LetterCard from "@/components/LetterCard";
import { letters } from "@/data/letters";

export default function FavoritesPage() {
  const { ids } = useArchive("favorites");
  const saved = letters.filter((letter) => ids.includes(letter.id));
  return (
    <div className="page-shell">
      <header className="page-heading">
        <span className="eyebrow">Red ink stamp · words that endure</span>
        <h1 className="display-title">Favorite Letters</h1>
        <p className="page-intro">The letters you have stamped remain gathered here, ready to be read once more.</p>
      </header>
      {saved.length ? (
        <div className="letter-grid">{saved.map((letter) => <LetterCard key={letter.id} letter={letter} />)}</div>
      ) : (
        <div className="not-found-paper">
          <span className="stamp-mark">FUTURE FAVORITE</span>
          <h2 className="section-title" style={{ marginTop: 20 }}>No stamps on this page yet.</h2>
          <p className="page-intro" style={{ margin: "12px auto 22px" }}>When a letter touches you, stamp it as a favorite. It will appear on this quiet shelf.</p>
          <Link href="/discover" className="text-link">Find a letter ↗</Link>
        </div>
      )}
    </div>
  );
}
