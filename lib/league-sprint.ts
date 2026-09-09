export const LEAGUE_SPRINT_MINUTES = 5;

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
