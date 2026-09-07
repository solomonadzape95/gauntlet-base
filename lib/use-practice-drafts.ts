"use client";

import { useMemo, useSyncExternalStore } from "react";

import { getPracticeDraftSnapshot, parsePracticeDraftSnapshot } from "@/lib/practice-game";

const SERVER_SNAPSHOT = "[]";

export function usePracticeDrafts() {
  const snapshot = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("storage", onChange);
      window.addEventListener("gauntlet:drafts-changed", onChange);
      return () => {
        window.removeEventListener("storage", onChange);
        window.removeEventListener("gauntlet:drafts-changed", onChange);
      };
    },
    getPracticeDraftSnapshot,
    () => SERVER_SNAPSHOT,
  );

  return useMemo(() => parsePracticeDraftSnapshot(snapshot), [snapshot]);
}
