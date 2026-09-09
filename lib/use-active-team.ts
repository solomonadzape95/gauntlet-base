"use client";

import { useEffect, useState } from "react";

import { useGauntletAuth } from "@/components/gauntlet-auth";
import { selectVisibleTeam } from "@/lib/active-team-state";
import type { PracticeDraft } from "@/lib/practice-game";
import { fetchActiveTeam } from "@/lib/team-client";

export function useActiveTeam() {
  const { session, profile, status, verified } = useGauntletAuth();
  const [remote, setRemote] = useState<{ owner: string | null | undefined; team: PracticeDraft | null; error: string | null }>({ owner: undefined, team: null, error: null });

  useEffect(() => {
    if (status === "loading") return;
    if (!verified) return;
    let cancelled = false;
    const owner = session?.user.id ?? profile?.wallet_address ?? null;
    void fetchActiveTeam(session)
      .then((team) => { if (!cancelled) setRemote({ owner, team, error: null }); })
      .catch(() => { if (!cancelled) setRemote((current) => ({ owner, team: current.owner === owner ? current.team : null, error: "Your saved team could not be loaded." })); });
    return () => { cancelled = true; };
  }, [profile?.wallet_address, session, status, verified]);

  const owner = session?.user.id ?? profile?.wallet_address ?? null;
  const remoteReady = remote.owner === owner;
  return {
    team: selectVisibleTeam({ verified, remoteReady, remoteTeam: remote.team, localTeam: null }),
    loading: status === "loading" || (verified && !remoteReady),
    error: remoteReady ? remote.error : null,
  };
}
