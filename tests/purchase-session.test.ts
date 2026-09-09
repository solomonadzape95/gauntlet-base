import assert from "node:assert/strict";
import test from "node:test";

import {
  attachPurchaseWallet,
  confirmedPurchaseCount,
  createPurchaseSession,
  isPurchaseSessionComplete,
  isPurchaseSessionEditable,
  parsePurchaseSessionSnapshot,
  updatePurchaseRow,
} from "../lib/purchase-session.ts";

const picks = [
  { ticker: "NVDAc", virtualAmount: 334, allocationCents: 167 },
  { ticker: "AAPLc", virtualAmount: 333, allocationCents: 167 },
  { ticker: "TSLAc", virtualAmount: 333, allocationCents: 166 },
];

test("creates a recoverable ready row for every pick", () => {
  const session = createPurchaseSession({ draftId: "draft-1", realAmount: 5, picks });
  assert.deepEqual(session.rows.map((row) => row.status), ["ready", "ready", "ready"]);
  assert.equal(session.rows.reduce((total, row) => total + row.allocationCents, 0), 500);
  assert.equal(isPurchaseSessionEditable(session), true);
});

test("a UI-only demo purchase cannot count as ownership", () => {
  const session = createPurchaseSession({ draftId: "draft-1", realAmount: 5, picks });
  assert.equal(confirmedPurchaseCount(session), 0);
  assert.equal(isPurchaseSessionComplete(session), false);
  assert.equal(session.rows.some((row) => row.txHash), false);
});

test("requires a verified balance increase on every row before completion", () => {
  let session = createPurchaseSession({ draftId: "draft-1", realAmount: 5, picks });
  for (const pick of picks) {
    session = updatePurchaseRow(session, pick.ticker, {
      status: "confirmed",
      txHash: `0x${"1".repeat(64)}`,
      balanceBefore: "10",
      balanceAfter: "11",
    });
  }

  assert.equal(confirmedPurchaseCount(session), 3);
  assert.equal(isPurchaseSessionComplete(session), true);

  const unverified = updatePurchaseRow(session, "TSLAc", { balanceAfter: "10" });
  assert.equal(isPurchaseSessionComplete(unverified), false);
});

test("locks an in-progress purchase to its original wallet", () => {
  let session = createPurchaseSession({
    draftId: "draft-1",
    realAmount: 5,
    walletAddress: `0x${"a".repeat(40)}`,
    picks,
  });
  session = updatePurchaseRow(session, "NVDAc", {
    status: "submitted",
    txHash: `0x${"2".repeat(64)}`,
  });
  assert.equal(isPurchaseSessionEditable(session), false);

  assert.throws(
    () => attachPurchaseWallet(session, `0x${"b".repeat(40)}`),
    /Reconnect the wallet/,
  );
});

test("rejects malformed or incomplete persisted data", () => {
  assert.equal(parsePurchaseSessionSnapshot("not-json"), null);
  assert.equal(parsePurchaseSessionSnapshot(JSON.stringify({ version: 1 })), null);
});
