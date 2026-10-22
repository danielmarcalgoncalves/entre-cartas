"use client";

import { toggleArchivedLetter, useArchive } from "@/hooks/useArchive";

export function FavoriteStampButton({ letterId, compact = false }: { letterId: string; compact?: boolean }) {
  const { has } = useArchive("favorites");
  const stamped = has(letterId);
  return (
    <button
      type="button"
      className={`stamp-button${stamped ? " is-stamped" : ""}${compact ? " compact" : ""}`}
      aria-pressed={stamped}
      aria-label={stamped ? "Remover carta das favoritas" : "Carimbar como favorita"}
      onClick={() => toggleArchivedLetter("favorites", letterId)}
    >
      {stamped ? "FAVORITA" : "Carimbar favorita"}
    </button>
  );
}

export function SaveLetterButton({ letterId }: { letterId: string }) {
  const { has } = useArchive("saved");
  const saved = has(letterId);
  return (
    <button
      type="button"
      className={`stamp-button${saved ? " is-stamped" : ""}`}
      aria-pressed={saved}
      aria-label={saved ? "Retirar carta da pasta" : "Guardar carta na pasta"}
      onClick={() => toggleArchivedLetter("saved", letterId)}
    >
      {saved ? "GUARDADA" : "Guardar na pasta"}
    </button>
  );
}
