import { NextRequest, NextResponse } from "next/server";

import { BATTLE_RECORD_SELECTION, normalizeBattleDuration, normalizeLineup, type BattleRecord } from "@/lib/battle-record";
import { readActiveTeam, resolvePlayerIdentity, withPlayerCookie } from "@/lib/player-identity";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: { durationMinutes?: unknown };
  try {
    body = await request.json() as { durationMinutes?: unknown };
  } catch {
    return NextResponse.json({ error: "The challenge request is not valid JSON." }, { status: 400 });
  }
  const durationMinutes = normalizeBattleDuration(body.durationMinutes ?? 1440);
  if (!durationMinutes) return NextResponse.json({ error: "Choose a one-hour or 24-hour challenge." }, { status: 400 });

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Durable challenges are not configured yet.", code: "persistence_unavailable" }, { status: 503 });
  }

  try {
    const identity = await resolvePlayerIdentity(request, supabase);
    if (!identity) return NextResponse.json({ error: "Your session has expired. Verify your wallet again." }, { status: 401 });
    const team = await readActiveTeam(supabase, identity);
    const picks = normalizeLineup(team?.picks);
    if (!team || !picks) return withPlayerCookie(NextResponse.json({ error: "Create a complete active team before starting a challenge." }, { status: 409 }), identity);
    const result = await supabase.from("battles").insert({
      status: "waiting",
      player_picks: picks,
      duration_minutes: durationMinutes,
      creator_team_id: team.id,
      creator_user_id: identity.userId,
      creator_guest_hash: identity.userId ? null : identity.guestHash,
      opening_prices: null,
      starts_at: null,
      ends_at: null,
    }).select(BATTLE_RECORD_SELECTION).single<BattleRecord>();

    if (result.error) throw result.error;
    const event = await supabase.from("battle_events").insert({ battle_id: result.data.id, event_type: "challenge_created" });
    if (event.error) console.warn("Challenge created without analytics event", event.error.message);
    return withPlayerCookie(NextResponse.json({ battle: result.data, role: "creator" }, { status: 201 }), identity);
  } catch (cause) {
    console.error("Could not create durable challenge", cause);
    return NextResponse.json({ error: "The durable challenge could not be created." }, { status: 503 });
  }
}
