import Image from "next/image";
import Link from "next/link";
import CategoryLabel from "@/components/CategoryLabel";
import LetterCard from "@/components/LetterCard";
import RandomLetterButton from "@/components/RandomLetterButton";
import ScrapbookSection from "@/components/ScrapbookSection";
import { NewspaperSnippet, Polaroid, Sticker } from "@/components/Objects";
import { categories, letters } from "@/data/letters";

const heroImage = "/hero-collage.webp";

export default function HomePage() {
  return (
    <>
      <section className="hero-wrap" aria-labelledby="home-title">
        <div className="hero-scene">
          <Image src={heroImage} alt="Uma colagem de cartas antigas, fotografia e flores prensadas" fill priority unoptimized className="hero-image" sizes="100vw" />
          <div className="hero-paper-copy">
            <p className="hero-overline">Cartas encontradas · memórias guardadas</p>
            <h1 className="hero-title" id="home-title" aria-label="Cartas para todos os sentimentos">Cartas para <span style={{ display: "block" }}>todos os sentimentos</span></h1>
            <p className="hero-subtitle">Explore milhares de cartas reais, anônimas e inesquecíveis.</p>
            <RandomLetterButton />
          </div>
          <p className="hero-side-note">abre devagar.<br />algumas palavras<br />ainda estão secando.</p>
        </div>
        <div className="hero-caption">
          <span>Arquivo nº 001 · correspondências sem endereço</span>
          <span className="postmark">guardado com carinho</span>
        </div>
      </section>

      <div className="page-shell">
        <ScrapbookSection eyebrow="Escolha um caminho" title="Por onde começa a saudade?" href="/discover" linkLabel="Todas as cartas">
          <div className="category-strip">
            {categories.slice(0, 6).map((category, index) => <CategoryLabel key={category.id} categoryId={category.id} linked rotation={[-1.8, 1.2, -.8, 1.7, -.6, 1][index]} />)}
          </div>
        </ScrapbookSection>

        <ScrapbookSection eyebrow="Recém-encontradas" title="Algumas cartas da caixa" href="/discover" linkLabel="Abrir o arquivo">
          <div className="letter-grid">
            {letters.slice(0, 3).map((letter) => <LetterCard key={letter.id} letter={letter} />)}
          </div>
        </ScrapbookSection>

        <section className="section-block">
          <div className="scrapbook-quote">
            <div className="quote-paper">
              <span className="tape" aria-hidden="true" />
              <blockquote>“Talvez a gente escreva para descobrir que ainda existe alguém do outro lado.”</blockquote>
              <p className="quote-attribution">Um bilhete sem assinatura · encontrado entre as páginas</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", gap: 18 }}>
              <Polaroid caption="um lugar que já foi casa" />
              <div style={{ maxWidth: 180 }}>
                <NewspaperSnippet title="Pequenos achados">Há palavras que atravessam anos dentro de uma gaveta e ainda chegam quentinhas.</NewspaperSnippet>
                <div style={{ marginTop: 19, textAlign: "center" }}><Sticker>feito de histórias reais</Sticker></div>
              </div>
            </div>
          </div>
        </section>

        <section className="section-block" style={{ paddingBottom: 8 }}>
          <div className="archive-divider">uma carta pode encontrar você</div>
          <div style={{ marginTop: 26, textAlign: "center" }}>
            <p className="hand-note" style={{ margin: "0 0 12px" }}>talvez a próxima seja a que você precisava ler.</p>
            <Link href="/discover" className="text-link">Percorrer todas as cartas ↗</Link>
          </div>
        </section>
      </div>
    </>
  );
}
