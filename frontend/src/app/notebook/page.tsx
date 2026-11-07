import type { Metadata } from "next";
import { InteractiveNotebook } from "@/components/notebook-experience/InteractiveNotebook";

export const metadata: Metadata = {
  title: "Interactive Notebook",
  description:
    "Open the hardbound leather volume and turn through tactile memories, botanicals, and personal correspondence.",
};

export default function NotebookExperiencePage() {
  return <InteractiveNotebook />;
}
