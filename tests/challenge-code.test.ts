import assert from "node:assert/strict";
import test from "node:test";

import { decodeChallenge, encodeChallenge, type Challenge } from "../lib/challenge-code.ts";
import { STOCKS } from "../lib/stocks.ts";

const picks = [
  { ticker: "AAPLc", virtualAmount: 400 },
  { ticker: "NVDAc", virtualAmount: 350 },
  { ticker: "TSLAc", virtualAmount: 250 },
];
const challenge: Challenge = {
  id: "battle-1",
  endsAt: "2026-09-09T12:00:00.000Z",
  picks,
  openingPrices: STOCKS.map(({ ticker }) => ({ ticker, price: 100, fresh: true, updatedAt: "2026-09-08T12:00:00.000Z" })),
};

test("round-trips a battle identity, end time, lineup, and opening snapshot", () => {
  assert.deepEqual(decodeChallenge(encodeChallenge(challenge)), challenge);
});

test("rejects corrupt, unknown, duplicate, or underfunded lineups", () => {
  assert.equal(decodeChallenge("not-base64"), null);
  assert.equal(decodeChallenge(encodeChallenge({ ...challenge, picks: [{ ...picks[0], ticker: "FAKEc" }, picks[1], picks[2]] })), null);
  assert.equal(decodeChallenge(encodeChallenge({ ...challenge, picks: [picks[0], picks[0], picks[2]] })), null);
  assert.equal(decodeChallenge(encodeChallenge({ ...challenge, picks: picks.map((pick) => ({ ...pick, virtualAmount: 1 })) })), null);
});
