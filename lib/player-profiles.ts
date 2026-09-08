import type { SupabaseClient } from "@supabase/supabase-js";

export type PlayerReference = { owner_user_id: string | null; guest_session_hash: string | null };
export type PlayerPresentation = { username: string; avatarTone: "hazard" | "base" | "ember" | "ink" };

export function playerReferenceKey(reference: PlayerReference) {
  return reference.owner_user_id ? `user:${reference.owner_user_id}` : `guest:${reference.guest_session_hash}`;
}

export async function readPlayerPresentations(supabase: SupabaseClient, references: PlayerReference[]) {
  const userIds = [...new Set(references.flatMap((reference) => reference.owner_user_id ? [reference.owner_user_id] : []))];
  const guestHashes = [...new Set(references.flatMap((reference) => reference.guest_session_hash ? [reference.guest_session_hash] : []))];
  const [users, wallets] = await Promise.all([
    userIds.length ? supabase.from("profiles").select("user_id,username,avatar_tone").in("user_id", userIds) : Promise.resolve({ data: [] }),
    guestHashes.length ? supabase.from("wallet_profiles").select("guest_session_hash,username,avatar_tone").in("guest_session_hash", guestHashes) : Promise.resolve({ data: [] }),
  ]);
  const presentations = new Map<string, PlayerPresentation>();
  for (const profile of users.data ?? []) presentations.set(`user:${profile.user_id}`, { username: profile.username, avatarTone: profile.avatar_tone });
  for (const profile of wallets.data ?? []) presentations.set(`guest:${profile.guest_session_hash}`, { username: profile.username, avatarTone: profile.avatar_tone });
  return presentations;
}

export function fallbackPlayerName(reference: PlayerReference) {
  return reference.owner_user_id ? "Verified player" : `Guest ${reference.guest_session_hash?.slice(0, 4).toUpperCase()}`;
}
