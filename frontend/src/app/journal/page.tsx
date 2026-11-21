import type { Metadata, Viewport } from "next";
import JournalEditor from "@/components/JournalEditor";

export const metadata: Metadata = {
  title: "Journal — Personal Notebook Writing",
  description:
    "An intimate digital journal to write your day and organize memories inside hardbound leather volumes.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "overlays-content",
};

export default function JournalPage() {
  return (
    <div className="home-journal-experience">
      {/* Dedicated Notebook Editor */}
      <JournalEditor />
    </div>
  );
}
