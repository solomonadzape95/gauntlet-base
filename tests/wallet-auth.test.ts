import assert from "node:assert/strict";
import test from "node:test";

import { buildWalletStatement, defaultPlayerName, normalizeWalletAddress } from "../lib/wallet-auth.ts";

const wallet = "0x000000000000000000000000000000000000dEaD";

test("builds an address-bound wallet verification statement", () => {
  const statement = buildWalletStatement(wallet, "nonce-123");
  assert.match(statement, /Wallet: 0x000000000000000000000000000000000000dEaD/);
  assert.match(statement, /Nonce: nonce-123/);
  assert.match(statement, /does not move funds/);
});

test("normalizes valid addresses and rejects malformed ones", () => {
  assert.equal(normalizeWalletAddress(wallet), wallet);
  assert.equal(normalizeWalletAddress("not-a-wallet"), null);
});

test("derives a stable layman-readable default player name", () => {
  assert.equal(defaultPlayerName(wallet), "player_0000000000");
});
