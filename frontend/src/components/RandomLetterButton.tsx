"use client";

import { useRouter } from "next/navigation";
import { letters } from "@/data/letters";

export default function RandomLetterButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="primary-cta"
      onClick={() => {
        const letter = letters[Math.floor(Math.random() * letters.length)];
        router.push(`/letter/${letter.id}`);
      }}
    >
      Abrir uma carta aleatória <span className="arrow" aria-hidden="true">↗</span>
    </button>
  );
}
