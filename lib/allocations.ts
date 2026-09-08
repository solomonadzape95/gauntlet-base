export const VIRTUAL_BUDGET = 1_000;

export function makeEvenAllocations(tickers: string[]) {
  if (tickers.length === 0) return {};
  const baseAmount = Math.floor(VIRTUAL_BUDGET / tickers.length);
  const remainder = VIRTUAL_BUDGET - baseAmount * tickers.length;

  return Object.fromEntries(
    tickers.map((ticker, index) => [ticker, baseAmount + (index < remainder ? 1 : 0)]),
  );
}

/** Converts portfolio weights into whole cents without losing a cent to rounding. */
export function allocateByWeight(weights: number[], totalCents: number) {
  const weightTotal = weights.reduce((total, weight) => total + weight, 0);
  if (weightTotal <= 0 || totalCents <= 0) return weights.map(() => 0);

  const raw = weights.map((weight) => (weight / weightTotal) * totalCents);
  const cents = raw.map(Math.floor);
  const remainder = totalCents - cents.reduce((total, value) => total + value, 0);
  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  for (let index = 0; index < remainder; index += 1) cents[order[index].index] += 1;
  return cents;
}
