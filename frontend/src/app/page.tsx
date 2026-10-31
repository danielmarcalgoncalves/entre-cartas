import type { Metadata } from "next";
import BetweenLettersLanding from "@/components/landing/BetweenLettersLanding";
import InteractiveGallery from "@/components/InteractiveGallery";
import AboutPresentation from "@/components/AboutPresentation";

export const metadata: Metadata = {
  title: "Between Letters — Archive of Sentiments & Digital Journal",
  description:
    "An intimate, contemplative haven for slow writing, hardbound leather journals, tactile correspondence, and preserving genuine memories.",
};

export default function RootEntryPage() {
  return (
    <div className="entry-flow-wrap">
      {/* 1. Cinematic Fullscreen Landing Hero with Scrapbook Notebook */}
      <BetweenLettersLanding />

      {/* 2. Tactile interactive editorial gallery of archival ephemera */}
      <InteractiveGallery />

      {/* 3. Narrative presentation with scroll-triggered text highlights and journal entry */}
      <AboutPresentation />
    </div>
  );
}
