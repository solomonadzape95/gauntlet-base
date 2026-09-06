import type { Metadata } from "next";

import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gauntlet — Pick three. Own a little.",
  description: "Turn a fantasy stock draft into a small real tokenized-stock portfolio on Base.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="dither-overlay" aria-hidden />
        <SiteHeader />
        <main>{children}</main>
      </body>
    </html>
  );
}
