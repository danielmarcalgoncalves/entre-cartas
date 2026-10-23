import Link from "next/link";
import JournalEditor from "@/components/JournalEditor";
import PersonalJournalShelf from "@/components/PersonalJournalShelf";
import {
  CategoryLabel,
  Folder,
  LetterCard,
  ScrapbookSection,
  Sticker,
  TornPaper,
} from "@/components/paper-kit";
import { categories, letters } from "@/lib/letters";
import { folders } from "@/lib/folders";

export default function HomePage() {
  const featuredLetters = letters.slice(0, 3);

  return (
    <div className="home-journal-experience">
      {/* 1. Cabeçalho Poético do Diário Pessoal */}
      <section className="journal-intro" aria-labelledby="home-hero-title">
        <span className="section-kicker">SEU SANTUÁRIO DE ESCRITA & MEMÓRIAS</span>
        <h1 id="home-hero-title">
          Um refúgio para <em>o seu dia.</em>
        </h1>
        <p>
          Escreva sobre o que você sente, guarde cartas no seu arquivo e encontre
          inspiração em memórias de outros tempos.
        </p>
      </section>

      {/* 2. O Editor do Jornal Digital (Foco Principal do Produto) */}
      <JournalEditor />

      {/* 3. Estante de Páginas Escritas pelo Usuário (Meu Diário) */}
      <PersonalJournalShelf />

      {/* 4. Categorias e Caminhos do Sentir */}
      <section className="category-strip" aria-labelledby="category-title">
        <div className="category-strip__heading">
          <div>
            <span className="section-kicker">MURAL DE INSPIRAÇÃO</span>
            <h2 id="category-title">Por onde começa o seu sentir?</h2>
          </div>
          <Link href="/discover" className="text-link">
            Ver todas as cartas ↗
          </Link>
        </div>
        <div className="category-strip__labels">
          {categories.map((category, index) => (
            <Link
              key={category.id}
              href={`/discover?categoria=${category.id}`}
              className={`category-petal category-petal--${index + 1}`}
            >
              <span className="category-petal__mark" aria-hidden="true">
                {["✳", "☾", "〰", "✉", "✧", "❋"][index % 6]}
              </span>
              <CategoryLabel categoryId={category.id} />
              <small>{category.note}</small>
            </Link>
          ))}
        </div>
        <TornPaper className="category-strip__bottom-note">
          leia uma carta para se inspirar antes de escrever
        </TornPaper>
      </section>

      {/* 5. Mural de Inspiração: Cartas Prontas do Acervo */}
      <ScrapbookSection
        eyebrow="RECORTES DO ARQUIVO"
        title="Cartas para inspirar o seu dia"
        href="/discover"
        linkLabel="Explorar acervo completo"
      >
        <div className="letter-shelf">
          {featuredLetters.map((letter) => (
            <LetterCard key={letter.id} letter={letter} />
          ))}
        </div>
      </ScrapbookSection>

      {/* 6. Pastas e Caixas Físicas de Memórias */}
      <ScrapbookSection
        eyebrow="CAIXAS E PASTAS"
        title="O que você quiser guardar"
        href="/collections"
        linkLabel="Abrir minha caixa"
      >
        <div className="folder-shelf">
          {folders.map((folder, index) => (
            <Folder
              key={folder.id}
              label={folder.label}
              note={folder.note}
              color={folder.color}
              count={1}
              href={`/collections#${folder.id}`}
              className={`folder--tilt-${index + 1}`}
            />
          ))}
        </div>
        <p className="folder-shelf__caption">
          <Sticker>✶</Sticker> Suas cartas favoritas e memórias do diário ficam
          guardadas no seu arquivo.
        </p>
      </ScrapbookSection>

      {/* 7. Nota Final Poética */}
      <section className="closing-note" aria-label="Uma nota para o leitor">
        <span className="closing-note__ornament" aria-hidden="true">❧</span>
        <p>Algumas palavras nunca perdem o endereço de volta.</p>
        <span className="closing-note__sign">
          — Entre Cartas <span aria-hidden="true">✦</span>
        </span>
      </section>
    </div>
  );
}
