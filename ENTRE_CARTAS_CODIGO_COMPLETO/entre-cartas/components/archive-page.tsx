"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { categories, letters } from "@/lib/letters";
import { LetterCard, TornPaper } from "@/components/paper-kit";

export function ArchivePage() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("todas");

  useEffect(() => {
    const category = new URLSearchParams(window.location.search).get("categoria");
    if (category && categories.some((item) => item.id === category)) setActiveCategory(category);
  }, []);

  const filtered = useMemo(() => letters.filter((letter) => {
    const matchesCategory = activeCategory === "todas" || letter.category === activeCategory;
    const content = `${letter.title} ${letter.excerpt} ${letter.sender}`.toLocaleLowerCase("pt-BR");
    return matchesCategory && content.includes(query.toLocaleLowerCase("pt-BR"));
  }), [activeCategory, query]);

  return <main className="site-main archive-page">
    <div className="page-ribbon"><Link href="/">INÍCIO</Link><span> / </span><span>O ARQUIVO</span></div>
    <header className="archive-intro">
      <div className="archive-intro__copy"><span className="section-kicker">CAIXA DE CORRESPONDÊNCIAS · VOL. 01</span><h1>Um arquivo que <em>respira.</em></h1><p>Abra os envelopes pelo que você sente. Cada carta é um pequeno lugar para pousar.</p></div>
      <div className="archive-intro__seal"><span>ACERVO<br />ABERTO</span><b>✳</b></div>
    </header>

    <div className="archive-tools">
      <label className="search-paper"><span aria-hidden="true">⌕</span><input aria-label="Buscar no arquivo" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Procurar uma palavra, um sentimento…" /><kbd>↵</kbd></label>
      <span className="archive-tools__count">{filtered.length.toString().padStart(2, "0")} CARTAS ENCONTRADAS</span>
    </div>

    <nav className="archive-filters" aria-label="Filtrar por categoria">
      <button type="button" className={activeCategory === "todas" ? "is-active" : ""} onClick={() => setActiveCategory("todas")}><TornPaper className="archive-filter-label">Todas as cartas</TornPaper><span>{letters.length}</span></button>
      {categories.map((category) => <button key={category.id} type="button" className={activeCategory === category.id ? "is-active" : ""} onClick={() => setActiveCategory(category.id)}><TornPaper className="archive-filter-label">{category.name}</TornPaper><span aria-hidden="true">✳</span></button>)}
    </nav>

    {filtered.length > 0 ? <div className="letter-shelf letter-shelf--archive">{filtered.map((letter) => <LetterCard key={letter.id} letter={letter} />)}</div> : <div className="empty-paper"><span aria-hidden="true">✉</span><p>Essa prateleira ainda está em silêncio.</p><button type="button" onClick={() => { setActiveCategory("todas"); setQuery(""); }}>Recomeçar a busca</button></div>}
    <TornPaper className="archive-footnote">pequenos recortes de demonstração, por enquanto</TornPaper>
  </main>;
}
