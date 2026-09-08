import type { SupabaseClient } from "@supabase/supabase-js";

import { hasUsablePrices, type PricePoint, type ScoredPick } from "./battle-scoring.ts";
import { readChainlinkPrices } from "./chainlink-market.ts";
import { scoreGameWeek } from "./game-week.ts";

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
  const result = { activated: null as string | null, settled: null as string | null };
  const weeks = await supabase.from("game_weeks").select("id,label,status,starts_at,ends_at,opening_prices").in("status", ["upcoming", "active"]).returns<LifecycleWeek[]>();
  if (weeks.error) throw weeks.error;

  const dueToStart = weeks.data.find((week) => week.status === "upcoming" && Date.parse(week.starts_at) <= now.getTime());
  if (dueToStart) {
    const entries = await readEntries(supabase, dueToStart.id);
    const opening = await readChainlinkPrices();
    requireFreshEntryPrices(entries, opening);
    await ensureNextGameWeek(supabase, dueToStart);
    const activated = await supabase.from("game_weeks").update({ status: "active", opening_prices: opening }).eq("id", dueToStart.id).eq("status", "upcoming");
    if (activated.error) throw activated.error;
    result.activated = dueToStart.id;
  }

  const activeWithoutSuccessor = weeks.data.find((week) => week.status === "active");
  if (activeWithoutSuccessor) await ensureNextGameWeek(supabase, activeWithoutSuccessor);

  const dueToEnd = weeks.data.find((week) => week.status === "active" && Date.parse(week.ends_at) <= now.getTime());
  if (dueToEnd?.opening_prices) {
    const entries = await readEntries(supabase, dueToEnd.id);
    const closing = await readChainlinkPrices();
    requireFreshEntryPrices(entries, closing);
    const scores = entries.map((entry) => {
      const score = scoreGameWeek(entry.lineup, dueToEnd.opening_prices!, closing);
      return { id: entry.id, return_bps: score.returnBps, points: Math.max(0, score.points - entry.transfer_penalty_points) };
    });
    const settled = await supabase.rpc("settle_game_week", { p_game_week_id: dueToEnd.id, p_closing_prices: closing, p_scores: scores });
    if (settled.error) throw settled.error;
    if (!settled.data) return result;
    result.settled = dueToEnd.id;
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
  const nextStart = new Date(Date.parse(week.starts_at) + 7 * 24 * 60 * 60 * 1000);
  const nextEnd = new Date(Date.parse(week.ends_at) + 7 * 24 * 60 * 60 * 1000);
  const next = await supabase.from("game_weeks").upsert({
    label: `GAME WEEK ${nextStart.toISOString().slice(0, 10)}`,
    status: "upcoming",
    entry_lock_at: nextStart.toISOString(),
    starts_at: nextStart.toISOString(),
    ends_at: nextEnd.toISOString(),
  }, { onConflict: "label", ignoreDuplicates: true });
  if (next.error) throw next.error;
}
