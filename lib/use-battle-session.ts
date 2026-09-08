"use client";

import { useMemo, useSyncExternalStore } from "react";

import { getBattleSessionSnapshot, parseBattleSession } from "@/lib/battle-session";

export function useBattleSession() {
  const snapshot = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("storage", onChange);
      window.addEventListener("gauntlet:battle-changed", onChange);
      return () => {
        window.removeEventListener("storage", onChange);
        window.removeEventListener("gauntlet:battle-changed", onChange);
      };
    },
    getBattleSessionSnapshot,
    () => "",
  );

  return useMemo(() => parseBattleSession(snapshot), [snapshot]);
}
