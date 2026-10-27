import type { Metadata } from "next";
import type { ReactNode } from "react";
import SiteShell from "@/components/SiteShell";
import { AuthProvider } from "@/hooks/useAuth";
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

const themeInitScript = `(function() {
  try {
    var stored = localStorage.getItem('entre-cartas:theme');
    var theme = stored;
    if (!theme) {
      theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <ArchiveProvider>
              <SiteShell>{children}</SiteShell>
            </ArchiveProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

