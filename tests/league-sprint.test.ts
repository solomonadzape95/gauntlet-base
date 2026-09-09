import assert from "node:assert/strict";
import test from "node:test";

import { LEAGUE_SPRINT_MINUTES, leagueSprintState, rankLeagueSprint } from "../lib/league-sprint.ts";

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
