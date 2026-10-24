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
      aria-label={stamped ? "Remove letter from favorites" : "Stamp as favorite"}
      onClick={() => toggleArchivedLetter("favorites", letterId)}
    >
      {stamped ? "FAVORITE" : "Stamp favorite"}
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
      aria-label={saved ? "Remove letter from folder" : "Save letter in folder"}
      onClick={() => toggleArchivedLetter("saved", letterId)}
    >
      {saved ? "SAVED" : "Save in folder"}
    </button>
  );
}
