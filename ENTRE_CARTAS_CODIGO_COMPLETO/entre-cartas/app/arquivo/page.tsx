import type { Metadata } from "next";
import { ArchivePage } from "@/components/archive-page";

export const metadata: Metadata = { title: "O Arquivo — Entre Cartas" };

export default function Page() {
  return <ArchivePage />;
}
