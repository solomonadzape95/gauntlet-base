import { NextResponse } from "next/server";

import { hasUsablePrices } from "@/lib/battle-scoring";
import { isUuid, normalizeLineup, type BattleRecord } from "@/lib/battle-record";
import { readChainlinkPrices } from "@/lib/chainlink-market";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const selection = "id,status,player_picks,opponent_picks,opening_prices,end_prices,starts_at,ends_at,settled_at";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "That challenge ID is invalid." }, { status: 400 });
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Durable challenges are not configured yet." }, { status: 503 });

  const found = await supabase.from("battles").select(selection).eq("id", id).maybeSingle<BattleRecord>();
  if (found.error) return NextResponse.json({ error: "The challenge could not be loaded." }, { status: 503 });
  if (!found.data) return NextResponse.json({ error: "That challenge does not exist." }, { status: 404 });

  let battle = found.data;
  try {
    const currentPrices = battle.status === "complete" && battle.end_prices ? battle.end_prices : await readChainlinkPrices();
    const tickers = [...battle.player_picks, ...(battle.opponent_picks ?? [])].map((pick) => pick.ticker);
    if (battle.status !== "complete" && Date.parse(battle.ends_at) <= Date.now() && hasUsablePrices(tickers, currentPrices)) {
      const settled = await supabase.from("battles").update({
        status: "complete",
        end_prices: currentPrices,
        settled_at: new Date().toISOString(),
      }).eq("id", id).is("end_prices", null).select(selection).maybeSingle<BattleRecord>();
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

  const result = await supabase.from("battles").update({ opponent_picks: picks, status: "active" })
    .eq("id", id)
    .is("opponent_picks", null)
    .gt("ends_at", new Date().toISOString())
    .select(selection)
    .maybeSingle<BattleRecord>();
  if (result.error) return NextResponse.json({ error: "The challenge could not be joined." }, { status: 503 });
  if (!result.data) return NextResponse.json({ error: "This challenge was already joined or has ended." }, { status: 409 });
  return NextResponse.json({ battle: result.data });
}
