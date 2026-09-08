import type { Session } from "@supabase/supabase-js";

import type { DraftPick, PracticeDraft } from "@/lib/practice-game";

export function playerHeaders(session: Session | null): Record<string, string> {
  return session ? { authorization: `Bearer ${session.access_token}` } : {};
}

export async function saveActiveTeam(picks: DraftPick[], session: Session | null) {
  const response = await fetch("/api/team", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...playerHeaders(session),
    },
    body: JSON.stringify({ picks }),
  });
  const result = await response.json() as { team?: PracticeDraft; error?: string };
  if (!response.ok || !result.team) throw new Error(result.error ?? "Could not save the active team.");
  return result.team;
}

export async function fetchActiveTeam(session: Session | null) {
  const response = await fetch("/api/team", {
    cache: "no-store",
    headers: playerHeaders(session),
  });
  if (!response.ok) throw new Error("Could not load the active team.");
  const result = await response.json() as { team?: PracticeDraft | null };
  return result.team ?? null;
}
