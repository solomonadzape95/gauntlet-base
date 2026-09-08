import { NextResponse } from "next/server";

import { hasUsablePrices, type PricePoint } from "@/lib/battle-scoring";
import { isUuid } from "@/lib/battle-record";
import { readChainlinkPrices } from "@/lib/chainlink-market";
import { scoreGameWeek } from "@/lib/game-week";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { fallbackPlayerName, playerReferenceKey, readPlayerPresentations } from "@/lib/player-profiles";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "That team entry is invalid." }, { status: 400 });
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Team profiles are not configured." }, { status: 503 });
  const entry = await supabase.from("game_week_entries").select("id,game_week_id,owner_user_id,guest_session_hash,lineup,final_points,final_return_bps,transfer_penalty_points,joined_at").eq("id", id).maybeSingle<{
    id: string; game_week_id: string; owner_user_id: string | null; guest_session_hash: string | null; lineup: { ticker: string; virtualAmount: number }[]; final_points: number | null; final_return_bps: number | null; transfer_penalty_points: number; joined_at: string;
  }>();
  if (!entry.data) return NextResponse.json({ error: "That Game Week team does not exist." }, { status: entry.error ? 503 : 404 });
  const week = await supabase.from("game_weeks").select("label,status,opening_prices").eq("id", entry.data.game_week_id).single<{ label: string; status: string; opening_prices: PricePoint[] | null }>();
  const profiles = await readPlayerPresentations(supabase, [entry.data]);
  const profile = profiles.get(playerReferenceKey(entry.data));
  let points = entry.data.final_points;
  let returnPercent = entry.data.final_return_bps == null ? null : entry.data.final_return_bps / 100;
  if (week.data?.status === "active" && week.data.opening_prices) {
    try {
      const current = await readChainlinkPrices();
      if (hasUsablePrices(entry.data.lineup.map((pick) => pick.ticker), current)) {
        const score = scoreGameWeek(entry.data.lineup, week.data.opening_prices, current);
        points = Math.max(0, score.points - entry.data.transfer_penalty_points);
        returnPercent = score.returnPercent;
      }
    } catch { /* Public team remains readable while the market feed is held. */ }
  }
  return NextResponse.json({
    entry: {
      id: entry.data.id,
      name: profile?.username ?? fallbackPlayerName(entry.data),
      tone: profile?.avatarTone ?? "hazard",
      lineup: entry.data.lineup,
      points,
      returnPercent,
      transferPenaltyPoints: entry.data.transfer_penalty_points,
      joinedAt: entry.data.joined_at,
      week: week.data ? { label: week.data.label, status: week.data.status } : { label: "GAME WEEK", status: "unknown" },
    },
  });
}
