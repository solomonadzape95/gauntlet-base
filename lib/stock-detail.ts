import type { PricePoint } from "./battle-scoring.ts";

export type StockTracePoint = { capturedAt: string; price: number };
export type StockTraceSnapshot = { capturedAt: string; prices: PricePoint[] };

export function buildStockTrace(ticker: string, snapshots: StockTraceSnapshot[]) {
  const points = snapshots.flatMap((snapshot) => {
    const point = snapshot.prices.find((price) => price.ticker === ticker);
    return point && Number.isFinite(point.price) && point.price > 0
      ? [{ capturedAt: snapshot.capturedAt, price: point.price }]
      : [];
  }).sort((left, right) => Date.parse(left.capturedAt) - Date.parse(right.capturedAt));

  if (!points.length) return { points, changePercent: null, low: null, high: null };
  const prices = points.map((point) => point.price);
  const opening = prices[0];
  const closing = prices.at(-1)!;
  return {
    points,
    changePercent: opening > 0 ? ((closing - opening) / opening) * 100 : null,
    low: Math.min(...prices),
    high: Math.max(...prices),
  };
}
