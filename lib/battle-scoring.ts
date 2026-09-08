export type PricePoint = {
  ticker: string;
  price: number;
  updatedAt: string;
  fresh: boolean;
};

export type ScoredPick = {
  ticker: string;
  virtualAmount: number;
};

export function priceReturn(start: number, current: number) {
  if (!Number.isFinite(start) || !Number.isFinite(current) || start <= 0) return 0;
  return ((current / start) - 1) * 100;
}

export function scoreLineup(picks: ScoredPick[], start: PricePoint[], current: PricePoint[], budget = 1_000) {
  if (budget <= 0) return 0;

  return picks.reduce((score, pick) => {
    const opening = start.find((point) => point.ticker === pick.ticker);
    const latest = current.find((point) => point.ticker === pick.ticker);
    if (!opening || !latest) return score;
    return score + priceReturn(opening.price, latest.price) * (pick.virtualAmount / budget);
  }, 0);
}

export function hasUsablePrices(tickers: string[], prices: PricePoint[]) {
  return tickers.every((ticker) => {
    const point = prices.find((item) => item.ticker === ticker);
    return Boolean(point && point.fresh && point.price > 0);
  });
}
