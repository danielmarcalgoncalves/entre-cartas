"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import DiscoveryShelf from "@/components/DiscoveryShelf";

function SearchableShelf() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "all";
  return <DiscoveryShelf initialQuery={q} initialCategory={category} />;
}

export default function DiscoverPage() {
  return (
    <div className="page-shell">
      <header className="page-heading">
        <span className="eyebrow">Arquivo aberto · encontre seu caminho</span>
        <h1 className="display-title">Descobrir cartas</h1>
        <p className="page-intro">Cada envelope guarda um pedaço de vida. Procure por uma palavra, escolha uma categoria ou abra o que chamar sua atenção.</p>
      </header>
      <Suspense fallback={<p className="page-intro">Abrindo o arquivo de correspondências...</p>}>
        <SearchableShelf />
      </Suspense>
    </div>
  );
}
