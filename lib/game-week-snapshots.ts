import type { SupabaseClient } from "@supabase/supabase-js";

import { hasUsablePrices, type PricePoint } from "./battle-scoring.ts";
import type { GameWeekSnapshot } from "./game-week.ts";
import { isRecentSnapshot } from "./game-week-schedule.ts";

export type DurableGameWeekSnapshot = { prices: PricePoint[]; capturedAt: string };

export async function readLatestGameWeekSnapshot(supabase: SupabaseClient, gameWeekId: string, tickers: string[], now = new Date()): Promise<DurableGameWeekSnapshot | null> {
  const latest = await supabase.from("game_week_price_snapshots")
    .select("prices,captured_at")
    .eq("game_week_id", gameWeekId)
    .in("kind", ["opening", "live"])
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ prices: PricePoint[]; captured_at: string }>();
  if (latest.error || !latest.data || !isRecentSnapshot(latest.data.captured_at, now) || !hasUsablePrices(tickers, latest.data.prices)) return null;
  return { prices: latest.data.prices, capturedAt: latest.data.captured_at };
}

export async function readGameWeekTimeline(supabase: SupabaseClient, gameWeekId: string, limit = 240): Promise<GameWeekSnapshot[]> {
  const snapshots = await supabase.rpc("game_week_snapshot_timeline", { p_game_week_id: gameWeekId, p_limit: limit });
  if (snapshots.error || !Array.isArray(snapshots.data)) return [];
  return (snapshots.data as { prices: PricePoint[]; captured_at: string }[])
    .map((snapshot) => ({ prices: snapshot.prices, capturedAt: snapshot.captured_at }));
}
