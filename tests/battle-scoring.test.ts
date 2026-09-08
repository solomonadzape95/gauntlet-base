import assert from "node:assert/strict";
import test from "node:test";

import { hasUsablePrices, priceReturn, scoreLineup, type PricePoint } from "../lib/battle-scoring.ts";

const point = (ticker: string, price: number, fresh = true): PricePoint => ({ ticker, price, fresh, updatedAt: "2026-09-08T00:00:00.000Z" });

test("priceReturn calculates movement from the locked opening value", () => {
  assert.ok(Math.abs(priceReturn(100, 110) - 10) < 1e-9);
  assert.ok(Math.abs(priceReturn(100, 90) + 10) < 1e-9);
  assert.equal(priceReturn(0, 90), 0);
});

test("scoreLineup weights returns by virtual allocation", () => {
  const picks = [{ ticker: "AAPLc", virtualAmount: 75_000 }, { ticker: "NVDAc", virtualAmount: 25_000 }];
  const start = [point("AAPLc", 100), point("NVDAc", 100)];
  const current = [point("AAPLc", 110), point("NVDAc", 80)];
  assert.ok(Math.abs(scoreLineup(picks, start, current) - 2.5) < 1e-9);
});

test("hasUsablePrices rejects missing or stale feeds", () => {
  assert.equal(hasUsablePrices(["AAPLc"], [point("AAPLc", 100)]), true);
  assert.equal(hasUsablePrices(["AAPLc"], [point("AAPLc", 100, false)]), false);
  assert.equal(hasUsablePrices(["AAPLc", "NVDAc"], [point("AAPLc", 100)]), false);
});
