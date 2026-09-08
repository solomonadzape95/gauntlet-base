import { getAddress } from "viem";

export const WALLET_NONCE_COOKIE = "gauntlet_wallet_nonce";

export function normalizeWalletAddress(value: unknown) {
  if (typeof value !== "string") return null;
  try { return getAddress(value); } catch { return null; }
}

export function buildWalletStatement(address: string, nonce: string) {
  return [
    "Sign in to Gauntlet",
    "",
    "This proves you control this wallet. It does not move funds.",
    `Wallet: ${getAddress(address)}`,
    `Nonce: ${nonce}`,
  ].join("\n");
}

export function defaultPlayerName(address: string) {
  return `player_${getAddress(address).slice(2, 12).toLowerCase()}`;
}
