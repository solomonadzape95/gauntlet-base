"use client";

import { useEffect, useState } from "react";

import { useGauntletAuth } from "@/components/gauntlet-auth";
import type { PracticeDraft } from "@/lib/practice-game";
import { fetchActiveTeam } from "@/lib/team-client";
import { usePracticeDrafts } from "@/lib/use-practice-drafts";

export function useActiveTeam() {
  const { session, status } = useGauntletAuth();
  const localDrafts = usePracticeDrafts();
  const [remote, setRemote] = useState<{ owner: string | null | undefined; team: PracticeDraft | null; error: string | null }>({ owner: undefined, team: null, error: null });

  useEffect(() => {
    if (status === "loading") return;
    let cancelled = false;
    const owner = session?.user.id ?? null;
    void fetchActiveTeam(session)
      .then((team) => { if (!cancelled) setRemote({ owner, team, error: null }); })
      .catch(() => { if (!cancelled) setRemote((current) => ({ owner, team: current.owner === owner ? current.team : null, error: "Your saved team could not be loaded." })); });
    return () => { cancelled = true; };
  }, [session, status]);

  const owner = session?.user.id ?? null;
  const remoteReady = remote.owner === owner;
  return {
    team: session ? (remoteReady ? remote.team : null) : remote.team ?? localDrafts[0] ?? null,
    loading: status === "loading" || !remoteReady,
    error: remoteReady ? remote.error : null,
  };
}
