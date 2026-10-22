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
        <span className="eyebrow">Carimbo vermelho · palavras que ficam</span>
        <h1 className="display-title">Cartas favoritas</h1>
        <p className="page-intro">As cartas que você carimbou ficam reunidas aqui, prontas para serem lidas outra vez.</p>
      </header>
      {saved.length ? (
        <div className="letter-grid">{saved.map((letter) => <LetterCard key={letter.id} letter={letter} />)}</div>
      ) : (
        <div className="not-found-paper">
          <span className="stamp-mark">FUTURA FAVORITA</span>
          <h2 className="section-title" style={{ marginTop: 20 }}>Ainda não há carimbos nesta página.</h2>
          <p className="page-intro" style={{ margin: "12px auto 22px" }}>Quando uma carta tocar você, carimbe-a como favorita. Ela aparecerá nesta pequena prateleira.</p>
          <Link href="/discover" className="text-link">Encontrar uma carta ↗</Link>
        </div>
      )}
    </div>
  );
}
