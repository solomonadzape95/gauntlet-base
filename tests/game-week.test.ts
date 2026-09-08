import assert from "node:assert/strict";
import test from "node:test";

import { rankGameWeek, scoreGameWeek } from "../lib/game-week.ts";

const point = (ticker: string, price: number) => ({ ticker, price, fresh: true, updatedAt: "2026-09-08T00:00:00.000Z" });
const picks = [{ ticker: "AAPLc", virtualAmount: 600 }, { ticker: "NVDAc", virtualAmount: 400 }];

test("turns weighted game-week return into transparent performance points", () => {
  const score = scoreGameWeek(picks, [point("AAPLc", 100), point("NVDAc", 100)], [point("AAPLc", 110), point("NVDAc", 95)]);
  assert.ok(Math.abs(score.returnPercent - 4) < 1e-9);
  assert.deepEqual({ returnBps: score.returnBps, points: score.points }, { returnBps: 400, points: 1_400 });
});

test("ranks equal scores as ties and never awards negative points", () => {
  assert.deepEqual(rankGameWeek([{ points: 1200, returnBps: 200, returnPercent: 2 }, { points: 1200, returnBps: 200, returnPercent: 2 }, { points: 900, returnBps: -100, returnPercent: -1 }]).map((entry) => entry.rank), [1, 1, 3]);
  const loss = scoreGameWeek(picks, [point("AAPLc", 100), point("NVDAc", 100)], [point("AAPLc", 0.01), point("NVDAc", 0.01)]);
  assert.equal(loss.points, 0);
});
