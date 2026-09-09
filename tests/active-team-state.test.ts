import assert from "node:assert/strict";
import test from "node:test";

import { selectVisibleTeam } from "../lib/active-team-state.ts";

const dummy = { id: "practice", createdAt: "2026-09-09T00:00:00.000Z", status: "virtual" as const, picks: [{ ticker: "NVDAc", virtualAmount: 250 }] };

test("an unverified visitor never sees a browser practice team on Draft", () => {
  assert.equal(selectVisibleTeam({ verified: false, remoteReady: true, remoteTeam: null, localTeam: dummy }), null);
});

test("a verified player without a persisted team reaches the empty-team builder", () => {
  assert.equal(selectVisibleTeam({ verified: true, remoteReady: true, remoteTeam: null, localTeam: dummy }), null);
});

test("a verified player sees only their persisted active team", () => {
  assert.equal(selectVisibleTeam({ verified: true, remoteReady: true, remoteTeam: dummy, localTeam: null }), dummy);
});
