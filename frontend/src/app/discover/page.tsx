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
        <span className="eyebrow">Open archive · find your path</span>
        <h1 className="display-title">Discover Letters</h1>
        <p className="page-intro">Every envelope holds a piece of life. Search for a word, choose a category, or open whatever catches your eye.</p>
      </header>
      <Suspense fallback={<p className="page-intro">Opening the correspondence archive...</p>}>
        <SearchableShelf />
      </Suspense>
    </div>
  );
}
