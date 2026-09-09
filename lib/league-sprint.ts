import { priceReturn, scoreLineup, type PricePoint, type ScoredPick } from "./battle-scoring.ts";

export const LEAGUE_SPRINT_MINUTES = 2;

export type LeagueSprintScore = { points: number; returnPercent: number };
export type LeagueStockStat = { ticker: string; returnPercent: number };

function roundedPercent(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function scoreLeagueSprint(picks: ScoredPick[], opening: PricePoint[], current: PricePoint[]): LeagueSprintScore {
  const returnPercent = roundedPercent(scoreLineup(picks, opening, current));
  return { returnPercent, points: Math.round(returnPercent * 10_000) };
}

export function summarizeLeagueStocks(lineups: ScoredPick[][], opening: PricePoint[], current: PricePoint[]) {
  const pickCounts = new Map<string, number>();
  for (const lineup of lineups) for (const pick of lineup) pickCounts.set(pick.ticker, (pickCounts.get(pick.ticker) ?? 0) + 1);
  const movers = [...pickCounts].flatMap(([ticker]) => {
    const start = opening.find((point) => point.ticker === ticker);
    const latest = current.find((point) => point.ticker === ticker);
    return start && latest ? [{ ticker, returnPercent: roundedPercent(priceReturn(start.price, latest.price)) }] : [];
  }).sort((left, right) => right.returnPercent - left.returnPercent || left.ticker.localeCompare(right.ticker));
  const mostPicked = [...pickCounts].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0];
  return {
    best: movers[0] ?? null,
    worst: movers.at(-1) ?? null,
    mostPicked: mostPicked ? { ticker: mostPicked[0], teams: mostPicked[1] } : null,
  };
}

export function leagueSprintState(startsAt: string, endsAt: string, now = new Date()): "active" | "complete" {
  const starts = Date.parse(startsAt);
  const ends = Date.parse(endsAt);
  return Number.isFinite(starts) && Number.isFinite(ends) && now.getTime() >= starts && now.getTime() < ends ? "active" : "complete";
}

export function rankLeagueSprint<T extends { points: number }>(entries: T[]) {
  const ordered = [...entries].sort((left, right) => right.points - left.points);
  return ordered.map((entry, index) => ({
    ...entry,
    rank: index > 0 && entry.points === ordered[index - 1].points
      ? ordered.findIndex((candidate) => candidate.points === entry.points) + 1
      : index + 1,
  }));
}
