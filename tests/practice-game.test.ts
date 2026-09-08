import assert from "node:assert/strict";
import test from "node:test";

import { parsePracticeDraftSnapshot } from "../lib/practice-game.ts";

test("migrates a legacy $100,000 browser team to the $1,000 scale", () => {
  const legacy = [{
    id: "draft-old",
    createdAt: "2026-09-08T00:00:00.000Z",
    status: "virtual",
    picks: [
      { ticker: "NVDAc", virtualAmount: 33_334 },
      { ticker: "AAPLc", virtualAmount: 33_333 },
      { ticker: "TSLAc", virtualAmount: 33_333 },
    ],
  }];

  const [team] = parsePracticeDraftSnapshot(JSON.stringify(legacy));
  assert.equal(team.picks.reduce((sum, pick) => sum + pick.virtualAmount, 0), 1_000);
  assert.deepEqual(team.picks.map((pick) => pick.virtualAmount), [334, 333, 333]);
});
