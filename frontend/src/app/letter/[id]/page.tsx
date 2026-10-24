import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LetterDetailPage } from "@/components/letter-detail-page";
import { getLetter, letters } from "@/lib/letters";

type LetterPageProps = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return letters.map((letter) => ({
    id: letter.id,
  }));
}

export async function generateMetadata({ params }: LetterPageProps): Promise<Metadata> {
  const { id } = await params;
  const letter = getLetter(id);
  return letter ? { title: `${letter.title} — Between Letters`, description: letter.excerpt } : { title: "Letter not found" };
}

export default async function LetterPage({ params }: LetterPageProps) {
  const { id } = await params;
  const letter = getLetter(id);
  if (!letter) notFound();
  return <LetterDetailPage id={id} />;
}
