import Link from "next/link";
import type { Letter } from "@/data/letters";
import CategoryLabel from "@/components/CategoryLabel";
import { FavoriteStampButton } from "@/components/ArchiveActions";
import { Envelope } from "@/components/Objects";

export default function LetterCard({ letter }: { letter: Letter }) {
  return (
    <article className="letter-object">
      <div className="object-topline">
        <CategoryLabel categoryId={letter.category} small />
        <span className="object-kind">{letter.object === "postcard" ? "cartão-postal" : letter.object === "crumpled" ? "papel amassado" : "envelope"}</span>
      </div>
      <Link href={`/letter/${letter.id}`} aria-label={`Abrir a carta: ${letter.title}`}>
        <Envelope type={letter.object} label={`Uma carta sobre ${letter.title}`} />
        <h3 className="object-title">{letter.title}</h3>
        <p className="object-excerpt">“{letter.excerpt}”</p>
      </Link>
      <div className="object-foot">
        <span>{letter.date}</span>
        <span className="object-open">ABRIR ↗</span>
      </div>
      <div style={{ position: "absolute", top: 9, right: 10 }}>
        <FavoriteStampButton letterId={letter.id} compact />
      </div>
    </article>
  );
}
