import assert from "node:assert/strict";
import test from "node:test";

import { LEAGUE_SPRINT_MINUTES, leagueSprintState, rankLeagueSprint, scoreLeagueSprint, summarizeLeagueStocks } from "../lib/league-sprint.ts";

const opening = [
  { ticker: "NVDAc", price: 100, updatedAt: "2026-09-09T12:00:00.000Z", fresh: true },
  { ticker: "AAPLc", price: 200, updatedAt: "2026-09-09T12:00:00.000Z", fresh: true },
];

test("recording league runs for under three minutes", () => {
  assert.equal(LEAGUE_SPRINT_MINUTES, 2);
});

test("a recording sprint becomes complete at its two-minute boundary", () => {
  const startsAt = "2026-09-09T12:00:00.000Z";
  const endsAt = "2026-09-09T12:02:00.000Z";
  assert.equal(leagueSprintState(startsAt, endsAt, new Date("2026-09-09T12:01:59.000Z")), "active");
  assert.equal(leagueSprintState(startsAt, endsAt, new Date("2026-09-09T12:02:00.000Z")), "complete");
});

test("quick-league entries rank by real score and preserve ties", () => {
  assert.deepEqual(rankLeagueSprint([
    { id: "a", points: 1002 },
    { id: "b", points: 1008 },
    { id: "c", points: 1002 },
  ]), [
    { id: "b", points: 1008, rank: 1 },
    { id: "a", points: 1002, rank: 2 },
    { id: "c", points: 1002, rank: 2 },
  ]);
});

test("quick leagues score fine movement from zero instead of adding the game-week baseline", () => {
  const score = scoreLeagueSprint(
    [{ ticker: "NVDAc", virtualAmount: 1_000 }],
    opening,
    [{ ...opening[0], price: 100.01 }],
  );
  assert.deepEqual(score, { points: 100, returnPercent: 0.01 });
  assert.equal(scoreLeagueSprint([{ ticker: "NVDAc", virtualAmount: 1_000 }], opening, opening).points, 0);
});

test("quick-league stock stats expose the best, worst, and most-picked stocks", () => {
  const stats = summarizeLeagueStocks([
    [{ ticker: "NVDAc", virtualAmount: 600 }, { ticker: "AAPLc", virtualAmount: 400 }],
    [{ ticker: "NVDAc", virtualAmount: 1_000 }],
  ], opening, [
    { ...opening[0], price: 101 },
    { ...opening[1], price: 198 },
  ]);
  assert.deepEqual(stats, {
    best: { ticker: "NVDAc", returnPercent: 1 },
    worst: { ticker: "AAPLc", returnPercent: -1 },
    mostPicked: { ticker: "NVDAc", teams: 2 },
  });
});
