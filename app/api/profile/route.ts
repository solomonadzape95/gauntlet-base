import { NextRequest, NextResponse } from "next/server";

import type { AvatarTone } from "@/components/gauntlet-auth";
import { resolvePlayerIdentity, withPlayerCookie } from "@/lib/player-identity";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type WalletProfile = { guest_session_hash: string; wallet_address: string; username: string; avatar_tone: AvatarTone; created_at: string; updated_at: string };

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Player profiles are not configured." }, { status: 503 });
  const identity = await resolvePlayerIdentity(request, supabase);
  if (!identity) return NextResponse.json({ error: "Your session has expired." }, { status: 401 });
  const result = await supabase.from("wallet_profiles").select("guest_session_hash,wallet_address,username,avatar_tone,created_at,updated_at").eq("guest_session_hash", identity.guestHash).maybeSingle<WalletProfile>();
  if (result.error) return NextResponse.json({ error: "The player profile could not be loaded." }, { status: 503 });
  return withPlayerCookie(NextResponse.json({ profile: result.data ? toClientProfile(result.data) : null, verified: Boolean(result.data) }), identity);
}

export async function PUT(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Player profiles are not configured." }, { status: 503 });
  const identity = await resolvePlayerIdentity(request, supabase);
  if (!identity) return NextResponse.json({ error: "Your session has expired." }, { status: 401 });
  let body: { username?: unknown; avatarTone?: unknown };
  try { body = await request.json() as typeof body; } catch { return NextResponse.json({ error: "The profile response is invalid." }, { status: 400 }); }
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const tones = new Set(["hazard", "base", "ember", "ink"]);
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) return NextResponse.json({ error: "Use 3–20 letters, numbers, or underscores." }, { status: 400 });
  if (typeof body.avatarTone !== "string" || !tones.has(body.avatarTone)) return NextResponse.json({ error: "Choose a valid dither colour." }, { status: 400 });
  const result = await supabase.from("wallet_profiles").update({ username, avatar_tone: body.avatarTone, updated_at: new Date().toISOString() }).eq("guest_session_hash", identity.guestHash).select("guest_session_hash,wallet_address,username,avatar_tone,created_at,updated_at").maybeSingle<WalletProfile>();
  if (result.error?.code === "23505") return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
  if (result.error || !result.data) return NextResponse.json({ error: "Verify this wallet before saving its profile." }, { status: result.error ? 503 : 401 });
  return withPlayerCookie(NextResponse.json({ profile: toClientProfile(result.data), verified: true }), identity);
}

export async function DELETE(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Player profiles are not configured." }, { status: 503 });
  const identity = await resolvePlayerIdentity(request, supabase);
  if (!identity) return NextResponse.json({ error: "Your session has expired." }, { status: 401 });
  const result = await supabase.from("wallet_profile_sessions").delete().eq("session_hash", identity.sessionHash);
  if (result.error) return NextResponse.json({ error: "The player session could not be cleared." }, { status: 503 });
  return withPlayerCookie(NextResponse.json({ ok: true }), identity);
}

function toClientProfile(profile: WalletProfile) {
  return { user_id: profile.guest_session_hash, wallet_address: profile.wallet_address, username: profile.username, avatar_tone: profile.avatar_tone, created_at: profile.created_at, updated_at: profile.updated_at };
}
