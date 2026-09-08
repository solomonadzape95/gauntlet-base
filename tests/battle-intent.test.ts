import assert from "node:assert/strict";
import test from "node:test";

import { resolveBattleIntent, storedSessionMatchesIntent } from "../lib/battle-intent.ts";
import { createBattleSession } from "../lib/battle-session.ts";

const picks = ["AAPLc", "NVDAc", "TSLAc"].map((ticker, index) => ({ ticker, virtualAmount: index === 2 ? 334 : 333 }));
const prices = picks.map(({ ticker }) => ({ ticker, price: 100, fresh: true, updatedAt: "2026-09-08T12:00:00.000Z" }));

test("a bare battle URL never resurrects a stored practice battle", () => {
  const stored = createBattleSession({ playerDraftId: "team-1", playerPicks: picks, rivalPicks: picks, openingPrices: prices });
  const intent = resolveBattleIntent(new URLSearchParams());
  assert.deepEqual(intent, { kind: "hub" });
  assert.equal(storedSessionMatchesIntent(stored, intent, true), false);
});

test("a deleted durable battle never falls back to its local snapshot", () => {
  const stored = createBattleSession({ playerDraftId: "team-1", playerPicks: picks, rivalPicks: picks, openingPrices: prices, serverBattleId: "550e8400-e29b-41d4-a716-446655440000" });
  const intent = resolveBattleIntent(new URLSearchParams("battle=550e8400-e29b-41d4-a716-446655440000"));
  assert.equal(storedSessionMatchesIntent(stored, intent, false), false);
});

test("practice mode and an existing durable battle select only their own sessions", () => {
  const practice = createBattleSession({ playerDraftId: "team-1", playerPicks: picks, rivalPicks: picks, openingPrices: prices });
  const durable = createBattleSession({ playerDraftId: "team-1", playerPicks: picks, rivalPicks: picks, openingPrices: prices, serverBattleId: "550e8400-e29b-41d4-a716-446655440000" });
  assert.equal(storedSessionMatchesIntent(practice, { kind: "practice" }, true), true);
  assert.equal(storedSessionMatchesIntent(practice, { kind: "practice", reset: true }, true), false);
  assert.equal(storedSessionMatchesIntent(durable, { kind: "durable", battleId: "550e8400-e29b-41d4-a716-446655440000" }, true), true);
  assert.equal(storedSessionMatchesIntent(practice, { kind: "durable", battleId: "550e8400-e29b-41d4-a716-446655440000" }, true), false);
});
