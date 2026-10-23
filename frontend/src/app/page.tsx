import JournalEditor from "@/components/JournalEditor";
import PersonalJournalShelf from "@/components/PersonalJournalShelf";

export default function HomePage() {
  return (
    <div className="home-journal-experience">
      {/* 1. Cabeçalho Poético do Diário Pessoal */}
      <section className="journal-intro" aria-labelledby="home-hero-title">
        <h1 id="home-hero-title">
          Um refúgio para <em>o seu dia.</em>
        </h1>
        <p className="journal-intro-sub">
          Assente suas palavras em cadernos encadernados ou sele cartas solenes ao abrigo do tempo.
        </p>
      </section>

      {/* 2. O Editor do Jornal Digital (Mesa de Escrita Editorial) */}
      <JournalEditor />

      {/* 3. Estante Pessoal: Meus Cadernos (Tomos Inteiros), Sala de Leitura Escura e Pasta de Cartas */}
      <PersonalJournalShelf />

      {/* 4. Nota Final Poética de Gabinete */}
      <section className="closing-note" aria-label="Uma nota para o autor">
        <span className="closing-note__ornament" aria-hidden="true">❧</span>
        <p>Algumas palavras encontram seu verdadeiro lugar no silêncio do papel.</p>
        <span className="closing-note__sign">
          — Entre Cartas <span aria-hidden="true">✦</span>
        </span>
      </section>
    </div>
  );
}
