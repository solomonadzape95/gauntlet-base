import assert from "node:assert/strict";
import test from "node:test";

import { createDraftMarket, draftCostFromOnchainPrice, priceSquad, squadBank, transferCount, transferPenaltyPoints } from "../lib/fantasy-market.ts";

const point = (ticker: string, price: number, fresh = true) => ({ ticker, price, fresh, updatedAt: "2026-09-08T00:00:00.000Z" });

test("turns onchain prices into bounded whole-credit draft costs", () => {
  assert.equal(draftCostFromOnchainPrice(172.49), 172);
  assert.equal(draftCostFromOnchainPrice(9), 25);
  assert.equal(draftCostFromOnchainPrice(738), 500);
  assert.equal(draftCostFromOnchainPrice(0), null);
});

test("prices a valid affordable squad and leaves the rest in the bank", () => {
  const market = createDraftMarket([point("NVDAc", 172), point("AAPLc", 234), point("TSLAc", 419)]);
  const squad = priceSquad(["NVDAc", "AAPLc", "TSLAc"], market);
  assert.deepEqual(squad, [
    { ticker: "NVDAc", virtualAmount: 172 },
    { ticker: "AAPLc", virtualAmount: 234 },
    { ticker: "TSLAc", virtualAmount: 419 },
  ]);
  assert.equal(squadBank(squad!), 175);
  assert.equal(priceSquad(["NVDAc", "AAPLc", "TSLAc"], market.map((item) => ({ ...item, draftCost: 500 }))), null);
});

test("counts incoming stocks and charges only after the free transfer", () => {
  const before = [{ ticker: "AAPLc", virtualAmount: 200 }, { ticker: "NVDAc", virtualAmount: 200 }, { ticker: "TSLAc", virtualAmount: 300 }];
  const after = [{ ticker: "AAPLc", virtualAmount: 200 }, { ticker: "MSFTc", virtualAmount: 300 }, { ticker: "AMZNc", virtualAmount: 200 }];
  assert.equal(transferCount(before, after), 2);
  assert.equal(transferPenaltyPoints(1), 0);
  assert.equal(transferPenaltyPoints(2), 25);
});
