import type { Metadata } from "next";
import { CollectionsPage } from "@/components/collections-page";

export const metadata: Metadata = { title: "Minha caixa — Entre Cartas" };

export default function Page() {
  return <CollectionsPage />;
}
