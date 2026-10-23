import type { Metadata } from "next";
import type { ReactNode } from "react";
import SiteShell from "@/components/SiteShell";
import { AuthProvider } from "@/hooks/useAuth";
import { ArchiveProvider } from "@/components/archive-store";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Entre Cartas — Jornal Digital & Arquivo de Sentimentos",
    template: "%s · Entre Cartas",
  },
  description:
    "Um refúgio vintage e acolhedor para escrever seu diário pessoal e colecionar memórias reais.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          <ArchiveProvider>
            <SiteShell>{children}</SiteShell>
          </ArchiveProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

