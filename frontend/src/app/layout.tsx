import type { Metadata } from "next";
import type { ReactNode } from "react";
import SiteShell from "@/components/SiteShell";
import { AuthProvider } from "@/hooks/useAuth";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Entre Cartas — um arquivo de sentimentos",
    template: "%s · Entre Cartas",
  },
  description:
    "Um arquivo afetivo de cartas reais, anônimas e inesquecíveis. Abra uma, guarde outra, volte quando sentir saudade.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          <SiteShell>{children}</SiteShell>
        </AuthProvider>
      </body>
    </html>
  );
}
