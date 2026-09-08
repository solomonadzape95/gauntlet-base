import { NextRequest, NextResponse } from "next/server";

import { normalizeLineup } from "@/lib/battle-record";
import type { PracticeDraft } from "@/lib/practice-game";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { readActiveTeam, resolvePlayerIdentity, withPlayerCookie } from "@/lib/player-identity";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Team persistence is not configured yet." }, { status: 503 });

  const identity = await resolvePlayerIdentity(request, supabase);
  if (!identity) return NextResponse.json({ error: "Your session has expired. Verify your wallet again." }, { status: 401 });
  try {
    const active = await readActiveTeam(supabase, identity);
    const team: PracticeDraft | null = active ? { id: active.id, createdAt: active.createdAt, status: active.status, picks: active.picks } : null;
    return withPlayerCookie(NextResponse.json({ team }), identity);
  } catch {
    return NextResponse.json({ error: "Could not load the active team." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  let body: { picks?: unknown };
  try {
    body = await request.json() as { picks?: unknown };
  } catch {
    return NextResponse.json({ error: "The team request is not valid JSON." }, { status: 400 });
  }
  const picks = normalizeLineup(body.picks);
  if (!picks) return NextResponse.json({ error: "A team requires three to five stocks totaling $1,000." }, { status: 400 });

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Team persistence is not configured yet." }, { status: 503 });
  const identity = await resolvePlayerIdentity(request, supabase);
  if (!identity) return NextResponse.json({ error: "Your session has expired. Verify your wallet again." }, { status: 401 });
  const saved = await supabase.rpc("replace_active_team", {
    p_owner_user_id: identity.userId,
    p_guest_session_hash: identity.userId ? null : identity.guestHash,
    p_picks: picks,
  });
  if (saved.error || typeof saved.data !== "string") return NextResponse.json({ error: "Could not save the active team." }, { status: 503 });

  const team: PracticeDraft = { id: saved.data, createdAt: new Date().toISOString(), status: "virtual", picks };
  return withPlayerCookie(NextResponse.json({ team }, { status: 201 }), identity);
}
