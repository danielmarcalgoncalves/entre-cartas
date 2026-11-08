import type { Metadata } from "next";
import { Suspense } from "react";
import { InteractiveNotebook } from "@/components/notebook-experience/InteractiveNotebook";

export const metadata: Metadata = {
  title: "Interactive Journal — Between Letters",
  description:
    "Open and browse a realistic 3D hardbound leather representation of your personal journal volume with tactile page turning.",
};

export default function NotebookExperiencePage() {
  return (
    <Suspense fallback={<div className="nb-experience-loading" />}>
      <InteractiveNotebook />
    </Suspense>
  );
}
