import assert from "node:assert/strict";
import test from "node:test";

import { isRecentSnapshot, minuteBucket, nextGameWeekWindow, selectGameWeekWork } from "../lib/game-week-schedule.ts";

const week = (id: string, status: "upcoming" | "active", startsAt: string, endsAt: string) => ({
  id,
  status,
  starts_at: startsAt,
  ends_at: endsAt,
});

test("settles an expired active week before opening an overdue successor", () => {
  const work = selectGameWeekWork([
    week("next", "upcoming", "2026-09-14T14:30:00.000Z", "2026-09-18T21:00:00.000Z"),
    week("current", "active", "2026-09-07T14:30:00.000Z", "2026-09-11T21:00:00.000Z"),
  ], new Date("2026-09-14T14:31:00.000Z"));

  assert.deepEqual(work, { settleId: "current", activateId: null, liveId: null });
});

test("opens only the earliest due week when no week is active", () => {
  const work = selectGameWeekWork([
    week("later", "upcoming", "2026-09-21T14:30:00.000Z", "2026-09-25T21:00:00.000Z"),
    week("first", "upcoming", "2026-09-14T14:30:00.000Z", "2026-09-18T21:00:00.000Z"),
  ], new Date("2026-09-22T00:00:00.000Z"));

  assert.deepEqual(work, { settleId: null, activateId: "first", liveId: null });
});

test("records a live snapshot only for a running week", () => {
  const work = selectGameWeekWork([
    week("current", "active", "2026-09-07T14:30:00.000Z", "2026-09-11T21:00:00.000Z"),
  ], new Date("2026-09-10T12:07:42.000Z"));

  assert.deepEqual(work, { settleId: null, activateId: null, liveId: "current" });
  assert.equal(minuteBucket(new Date("2026-09-10T12:07:42.987Z")), "2026-09-10T12:07:00.000Z");
  assert.equal(isRecentSnapshot("2026-09-10T12:05:01.000Z", new Date("2026-09-10T12:08:00.000Z")), true);
  assert.equal(isRecentSnapshot("2026-09-10T12:04:59.000Z", new Date("2026-09-10T12:08:00.000Z")), false);
});

test("creates the successor from the previous canonical window", () => {
  assert.deepEqual(nextGameWeekWindow({
    starts_at: "2026-09-07T14:30:00.000Z",
    ends_at: "2026-09-11T21:00:00.000Z",
  }), {
    label: "GAME WEEK 2026-09-14",
    entry_lock_at: "2026-09-14T14:30:00.000Z",
    starts_at: "2026-09-14T14:30:00.000Z",
    ends_at: "2026-09-18T21:00:00.000Z",
  });
});
