import type { Metadata } from "next";
import { ArchiveProvider } from "@/components/archive-store";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import "./globals.css";
import "./interaction-overrides.css";

export const metadata: Metadata = {
  title: "Entre Cartas — um arquivo de sentimentos",
  description: "Explore cartas anônimas e memórias em um arquivo de papel feito para ler devagar.",
  applicationName: "Entre Cartas",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body><ArchiveProvider><SiteHeader />{children}<SiteFooter /></ArchiveProvider></body></html>;
}
