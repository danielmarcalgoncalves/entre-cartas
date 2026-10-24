import Link from "next/link";
import type { Letter } from "@/data/letters";
import CategoryLabel from "@/components/CategoryLabel";
import PlainText from "@/components/PlainText";
import { FavoriteStampButton, SaveLetterButton } from "@/components/ArchiveActions";
import { Sticker, WaxSeal } from "@/components/Objects";

export default function LetterViewer({ letter }: { letter: Letter }) {
  return (
    <div className="page-shell">
      <div className="letter-layout">
        <article>
          <Link href="/discover" className="letter-detail-back">← Back to letter archive</Link>
          <div className="letter-paper">
            <span className="tape" aria-hidden="true" />
            <header className="letter-meta">
              <div>
                <span className="letter-date">{letter.date} · {letter.place}</span>
                <p className="letter-to">{letter.recipient},</p>
              </div>
              <CategoryLabel categoryId={letter.category} small />
            </header>
            <h1 className="letter-title">{letter.title}</h1>
            <div className="letter-copy">{letter.body.map((paragraph, index) => <PlainText key={`${letter.id}-p${index}`} as="p">{paragraph}</PlainText>)}</div>
            <p className="letter-signature">{letter.signature}</p>
            <div className="letter-actions">
              <FavoriteStampButton letterId={letter.id} />
              <SaveLetterButton letterId={letter.id} />
            </div>
          </div>
        </article>
        <aside className="letter-side" aria-label="Archive notes">
          <WaxSeal mark="BL" />
          <Sticker>found among other memories</Sticker>
          <span className="stamp-mark blue">{letter.sender}</span>
          <span className="hand-note">“kept for you”</span>
        </aside>
      </div>
    </div>
  );
}
