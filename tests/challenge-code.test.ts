import assert from "node:assert/strict";
import test from "node:test";

import { decodeChallenge, encodeChallenge } from "../lib/challenge-code.ts";

const picks = [
  { ticker: "AAPLc", virtualAmount: 40_000 },
  { ticker: "NVDAc", virtualAmount: 35_000 },
  { ticker: "TSLAc", virtualAmount: 25_000 },
];

test("round-trips a valid challenge lineup", () => {
  assert.deepEqual(decodeChallenge(encodeChallenge(picks)), picks);
});

test("rejects corrupt, unknown, duplicate, or underfunded lineups", () => {
  assert.equal(decodeChallenge("not-base64"), null);
  assert.equal(decodeChallenge(encodeChallenge([{ ...picks[0], ticker: "FAKEc" }, picks[1], picks[2]])), null);
  assert.equal(decodeChallenge(encodeChallenge([picks[0], picks[0], picks[2]])), null);
  assert.equal(decodeChallenge(encodeChallenge(picks.map((pick) => ({ ...pick, virtualAmount: 1 })))), null);
});
