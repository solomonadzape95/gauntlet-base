import type { PricePoint, ScoredPick } from "./battle-scoring.ts";
import { STOCKS } from "./stocks.ts";

export type BattleRecord = {
  id: string;
  status: "waiting" | "active" | "complete";
  player_picks: ScoredPick[];
  opponent_picks: ScoredPick[] | null;
  opening_prices: PricePoint[] | null;
  end_prices: PricePoint[] | null;
  starts_at: string | null;
  ends_at: string | null;
  settled_at: string | null;
};

export const BATTLE_RECORD_SELECTION = "id,status,player_picks,opponent_picks,opening_prices,end_prices,starts_at,ends_at,settled_at";

export function createBattleWindow(now = new Date()) {
  return {
    startsAt: now.toISOString(),
    endsAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

export function normalizeLineup(value: unknown): ScoredPick[] | null {
  if (!Array.isArray(value) || value.length < 3 || value.length > 5) return null;
  const allowed = new Set(STOCKS.map((stock) => stock.ticker));
  const picks = value.map((item) => {
    if (!item || typeof item !== "object") return null;
    const pick = item as Record<string, unknown>;
    return { ticker: pick.ticker, virtualAmount: pick.virtualAmount };
  });
  if (picks.some((pick) => !pick || typeof pick.ticker !== "string" || !allowed.has(pick.ticker) || !Number.isInteger(pick.virtualAmount) || Number(pick.virtualAmount) <= 0)) return null;
  const normalized = picks as ScoredPick[];
  if (new Set(normalized.map((pick) => pick.ticker)).size !== normalized.length) return null;
  return normalized.reduce((sum, pick) => sum + pick.virtualAmount, 0) === 100_000 ? normalized : null;
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
