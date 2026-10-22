import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LetterViewer from "@/components/LetterViewer";
import { getLetter, letters } from "@/data/letters";

type LetterPageProps = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return letters.map((letter) => ({
    id: letter.id,
  }));
}

export async function generateMetadata({ params }: LetterPageProps): Promise<Metadata> {
  const { id } = await params;
  const letter = getLetter(id);
  return letter ? { title: letter.title, description: letter.excerpt } : { title: "Carta não encontrada" };
}

export default async function LetterPage({ params }: LetterPageProps) {
  const { id } = await params;
  const letter = getLetter(id);
  if (!letter) notFound();
  return <LetterViewer letter={letter} />;
}
