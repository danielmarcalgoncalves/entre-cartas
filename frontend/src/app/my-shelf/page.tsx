import type { Metadata } from "next";
import MyShelfPage from "@/components/MyShelfPage";

export const metadata: Metadata = {
  title: "My Shelf — Personal Journals Archive",
  description:
    "Browse, open, edit, and rename all your personal hardbound leather journals in one literary archive.",
};

export default function MyShelfRoutePage() {
  return (
    <div className="home-journal-experience">
      {/* Personal Archive containing My Journal volumes (with auth gate for guests) */}
      <MyShelfPage showPageChrome />
    </div>
  );
}
