import { NextResponse } from "next/server";

import { hasUsablePrices } from "@/lib/battle-scoring";
import { normalizeLineup, type BattleRecord } from "@/lib/battle-record";
import { readChainlinkPrices } from "@/lib/chainlink-market";
import { STOCKS } from "@/lib/stocks";
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
    const prices = await readChainlinkPrices();
    if (!hasUsablePrices(STOCKS.map((stock) => stock.ticker), prices)) {
      return NextResponse.json({ error: "A fresh opening snapshot is not available for every supported stock." }, { status: 503 });
    }
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + 24 * 60 * 60 * 1000);
    const result = await supabase.from("battles").insert({
      status: "waiting",
      player_picks: picks,
      opening_prices: prices,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
    }).select("id,status,player_picks,opponent_picks,opening_prices,end_prices,starts_at,ends_at,settled_at").single<BattleRecord>();

    if (result.error) throw result.error;
    return NextResponse.json({ battle: result.data }, { status: 201 });
  } catch (cause) {
    console.error("Could not create durable challenge", cause);
    return NextResponse.json({ error: "The durable challenge could not be created." }, { status: 503 });
  }
}
