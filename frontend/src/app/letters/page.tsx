import type { Metadata } from "next";
import LetterEditor from "@/components/LetterEditor";

export const metadata: Metadata = {
  title: "Letters — Personal Correspondence Desk",
  description:
    "Write, seal, and preserve personal letters on vintage stationery with custom papers, typography, and correspondence folders.",
};

export default function LettersPage() {
  return (
    <div className="letters-page-container">
      <LetterEditor />
    </div>
  );
}
