import type { Metadata } from "next";

import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import { TypefaceToggle } from "@/components/typeface-toggle";
import "@fontsource/maple-mono/300.css";
import "@fontsource/maple-mono/400.css";
import "@fontsource/maple-mono/500.css";
import "@fontsource/maple-mono/600.css";
import "@fontsource/maple-mono/700.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "Gauntlet — Build a lineup. Own a little.",
  description: "Turn a fantasy stock draft into a small real tokenized-stock portfolio on Base.",
  applicationName: "Gauntlet",
  openGraph: {
    title: "Gauntlet — Draft. Battle. Own.",
    description: "Build a free fantasy-stock lineup, battle on real market data, and optionally own a small version on Base.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gauntlet — Draft. Battle. Own.",
    description: "Fantasy-stock battles scored from official Base market feeds.",
  },
  other: {
    "base:app_id": "6a9ee697b4ea88aaf730c7dc",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="dither-overlay" aria-hidden />
          <SiteHeader />
          <TypefaceToggle />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
