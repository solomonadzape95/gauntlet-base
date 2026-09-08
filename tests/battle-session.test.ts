import assert from "node:assert/strict";
import test from "node:test";

import { BATTLE_DURATION_MS, createBattleSession, parseBattleSession, remainingBattleSeconds } from "../lib/battle-session.ts";

const picks = ["AAPLc", "NVDAc", "TSLAc"].map((ticker, index) => ({ ticker, virtualAmount: index === 2 ? 334 : 333 }));
const prices = picks.map(({ ticker }) => ({ ticker, price: 100, fresh: true, updatedAt: "2026-09-08T12:00:00.000Z" }));

test("creates a 24-hour battle with an immutable opening snapshot", () => {
  const now = new Date("2026-09-08T12:00:00.000Z");
  const session = createBattleSession({ playerDraftId: "draft-1", playerPicks: picks, rivalPicks: picks, openingPrices: prices, now });
  assert.equal(Date.parse(session.endsAt) - Date.parse(session.startedAt), BATTLE_DURATION_MS);
  assert.deepEqual(session.openingPrices, prices);
  assert.equal(remainingBattleSeconds(session, new Date("2026-09-08T13:00:00.000Z")), 23 * 60 * 60);
});

test("parses a valid persisted battle and rejects malformed state", () => {
  const session = createBattleSession({ playerDraftId: "draft-1", playerPicks: picks, rivalPicks: picks, openingPrices: prices, sharedBattleId: "550e8400-e29b-41d4-a716-446655440000", serverRole: "creator", ownerUserId: "user-1" });
  assert.equal(parseBattleSession(JSON.stringify(session))?.serverRole, "creator");
  assert.equal(parseBattleSession(JSON.stringify(session))?.sharedBattleId, "550e8400-e29b-41d4-a716-446655440000");
  assert.equal(parseBattleSession(JSON.stringify(session))?.ownerUserId, "user-1");
  assert.equal(parseBattleSession('{"version":1}'), null);
  assert.equal(parseBattleSession(JSON.stringify({ ...session, serverRole: "spectator" })), null);
  assert.equal(parseBattleSession("not json"), null);
});
