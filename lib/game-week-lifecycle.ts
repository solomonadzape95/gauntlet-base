import type { SupabaseClient } from "@supabase/supabase-js";

import { hasUsablePrices, type PricePoint, type ScoredPick } from "./battle-scoring.ts";
import { readChainlinkPrices } from "./chainlink-market.ts";
import { scoreGameWeek } from "./game-week.ts";
import { minuteBucket, nextGameWeekWindow, selectGameWeekWork } from "./game-week-schedule.ts";

type LifecycleWeek = {
  id: string;
  label: string;
  status: "upcoming" | "active";
  starts_at: string;
  ends_at: string;
  opening_prices: PricePoint[] | null;
};

type LifecycleEntry = { id: string; lineup: ScoredPick[]; transfer_penalty_points: number };

export async function tickGameWeeks(supabase: SupabaseClient, now = new Date()) {
  const capturedAt = now.toISOString();
  const bucketAt = minuteBucket(now);
  const result = { activated: null as string | null, settled: null as string | null, snapshot: null as string | null, capturedAt };
  const weeks = await supabase.from("game_weeks").select("id,label,status,starts_at,ends_at,opening_prices").in("status", ["upcoming", "active"]).returns<LifecycleWeek[]>();
  if (weeks.error) throw weeks.error;
  const work = selectGameWeekWork(weeks.data, now);

  const dueToStart = weeks.data.find((week) => week.id === work.activateId);
  if (dueToStart) {
    const entries = await readEntries(supabase, dueToStart.id);
    const opening = await readChainlinkPrices();
    requireFreshEntryPrices(entries, opening);
    await ensureNextGameWeek(supabase, dueToStart);
    const activated = await supabase.rpc("activate_game_week_boundary", {
      p_game_week_id: dueToStart.id,
      p_opening_prices: opening,
      p_captured_at: capturedAt,
      p_bucket_at: bucketAt,
    });
    if (activated.error) throw activated.error;
    if (activated.data) result.activated = dueToStart.id;
    return result;
  }

  const dueToEnd = weeks.data.find((week) => week.id === work.settleId);
  if (dueToEnd && !dueToEnd.opening_prices) throw new Error("The active Game Week has no opening snapshot and cannot be settled safely.");
  if (dueToEnd?.opening_prices) {
    await ensureNextGameWeek(supabase, dueToEnd);
    const entries = await readEntries(supabase, dueToEnd.id);
    const closing = await readChainlinkPrices();
    requireFreshEntryPrices(entries, closing);
    const scores = entries.map((entry) => {
      const score = scoreGameWeek(entry.lineup, dueToEnd.opening_prices!, closing);
      return { id: entry.id, return_bps: score.returnBps, points: Math.max(0, score.points - entry.transfer_penalty_points) };
    });
    const settled = await supabase.rpc("settle_game_week_boundary", {
      p_game_week_id: dueToEnd.id,
      p_closing_prices: closing,
      p_scores: scores,
      p_captured_at: capturedAt,
      p_bucket_at: bucketAt,
    });
    if (settled.error) throw settled.error;
    if (settled.data) result.settled = dueToEnd.id;
    return result;
  }

  const liveWeek = weeks.data.find((week) => week.id === work.liveId);
  if (liveWeek) {
    await ensureNextGameWeek(supabase, liveWeek);
    const entries = await readEntries(supabase, liveWeek.id);
    const prices = await readChainlinkPrices();
    requireFreshEntryPrices(entries, prices);
    const snapshot = await supabase.rpc("record_game_week_live_snapshot", {
      p_game_week_id: liveWeek.id,
      p_prices: prices,
      p_captured_at: capturedAt,
      p_bucket_at: bucketAt,
    });
    if (snapshot.error) throw snapshot.error;
    if (snapshot.data) result.snapshot = liveWeek.id;
  }
  return result;
}

async function readEntries(supabase: SupabaseClient, gameWeekId: string) {
  const entries = await supabase.from("game_week_entries").select("id,lineup,transfer_penalty_points").eq("game_week_id", gameWeekId).returns<LifecycleEntry[]>();
  if (entries.error) throw entries.error;
  return entries.data;
}

function requireFreshEntryPrices(entries: LifecycleEntry[], prices: PricePoint[]) {
  const tickers = [...new Set(entries.flatMap((entry) => entry.lineup.map((pick) => pick.ticker)))];
  if (!hasUsablePrices(tickers, prices)) throw new Error("Fresh Game Week boundary prices are unavailable.");
}

async function ensureNextGameWeek(supabase: SupabaseClient, week: LifecycleWeek) {
  const window = nextGameWeekWindow(week);
  const next = await supabase.from("game_weeks").upsert({
    ...window,
    status: "upcoming",
  }, { onConflict: "label", ignoreDuplicates: true });
  if (next.error) throw next.error;
}
