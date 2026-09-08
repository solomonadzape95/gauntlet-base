import assert from "node:assert/strict";
import test from "node:test";

import { isUuid, normalizeLineup } from "../lib/battle-record.ts";

const lineup = [
  { ticker: "NVDAc", virtualAmount: 33_333 },
  { ticker: "AAPLc", virtualAmount: 33_333 },
  { ticker: "TSLAc", virtualAmount: 33_334 },
];

test("normalizes only complete supported lineups", () => {
  assert.deepEqual(normalizeLineup(lineup), lineup);
  assert.equal(normalizeLineup(lineup.map((pick) => ({ ...pick, virtualAmount: 1 }))), null);
  assert.equal(normalizeLineup([lineup[0], lineup[0], lineup[2]]), null);
  assert.equal(normalizeLineup([{ ...lineup[0], ticker: "FAKEc" }, lineup[1], lineup[2]]), null);
});

test("recognizes canonical UUIDs used by public battle routes", () => {
  assert.equal(isUuid("550e8400-e29b-41d4-a716-446655440000"), true);
  assert.equal(isUuid("battle-demo"), false);
});
