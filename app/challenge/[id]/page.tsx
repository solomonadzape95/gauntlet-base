import type { Metadata } from "next";

import { ChallengeEntry } from "@/components/challenge-entry";

export const metadata: Metadata = {
  title: "A player challenged you — Gauntlet",
  description: "Bring your active fantasy-stock team and meet them head to head on verified Base market data.",
  openGraph: {
    title: "A player challenged you — Gauntlet",
    description: "Your team versus theirs. Accept the challenge and lock both lineups at the opening bell.",
  },
  twitter: {
    card: "summary_large_image",
    title: "A player challenged you — Gauntlet",
    description: "Your team versus theirs. Accept the challenge on Gauntlet.",
  },
};

export default async function ChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ChallengeEntry battleId={id} />;
}
