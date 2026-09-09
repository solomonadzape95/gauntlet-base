import assert from "node:assert/strict";
import test from "node:test";

import { getCronSecret, isAuthorizedCronRequest } from "../lib/cron-auth.ts";

test("uses Vercel's CRON_SECRET and accepts only its exact bearer token", () => {
  const secret = getCronSecret({ CRON_SECRET: "primary-secret", GAME_WEEK_CRON_SECRET: "legacy-secret" });
  assert.equal(secret, "primary-secret");
  assert.equal(isAuthorizedCronRequest("Bearer primary-secret", secret), true);
  assert.equal(isAuthorizedCronRequest("Bearer legacy-secret", secret), false);
  assert.equal(isAuthorizedCronRequest(null, secret), false);
});

test("keeps the existing game-week secret as a deployment fallback", () => {
  const secret = getCronSecret({ GAME_WEEK_CRON_SECRET: "legacy-secret" });
  assert.equal(secret, "legacy-secret");
  assert.equal(isAuthorizedCronRequest("Bearer legacy-secret", secret), true);
  assert.equal(isAuthorizedCronRequest("Bearer legacy-secret", null), false);
});
