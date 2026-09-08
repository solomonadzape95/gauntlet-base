import assert from "node:assert/strict";
import test from "node:test";

import { evaluatePurchaseEligibility } from "../lib/eligibility.ts";

test("blocks US requests", () => {
  assert.deepEqual(
    evaluatePurchaseEligibility({ country: "us", production: true }),
    { country: "US", eligible: false, reason: "us_blocked" },
  );
});

test("fails closed when production location is unknown", () => {
  assert.equal(evaluatePurchaseEligibility({ production: true }).reason, "location_unknown");
  assert.equal(evaluatePurchaseEligibility({ production: true }).eligible, false);
});

test("accepts a valid non-US country", () => {
  assert.deepEqual(
    evaluatePurchaseEligibility({ country: "ng", production: true }),
    { country: "NG", eligible: true, reason: "eligible" },
  );
});

test("allows an explicit development country only outside production", () => {
  assert.equal(evaluatePurchaseEligibility({ developmentCountry: "NG", production: false }).eligible, true);
  assert.equal(evaluatePurchaseEligibility({ developmentCountry: "NG", production: true }).eligible, false);
});
