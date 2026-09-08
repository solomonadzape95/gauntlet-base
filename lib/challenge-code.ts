import type { ScoredPick } from "./battle-scoring.ts";
import { STOCKS } from "./stocks.ts";

type ChallengePayload = { v: 1; p: [string, number][] };

export function encodeChallenge(picks: ScoredPick[]) {
  const payload: ChallengePayload = { v: 1, p: picks.map((pick) => [pick.ticker, pick.virtualAmount]) };
  return btoa(JSON.stringify(payload)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function decodeChallenge(code: string | null): ScoredPick[] | null {
  if (!code || code.length > 500) return null;
  try {
    const padded = code.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(code.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as Partial<ChallengePayload>;
    if (payload.v !== 1 || !Array.isArray(payload.p) || payload.p.length < 3 || payload.p.length > 5) return null;
    const allowed = new Set(STOCKS.map((stock) => stock.ticker));
    const picks = payload.p.map((item) => ({ ticker: item[0], virtualAmount: item[1] }));
    const tickers = picks.map((pick) => pick.ticker);
    if (new Set(tickers).size !== tickers.length) return null;
    if (!picks.every((pick) => allowed.has(pick.ticker) && Number.isInteger(pick.virtualAmount) && pick.virtualAmount > 0)) return null;
    if (picks.reduce((sum, pick) => sum + pick.virtualAmount, 0) !== 100_000) return null;
    return picks;
  } catch {
    return null;
  }
}
