import type { PracticeDraft } from "./practice-game.ts";

export function selectVisibleTeam({ verified, remoteReady, remoteTeam }: { verified: boolean; remoteReady: boolean; remoteTeam: PracticeDraft | null; localTeam: PracticeDraft | null }) {
  return verified && remoteReady ? remoteTeam : null;
}
