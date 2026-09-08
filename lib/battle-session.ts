import type { PricePoint, ScoredPick } from "@/lib/battle-scoring";

export const BATTLE_SESSION_KEY = "gauntlet.practice-battle.v1";
export const BATTLE_DURATION_MS = 24 * 60 * 60 * 1000;

export type BattleSession = {
  version: 1;
  id: string;
  challengeCode: string | null;
  playerDraftId: string;
  playerPicks: ScoredPick[];
  rivalPicks: ScoredPick[];
  startedAt: string;
  endsAt: string;
  openingPrices: PricePoint[];
  currentPrices: PricePoint[];
};

export function createBattleSession(input: {
  playerDraftId: string;
  playerPicks: ScoredPick[];
  rivalPicks: ScoredPick[];
  openingPrices: PricePoint[];
  now?: Date;
  challengeCode?: string | null;
}): BattleSession {
  const now = input.now ?? new Date();
  return {
    version: 1,
    id: `battle-${now.getTime().toString(36)}`,
    challengeCode: input.challengeCode ?? null,
    playerDraftId: input.playerDraftId,
    playerPicks: input.playerPicks,
    rivalPicks: input.rivalPicks,
    startedAt: now.toISOString(),
    endsAt: new Date(now.getTime() + BATTLE_DURATION_MS).toISOString(),
    openingPrices: input.openingPrices,
    currentPrices: input.openingPrices,
  };
}

export function parseBattleSession(snapshot: string | null): BattleSession | null {
  if (!snapshot) return null;
  try {
    const value = JSON.parse(snapshot) as Partial<BattleSession>;
    if (value.version !== 1 || typeof value.id !== "string" || typeof value.playerDraftId !== "string") return null;
    if (!isDate(value.startedAt) || !isDate(value.endsAt)) return null;
    if (!isPicks(value.playerPicks) || !isPicks(value.rivalPicks)) return null;
    if (!isPrices(value.openingPrices) || !isPrices(value.currentPrices)) return null;
    if (value.challengeCode !== undefined && value.challengeCode !== null && typeof value.challengeCode !== "string") return null;
    return { ...value, challengeCode: value.challengeCode ?? null } as BattleSession;
  } catch {
    return null;
  }
}

export function readBattleSession() {
  return parseBattleSession(getBattleSessionSnapshot());
}

export function getBattleSessionSnapshot() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(BATTLE_SESSION_KEY) ?? "";
}

export function saveBattleSession(session: BattleSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BATTLE_SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event("gauntlet:battle-changed"));
}

export function updateBattlePrices(prices: PricePoint[]) {
  const session = readBattleSession();
  if (!session) return null;
  const next = { ...session, currentPrices: prices };
  saveBattleSession(next);
  return next;
}

export function remainingBattleSeconds(session: BattleSession, now = new Date()) {
  return Math.max(0, Math.ceil((Date.parse(session.endsAt) - now.getTime()) / 1000));
}

function isDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isPicks(value: unknown): value is ScoredPick[] {
  return Array.isArray(value) && value.length >= 3 && value.length <= 5 && value.every((pick) => (
    pick && typeof pick.ticker === "string" && Number.isFinite(pick.virtualAmount) && pick.virtualAmount > 0
  ));
}

function isPrices(value: unknown): value is PricePoint[] {
  return Array.isArray(value) && value.length > 0 && value.every((point) => (
    point && typeof point.ticker === "string" && Number.isFinite(point.price) && point.price > 0
    && typeof point.updatedAt === "string" && typeof point.fresh === "boolean"
  ));
}
