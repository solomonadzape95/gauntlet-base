import type { PricePoint, ScoredPick } from "./battle-scoring.ts";
import { VIRTUAL_BUDGET } from "./allocations.ts";
import { STOCKS } from "./stocks.ts";

type ChallengePayload = { v: 2; i: string; e: string; p: [string, number][]; s: [string, number, string][] };

export type Challenge = {
  id: string;
  endsAt: string;
  picks: ScoredPick[];
  openingPrices: PricePoint[];
};

export function encodeChallenge(challenge: Challenge) {
  const payload: ChallengePayload = {
    v: 2,
    i: challenge.id,
    e: challenge.endsAt,
    p: challenge.picks.map((pick) => [pick.ticker, pick.virtualAmount]),
    s: challenge.openingPrices.map((point) => [point.ticker, point.price, point.updatedAt]),
  };
  return btoa(JSON.stringify(payload)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function decodeChallenge(code: string | null): Challenge | null {
  if (!code || code.length > 4_000) return null;
  try {
    const padded = code.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(code.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as Partial<ChallengePayload>;
    if (payload.v !== 2 || typeof payload.i !== "string" || !isDate(payload.e) || !Array.isArray(payload.p) || payload.p.length < 3 || payload.p.length > 5 || !Array.isArray(payload.s)) return null;
    const allowed = new Set(STOCKS.map((stock) => stock.ticker));
    const picks = payload.p.map((item) => ({ ticker: item[0], virtualAmount: item[1] }));
    const tickers = picks.map((pick) => pick.ticker);
    if (new Set(tickers).size !== tickers.length) return null;
    if (!picks.every((pick) => allowed.has(pick.ticker) && Number.isInteger(pick.virtualAmount) && pick.virtualAmount > 0)) return null;
    if (picks.reduce((sum, pick) => sum + pick.virtualAmount, 0) !== VIRTUAL_BUDGET) return null;
    const openingPrices = payload.s.map((item) => ({ ticker: item[0], price: item[1], updatedAt: item[2], fresh: true }));
    if (!STOCKS.every((stock) => openingPrices.some((point) => point.ticker === stock.ticker && Number.isFinite(point.price) && point.price > 0 && isDate(point.updatedAt)))) return null;
    return { id: payload.i, endsAt: payload.e, picks, openingPrices };
  } catch {
    return null;
  }
}

function isDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}
