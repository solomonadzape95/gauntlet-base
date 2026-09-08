import type { SupabaseClient } from "@supabase/supabase-js";

import { hasUsablePrices, type ScoredPick } from "./battle-scoring.ts";
import { readChainlinkPrices } from "./chainlink-market.ts";

type ExpiredBattle = { id: string; player_picks: ScoredPick[]; opponent_picks: ScoredPick[] | null };

export async function settleExpiredBattles(supabase: SupabaseClient, now = new Date()) {
  const expired = await supabase.from("battles").select("id,player_picks,opponent_picks").eq("status", "active").lte("ends_at", now.toISOString()).returns<ExpiredBattle[]>();
  if (expired.error) throw expired.error;
  if (!expired.data.length) return 0;
  const prices = await readChainlinkPrices();
  let settled = 0;
  for (const battle of expired.data) {
    const tickers = [...battle.player_picks, ...(battle.opponent_picks ?? [])].map((pick) => pick.ticker);
    if (!hasUsablePrices(tickers, prices)) continue;
    const update = await supabase.from("battles").update({ status: "complete", end_prices: prices, settled_at: now.toISOString() }).eq("id", battle.id).eq("status", "active").is("end_prices", null);
    if (update.error) throw update.error;
    settled += 1;
  }
  return settled;
}
