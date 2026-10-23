import type { Metadata } from "next";
import { LetterDetailPage } from "@/components/letter-detail-page";
import { letters } from "@/lib/letters";

export const metadata: Metadata = { title: "Uma carta — Entre Cartas" };

export function generateStaticParams() {
  return letters.map((letter) => ({ id: letter.id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LetterDetailPage id={id} />;
}
