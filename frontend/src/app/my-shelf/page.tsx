import type { Metadata } from "next";
import MyShelfPage from "@/components/MyShelfPage";

export const metadata: Metadata = {
  title: "My Shelf — Personal Journals & Letters Archive",
  description:
    "Browse, open, edit, rename, and organize all your personal hardbound journals and sealed correspondence in one literary archive.",
};

export default function MyShelfRoutePage() {
  return (
    <div className="home-journal-experience">
      {/* Personal Archive containing My Journal and My Letters (with auth gate for guests) */}
      <MyShelfPage showPageChrome />
    </div>
  );
}
