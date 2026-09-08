import type { Session } from "@supabase/supabase-js";

import type { DraftPick, PracticeDraft } from "@/lib/practice-game";

export async function saveActiveTeam(picks: DraftPick[], session: Session | null) {
  const response = await fetch("/api/team", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(session ? { authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ picks }),
  });
  if (!response.ok) return null;
  const result = await response.json() as { team?: PracticeDraft };
  return result.team ?? null;
}

export async function fetchActiveTeam(session: Session | null) {
  const response = await fetch("/api/team", {
    cache: "no-store",
    headers: session ? { authorization: `Bearer ${session.access_token}` } : {},
  });
  if (!response.ok) throw new Error("Could not load the active team.");
  const result = await response.json() as { team?: PracticeDraft | null };
  return result.team ?? null;
}
