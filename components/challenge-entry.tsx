"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { GauntletLoader } from "@/components/gauntlet-loader";

export function ChallengeEntry({ battleId }: { battleId: string }) {
  const router = useRouter();
  const destination = `/battle/demo?battle=${encodeURIComponent(battleId)}`;

  useEffect(() => {
    router.replace(destination);
  }, [destination, router]);

  return (
    <div className="shell page-shell">
      <GauntletLoader label="OPENING CHALLENGE" />
      <Link className="primary-action" href={destination}>ENTER BATTLE</Link>
    </div>
  );
}
