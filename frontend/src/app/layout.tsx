import type { Metadata } from "next";
import type { ReactNode } from "react";
import SiteShell from "@/components/SiteShell";
import { AuthProvider } from "@/hooks/useAuth";
import { GuestDemoProvider } from "@/hooks/useGuestDemo";
import { ArchiveProvider } from "@/components/archive-store";
import { ThemeProvider } from "@/hooks/useTheme";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Between Letters — Digital Journal & Archive of Sentiments",
    template: "%s · Between Letters",
  },
  description:
    "A vintage, intimate sanctuary for personal journaling and keeping genuine memories.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="/theme-init.js" />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <GuestDemoProvider>
              <ArchiveProvider>
                <SiteShell>{children}</SiteShell>
              </ArchiveProvider>
            </GuestDemoProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
