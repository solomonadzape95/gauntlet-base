import { NextRequest, NextResponse } from "next/server";

import { BATTLE_RECORD_SELECTION, isUuid, normalizeBattleDuration, normalizeLineup, type BattleRecord } from "@/lib/battle-record";
import { isSamePlayer, readActiveTeam, resolvePlayerIdentity, withPlayerCookie } from "@/lib/player-identity";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: { durationMinutes?: unknown; rematchOf?: unknown };
  try {
    body = await request.json() as { durationMinutes?: unknown; rematchOf?: unknown };
  } catch {
    return NextResponse.json({ error: "The challenge request is not valid JSON." }, { status: 400 });
  }
  let durationMinutes = normalizeBattleDuration(body.durationMinutes ?? 1440);
  if (!durationMinutes) return NextResponse.json({ error: "Choose a one-hour or 24-hour challenge." }, { status: 400 });
  const rematchOf = body.rematchOf == null ? null : typeof body.rematchOf === "string" && isUuid(body.rematchOf) ? body.rematchOf : "invalid";
  if (rematchOf === "invalid") return NextResponse.json({ error: "That rematch reference is invalid." }, { status: 400 });

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Durable challenges are not configured yet.", code: "persistence_unavailable" }, { status: 503 });
  }

  try {
    const identity = await resolvePlayerIdentity(request, supabase);
    if (!identity) return NextResponse.json({ error: "Your session has expired. Verify your wallet again." }, { status: 401 });
    if (rematchOf) {
      const previous = await supabase.from("battles").select("status,duration_minutes,creator_user_id,creator_guest_hash,opponent_user_id,opponent_guest_hash").eq("id", rematchOf).maybeSingle<{ status: string; duration_minutes: number; creator_user_id: string | null; creator_guest_hash: string | null; opponent_user_id: string | null; opponent_guest_hash: string | null }>();
      const participant = previous.data && (isSamePlayer(identity, previous.data.creator_user_id, previous.data.creator_guest_hash) || isSamePlayer(identity, previous.data.opponent_user_id, previous.data.opponent_guest_hash));
      if (previous.error || !previous.data) return withPlayerCookie(NextResponse.json({ error: "That completed battle could not be found." }, { status: previous.error ? 503 : 404 }), identity);
      if (previous.data.status !== "complete" || !participant) return withPlayerCookie(NextResponse.json({ error: "Only a player in a completed battle can start its rematch." }, { status: 403 }), identity);
      durationMinutes = normalizeBattleDuration(previous.data.duration_minutes);
      if (!durationMinutes) return withPlayerCookie(NextResponse.json({ error: "That battle cannot be rematched with its saved duration." }, { status: 409 }), identity);
    }
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
      rematch_of: rematchOf,
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
