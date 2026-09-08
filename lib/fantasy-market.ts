import { VIRTUAL_BUDGET } from "./allocations.ts";
import type { PricePoint, ScoredPick } from "./battle-scoring.ts";
import { STOCKS } from "./stocks.ts";

export type DraftMarketStock = {
  ticker: string;
  price: number;
  draftCost: number;
  updatedAt: string;
  fresh: boolean;
};

export function draftCostFromOnchainPrice(price: number) {
  if (!Number.isFinite(price) || price <= 0) return null;
  return Math.max(25, Math.min(500, Math.round(price)));
}

export function createDraftMarket(prices: PricePoint[]): DraftMarketStock[] {
  return STOCKS.flatMap((stock) => {
    const point = prices.find((item) => item.ticker === stock.ticker);
    const draftCost = point ? draftCostFromOnchainPrice(point.price) : null;
    return point && draftCost ? [{ ticker: stock.ticker, price: point.price, draftCost, updatedAt: point.updatedAt, fresh: point.fresh }] : [];
  });
}

export function priceSquad(tickers: string[], market: DraftMarketStock[]): ScoredPick[] | null {
  if (tickers.length < 3 || tickers.length > 5 || new Set(tickers).size !== tickers.length) return null;
  const picks = tickers.map((ticker) => {
    const quote = market.find((item) => item.ticker === ticker);
    return quote?.fresh ? { ticker, virtualAmount: quote.draftCost } : null;
  });
  if (picks.some((pick) => !pick)) return null;
  const priced = picks as ScoredPick[];
  return priced.reduce((sum, pick) => sum + pick.virtualAmount, 0) <= VIRTUAL_BUDGET ? priced : null;
}

export function squadBank(picks: ScoredPick[]) {
  return VIRTUAL_BUDGET - picks.reduce((sum, pick) => sum + pick.virtualAmount, 0);
}

export function transferCount(before: ScoredPick[], after: ScoredPick[]) {
  const previous = new Set(before.map((pick) => pick.ticker));
  return after.filter((pick) => !previous.has(pick.ticker)).length;
}

export function transferPenaltyPoints(transfersUsed: number, freeTransfers = 1, pointsPerTransfer = 25) {
  return Math.max(0, transfersUsed - freeTransfers) * pointsPerTransfer;
}
