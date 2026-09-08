import { createHash, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const GUEST_COOKIE = "gauntlet_guest";

export type PlayerIdentity = { userId: string | null; guestId: string | null; guestHash: string; sessionHash: string };

export async function resolvePlayerIdentity(request: NextRequest, supabase: SupabaseClient): Promise<PlayerIdentity | null> {
  const authorization = request.headers.get("authorization");
  const token = authorization?.replace(/^Bearer\s+/i, "");
  if (authorization) {
    if (!token) return null;
    const { data } = await supabase.auth.getUser(token);
    if (!data.user) return null;
    const guestId = request.cookies.get(GUEST_COOKIE)?.value ?? randomUUID();
    const sessionHash = createHash("sha256").update(guestId).digest("hex");
    return { userId: data.user.id, guestId, guestHash: sessionHash, sessionHash };
  }
  const guestId = request.cookies.get(GUEST_COOKIE)?.value ?? randomUUID();
  const sessionHash = createHash("sha256").update(guestId).digest("hex");
  const linked = await supabase.from("wallet_profile_sessions").select("profile_guest_hash").eq("session_hash", sessionHash).maybeSingle<{ profile_guest_hash: string }>();
  return { userId: null, guestId, guestHash: linked.data?.profile_guest_hash ?? sessionHash, sessionHash };
}

export function withPlayerCookie(response: NextResponse, identity: PlayerIdentity) {
  if (identity.guestId) response.cookies.set(GUEST_COOKIE, identity.guestId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return response;
}

export function isSamePlayer(identity: PlayerIdentity, userId: string | null, guestHash: string | null) {
  if (userId) return identity.userId === userId;
  return Boolean(guestHash && identity.guestHash === guestHash);
}

export function isSameBrowserGuest(identity: PlayerIdentity, guestHash: string | null) {
  return Boolean(identity.guestHash && identity.guestHash === guestHash);
}

export async function readActiveTeam(supabase: SupabaseClient, identity: PlayerIdentity) {
  const query = supabase.from("drafts").select("id,status,created_at").eq("is_active", true).limit(1);
  const draft = identity.userId
    ? await query.eq("owner_user_id", identity.userId).maybeSingle<{ id: string; status: "virtual" | "owned"; created_at: string }>()
    : await query.eq("guest_session_hash", identity.guestHash).maybeSingle<{ id: string; status: "virtual" | "owned"; created_at: string }>();
  if (draft.error) throw draft.error;
  if (!draft.data) return null;
  const picks = await supabase.from("draft_picks").select("ticker,virtual_amount,position").eq("draft_id", draft.data.id).order("position", { ascending: true });
  if (picks.error) throw picks.error;
  return {
    id: draft.data.id,
    status: draft.data.status,
    createdAt: draft.data.created_at,
    picks: (picks.data ?? []).map((pick) => ({ ticker: pick.ticker, virtualAmount: pick.virtual_amount })),
  };
}
