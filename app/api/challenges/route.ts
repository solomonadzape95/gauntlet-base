import { NextResponse } from "next/server";

import { BATTLE_RECORD_SELECTION, normalizeLineup, type BattleRecord } from "@/lib/battle-record";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { picks?: unknown };
  try {
    body = await request.json() as { picks?: unknown };
  } catch {
    return NextResponse.json({ error: "The challenge request is not valid JSON." }, { status: 400 });
  }

  const picks = normalizeLineup(body.picks);
  if (!picks) return NextResponse.json({ error: "A challenge requires a complete three-to-five-stock lineup." }, { status: 400 });

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Durable challenges are not configured yet.", code: "persistence_unavailable" }, { status: 503 });
  }

  try {
    const result = await supabase.from("battles").insert({
      status: "waiting",
      player_picks: picks,
      opening_prices: null,
      starts_at: null,
      ends_at: null,
    }).select(BATTLE_RECORD_SELECTION).single<BattleRecord>();

    if (result.error) throw result.error;
    const event = await supabase.from("battle_events").insert({ battle_id: result.data.id, event_type: "challenge_created" });
    if (event.error) console.warn("Challenge created without analytics event", event.error.message);
    return NextResponse.json({ battle: result.data }, { status: 201 });
  } catch (cause) {
    console.error("Could not create durable challenge", cause);
    return NextResponse.json({ error: "The durable challenge could not be created." }, { status: 503 });
  }
}
