import { scoreLineup, type PricePoint, type ScoredPick } from "./battle-scoring.ts";

export type GameWeekScore = { returnPercent: number; returnBps: number; points: number };
export type GameWeekSnapshot = { capturedAt: string; prices: PricePoint[] };
export type GameWeekHistoryPoint = { capturedAt: string; points: number; returnPercent: number };

export function scoreGameWeek(picks: ScoredPick[], opening: PricePoint[], current: PricePoint[]): GameWeekScore {
  const returnPercent = scoreLineup(picks, opening, current);
  const returnBps = Math.round(returnPercent * 100);
  return { returnPercent, returnBps, points: Math.max(0, 1_000 + returnBps) };
}

export function rankGameWeek<T extends GameWeekScore>(entries: T[]) {
  const ordered = [...entries].sort((a, b) => b.points - a.points || b.returnBps - a.returnBps);
  return ordered.map((entry, index) => ({ ...entry, rank: index > 0 && entry.points === ordered[index - 1].points ? ordered.findIndex((item) => item.points === entry.points) + 1 : index + 1 }));
}

export function buildGameWeekHistory(picks: ScoredPick[], opening: PricePoint[], snapshots: GameWeekSnapshot[], transferPenaltyPoints = 0): GameWeekHistoryPoint[] {
  return [...snapshots]
    .sort((left, right) => Date.parse(left.capturedAt) - Date.parse(right.capturedAt))
    .map((snapshot) => {
      const score = scoreGameWeek(picks, opening, snapshot.prices);
      return { capturedAt: snapshot.capturedAt, points: Math.max(0, score.points - transferPenaltyPoints), returnPercent: Math.round(score.returnPercent * 10_000) / 10_000 };
    });
}
