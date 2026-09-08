import { NextResponse } from "next/server";

import { hasUsablePrices } from "@/lib/battle-scoring";
import { BATTLE_RECORD_SELECTION, createBattleWindow, isUuid, normalizeLineup, type BattleRecord } from "@/lib/battle-record";
import { readChainlinkPrices } from "@/lib/chainlink-market";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "That challenge ID is invalid." }, { status: 400 });
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Durable challenges are not configured yet." }, { status: 503 });

  const found = await supabase.from("battles").select(BATTLE_RECORD_SELECTION).eq("id", id).maybeSingle<BattleRecord>();
  if (found.error) return NextResponse.json({ error: "The challenge could not be loaded." }, { status: 503 });
  if (!found.data) return NextResponse.json({ error: "That challenge does not exist." }, { status: 404 });

  let battle = found.data;
  try {
    const currentPrices = battle.status === "complete" && battle.end_prices ? battle.end_prices : await readChainlinkPrices();
    const tickers = [...battle.player_picks, ...(battle.opponent_picks ?? [])].map((pick) => pick.ticker);
    if (battle.status === "active") {
      await supabase.from("battle_price_snapshots").insert({ battle_id: id, kind: "current", prices: currentPrices });
    }
    if (battle.status === "active" && battle.ends_at && Date.parse(battle.ends_at) <= Date.now() && hasUsablePrices(tickers, currentPrices)) {
      const settled = await supabase.from("battles").update({
        status: "complete",
        end_prices: currentPrices,
        settled_at: new Date().toISOString(),
      }).eq("id", id).is("end_prices", null).select(BATTLE_RECORD_SELECTION).maybeSingle<BattleRecord>();
      if (settled.data) battle = settled.data;
    }
    return NextResponse.json({ battle, currentPrices }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    console.error("Could not refresh durable challenge", cause);
    return NextResponse.json({ battle, currentPrices: battle.end_prices ?? battle.opening_prices, warning: "Live prices are temporarily unavailable." });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "That challenge ID is invalid." }, { status: 400 });
  let body: { picks?: unknown };
  try {
    body = await request.json() as { picks?: unknown };
  } catch {
    return NextResponse.json({ error: "The join request is not valid JSON." }, { status: 400 });
  }
  const picks = normalizeLineup(body.picks);
  if (!picks) return NextResponse.json({ error: "Joining requires a complete three-to-five-stock lineup." }, { status: 400 });
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Durable challenges are not configured yet." }, { status: 503 });

  let prices;
  try {
    prices = await readChainlinkPrices();
  } catch (cause) {
    console.error("Could not lock challenge opening prices", cause);
    return NextResponse.json({ error: "Fresh opening prices are temporarily unavailable." }, { status: 503 });
  }
  const tickers = [...picks].map((pick) => pick.ticker);
  const existing = await supabase.from("battles").select("player_picks").eq("id", id).maybeSingle<{ player_picks: BattleRecord["player_picks"] }>();
  if (existing.error || !existing.data) return NextResponse.json({ error: "That challenge does not exist." }, { status: existing.error ? 503 : 404 });
  tickers.push(...existing.data.player_picks.map((pick) => pick.ticker));
  if (!hasUsablePrices(tickers, prices)) return NextResponse.json({ error: "A fresh opening snapshot is not available for both lineups." }, { status: 503 });
  const { startsAt, endsAt } = createBattleWindow();
  const result = await supabase.from("battles").update({
    opponent_picks: picks,
    status: "active",
    opening_prices: prices,
    starts_at: startsAt,
    ends_at: endsAt,
  })
    .eq("id", id)
    .is("opponent_picks", null)
    .eq("status", "waiting")
    .select(BATTLE_RECORD_SELECTION)
    .maybeSingle<BattleRecord>();
  if (result.error) return NextResponse.json({ error: "The challenge could not be joined." }, { status: 503 });
  if (!result.data) return NextResponse.json({ error: "This challenge was already joined or has ended." }, { status: 409 });
  const event = await supabase.from("battle_events").upsert({ battle_id: id, event_type: "opponent_joined" }, { onConflict: "battle_id,event_type", ignoreDuplicates: true });
  if (event.error) console.warn("Opponent joined without analytics event", event.error.message);
  return NextResponse.json({ battle: result.data });
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "That challenge ID is invalid." }, { status: 400 });
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Durable challenges are not configured yet." }, { status: 503 });

  const event = await supabase.from("battle_events").upsert(
    { battle_id: id, event_type: "challenge_shared" },
    { onConflict: "battle_id,event_type", ignoreDuplicates: true },
  );
  if (event.error) return NextResponse.json({ error: "The share could not be recorded." }, { status: 503 });
  return NextResponse.json({ recorded: true });
}
