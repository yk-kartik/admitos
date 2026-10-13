import type { ReactNode } from "react";
import "@fontsource-variable/dm-sans";
import { AppShell } from "@/components/app-shell";
import { siteMetadata } from "@/lib/site-metadata";
import "./globals.css";

export const metadata = siteMetadata;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
