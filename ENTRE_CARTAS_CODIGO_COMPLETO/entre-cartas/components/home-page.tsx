"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { categories, letters } from "@/lib/letters";
import { folders } from "@/lib/folders";
import { useArchive } from "@/components/archive-store";
import { CategoryLabel, Folder, LetterCard, Polaroid, ScrapbookSection, Sticker, Tape, TornPaper } from "@/components/paper-kit";

const portrait = "/manus-storage/async-images/XSVACGFAldUD5R3nWskOAH/image-1.webp";
const pressedFlower = "/manus-storage/async-images/XSVACGFAldUD5R3nWskOAH/image-2.webp";

export function HomePage() {
  const router = useRouter();
  const { savedIds, folderById } = useArchive();
  const featured = letters.slice(0, 3);
  const randomLetter = () => {
    const choice = letters[Math.floor(Math.random() * letters.length)];
    router.push(`/cartas/${choice.id}`);
  };

  return <main className="site-main home-page">
    <div className="margin-note margin-note--top" aria-hidden="true">coleção de<br />pequenos instantes</div>
    <section className="hero" aria-labelledby="hero-title">
      <span className="hero__thread" aria-hidden="true" />
      <div className="hero__desk-note" aria-hidden="true">LACRE Nº 014<br /><b>ABRA COM CUIDADO</b></div>
      <motion.article className="hero-paper" initial={{ opacity: 0, y: 18, rotate: -0.7 }} animate={{ opacity: 1, y: 0, rotate: -0.7 }} transition={{ duration: 0.65, ease: "easeOut" }}>
        <Tape className="hero-paper__tape" />
        <div className="hero-paper__topline"><span>UMA CAIXA ABERTA, SÓ PARA VOCÊ</span><span className="hero-paper__number">01 / 06</span></div>
        <div className="hero-paper__body">
          <div className="hero-paper__copy">
            <span className="hero-kicker"><span className="tiny-star">✳</span> O ARQUIVO DAS PALAVRAS QUE FICAM</span>
            <h1 id="hero-title">Cartas para todos <em>os sentimentos</em></h1>
            <p>Explore milhares de cartas reais, anônimas e inesquecíveis.</p>
            <div className="hero-paper__actions">
              <button type="button" className="primary-cta" onClick={randomLetter}><span>Abrir uma carta aleatória</span><span className="cta-arrow" aria-hidden="true">↗</span></button>
              <span className="hero-paper__aside">um envelope de cada vez</span>
            </div>
          </div>
          <div className="hero-paper__collage" aria-label="Colagem de uma lembrança antiga">
            <div className="collage-note"><span>“</span>o que se escreve<br />também encontra<br />um jeito de voltar</div>
            <Polaroid className="hero-polaroid" src={portrait} alt="Fotografia de época de uma mulher escrevendo uma carta perto da janela" caption="uma tarde de outros tempos" />
            <div className="newspaper-clipping" aria-hidden="true"><small>O ARQUIVO · EDIÇÃO DA TARDE</small><b>PALAVRAS<br />QUE FICAM</b><i>fragmento guardado</i></div>
            <img className="pressed-flower" src={pressedFlower} alt="" aria-hidden="true" />
            <div className="postmark" aria-hidden="true"><span>✳</span><small>ARQUIVO<br />AFETIVO</small></div>
          </div>
        </div>
        <div className="hero-paper__bottom"><span>GUARDADO COM CARINHO</span><span>•</span><span>DESDE SEMPRE, EM ALGUM LUGAR</span></div>
      </motion.article>
      <div className="hero__scribble" aria-hidden="true">para ler<br />devagarinho <span>↗</span></div>
      <img className="hero__manuscript" src="/images/manuscrito-pixabay.jpg" alt="" aria-hidden="true" />
      <span className="hero__flower-press" aria-hidden="true">✿</span>
    </section>

    <section className="category-strip" aria-labelledby="category-title">
      <div className="category-strip__heading"><span className="section-kicker">ENCONTRE PELO SENTIR</span><h2 id="category-title">Que palavra trouxe você?</h2></div>
      <div className="category-strip__labels">
        {categories.map((category, index) => <motion.a key={category.id} href={`/arquivo?categoria=${category.id}`} className={`category-petal category-petal--${index + 1}`} whileHover={{ y: -4, rotate: index % 2 ? 2 : -2 }} transition={{ type: "spring", stiffness: 250 }}>
          <span className="category-petal__mark" aria-hidden="true">{["✳", "☾", "〰", "✉", "✧", "❋"][index]}</span><CategoryLabel categoryId={category.id} /><small>{category.note}</small>
        </motion.a>)}
      </div>
      <TornPaper className="category-strip__bottom-note">pode começar por qualquer uma</TornPaper>
    </section>

    <ScrapbookSection eyebrow="RECORTES DO ARQUIVO" title="Cartas que chegaram até aqui" href="/arquivo" linkLabel="Ver todas as cartas">
      <div className="letter-shelf">{featured.map((letter) => <LetterCard key={letter.id} letter={letter} />)}</div>
    </ScrapbookSection>

    <ScrapbookSection eyebrow="CAIXAS E PASTAS" title="O que você quiser guardar" href="/colecoes" linkLabel="Abrir minha caixa">
      <div className="folder-shelf">{folders.map((folder, index) => <Folder key={folder.id} label={folder.label} note={folder.note} color={folder.color} count={savedIds.filter((id) => folderById[id] === folder.id).length} href={`/colecoes#${folder.id}`} className={`folder--tilt-${index + 1}`} />)}</div>
      <p className="folder-shelf__caption"><Sticker>✶</Sticker> As cartas que você arquivar ficam guardadas neste navegador.</p>
    </ScrapbookSection>

    <section className="closing-note" aria-label="Uma nota para o visitante">
      <span className="closing-note__ornament" aria-hidden="true">❧</span>
      <p>Algumas palavras nunca perdem o endereço.</p>
      <span className="closing-note__sign">— Entre Cartas <span aria-hidden="true">✦</span></span>
    </section>
  </main>;
}
