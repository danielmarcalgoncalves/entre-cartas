"use client";

import { useMemo, useState } from "react";
import CategoryLabel from "@/components/CategoryLabel";
import LetterCard from "@/components/LetterCard";
import { categories, letters } from "@/data/letters";

export default function DiscoveryShelf({ initialQuery = "", initialCategory = "all" }: { initialQuery?: string; initialCategory?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const visibleLetters = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return letters.filter((letter) => {
      const matchesCategory = category === "all" || letter.category === category;
      const searchable = `${letter.title} ${letter.excerpt} ${letter.body.join(" ")} ${letter.place}`.toLocaleLowerCase("pt-BR");
      return matchesCategory && (!normalized || searchable.includes(normalized));
    });
  }, [category, query]);

  return (
    <>
      <div className="catalog-toolbar">
        <div className="filter-tabs" aria-label="Filtrar por categoria">
          <button type="button" className={`filter-tab${category === "all" ? " selected" : ""}`} onClick={() => setCategory("all")}>Todas</button>
          {categories.slice(0, 6).map((item) => <button type="button" key={item.id} className={`filter-tab${category === item.id ? " selected" : ""}`} aria-pressed={category === item.id} onClick={() => setCategory(item.id)}>{item.label}</button>)}
        </div>
        <label className="archive-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="buscar por palavra, lugar ou lembrança" aria-label="Buscar no catálogo" /></label>
      </div>
      <div className="category-strip" style={{ justifyContent: "flex-start", padding: "0 0 19px" }}>
        {categories.slice(6).map((item, index) => <CategoryLabel key={item.id} categoryId={item.id} linked rotation={index % 2 ? 1 : -1} />)}
      </div>
      <p className="object-kind" style={{ margin: "0 0 14px" }}>{visibleLetters.length} {visibleLetters.length === 1 ? "correspondência encontrada" : "correspondências encontradas"}</p>
      <div className="letter-grid">
        {visibleLetters.length ? visibleLetters.map((letter) => <LetterCard key={letter.id} letter={letter} />) : <div className="empty-note">Nenhuma carta apareceu por aqui. Talvez outra palavra encontre o caminho.</div>}
      </div>
    </>
  );
}
