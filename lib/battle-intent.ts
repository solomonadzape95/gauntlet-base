import type { BattleSession } from "./battle-session.ts";

export type BattleIntent =
  | { kind: "hub" }
  | { kind: "practice"; reset?: boolean }
  | { kind: "create" }
  | { kind: "durable"; battleId: string };

export function resolveBattleIntent(searchParams: Pick<URLSearchParams, "get">): BattleIntent {
  const battleId = searchParams.get("battle");
  if (battleId) return { kind: "durable", battleId };
  if (searchParams.get("mode") === "practice") return { kind: "practice", ...(searchParams.get("new") === "1" ? { reset: true } : {}) };
  if (searchParams.get("mode") === "create") return { kind: "create" };
  return { kind: "hub" };
}

export function storedSessionMatchesIntent(session: BattleSession | null, intent: BattleIntent, serverExists: boolean) {
  if (!session) return false;
  if (intent.kind === "practice") return !intent.reset && !session.serverBattleId && !session.sharedBattleId;
  if (intent.kind === "durable" && serverExists) {
    return session.serverBattleId === intent.battleId || session.sharedBattleId === intent.battleId;
  }
  return false;
}
