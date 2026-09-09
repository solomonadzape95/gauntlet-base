import assert from "node:assert/strict";
import test from "node:test";

import { buildStockTrace } from "../lib/stock-detail.ts";

test("builds a chronological stock trace from real game-week snapshots", () => {
  const trace = buildStockTrace("NVDAc", [
    { capturedAt: "2026-09-09T12:10:00.000Z", prices: [{ ticker: "NVDAc", price: 110, updatedAt: "2026-09-09T12:09:00.000Z", fresh: true }] },
    { capturedAt: "2026-09-09T12:00:00.000Z", prices: [{ ticker: "NVDAc", price: 100, updatedAt: "2026-09-09T11:59:00.000Z", fresh: true }] },
    { capturedAt: "2026-09-09T12:05:00.000Z", prices: [{ ticker: "AAPLc", price: 200, updatedAt: "2026-09-09T12:04:00.000Z", fresh: true }] },
  ]);

  assert.deepEqual(trace.points, [
    { capturedAt: "2026-09-09T12:00:00.000Z", price: 100 },
    { capturedAt: "2026-09-09T12:10:00.000Z", price: 110 },
  ]);
  assert.equal(trace.changePercent, 10);
  assert.equal(trace.low, 100);
  assert.equal(trace.high, 110);
});

test("returns an honest empty trace when the stock has no recorded snapshots", () => {
  assert.deepEqual(buildStockTrace("NVDAc", []), { points: [], changePercent: null, low: null, high: null });
});
