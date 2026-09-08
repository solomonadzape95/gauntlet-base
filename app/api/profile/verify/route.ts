import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";

import { resolvePlayerIdentity, withPlayerCookie } from "@/lib/player-identity";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { buildWalletStatement, defaultPlayerName, normalizeWalletAddress, WALLET_NONCE_COOKIE } from "@/lib/wallet-auth";

type WalletProfile = { guest_session_hash: string; wallet_address: string; username: string; avatar_tone: "hazard" | "base" | "ember" | "ink"; created_at: string; updated_at: string };

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Player profiles are not configured." }, { status: 503 });
  const identity = await resolvePlayerIdentity(request, supabase);
  if (!identity) return NextResponse.json({ error: "Your session has expired." }, { status: 401 });
  const nonce = request.cookies.get(WALLET_NONCE_COOKIE)?.value;
  if (!nonce) return NextResponse.json({ error: "That verification request expired. Try again." }, { status: 400 });
  let body: { address?: unknown; signature?: unknown };
  try { body = await request.json() as typeof body; } catch { return NextResponse.json({ error: "The verification response is invalid." }, { status: 400 }); }
  const address = normalizeWalletAddress(body.address);
  if (!address || typeof body.signature !== "string") return NextResponse.json({ error: "The wallet response is incomplete." }, { status: 400 });
  const verified = await verifyMessage({ address, message: buildWalletStatement(address, nonce), signature: body.signature as `0x${string}` }).catch(() => false);
  if (!verified) return NextResponse.json({ error: "The wallet signature could not be verified." }, { status: 401 });

  const existing = await supabase.from("wallet_profiles").select("guest_session_hash,wallet_address,username,avatar_tone,created_at,updated_at").eq("wallet_address", address.toLowerCase()).maybeSingle<WalletProfile>();
  const profile = existing.data ?? (await supabase.from("wallet_profiles").upsert({
    guest_session_hash: identity.guestHash,
    wallet_address: address.toLowerCase(),
    username: defaultPlayerName(address),
    avatar_tone: "hazard",
    updated_at: new Date().toISOString(),
  }, { onConflict: "guest_session_hash" }).select("guest_session_hash,wallet_address,username,avatar_tone,created_at,updated_at").single<WalletProfile>()).data;
  if (!profile) return NextResponse.json({ error: "The wallet was verified, but its player profile could not be loaded." }, { status: 503 });
  const attached = await supabase.from("wallet_profile_sessions").upsert({ session_hash: identity.sessionHash, profile_guest_hash: profile.guest_session_hash }, { onConflict: "session_hash" });
  if (attached.error) return NextResponse.json({ error: "The wallet was verified, but its player session could not be attached." }, { status: 503 });
  const response = withPlayerCookie(NextResponse.json({ profile: toClientProfile(profile), verified: true }), identity);
  response.cookies.delete(WALLET_NONCE_COOKIE);
  return response;
}

function toClientProfile(profile: WalletProfile) {
  return { user_id: profile.guest_session_hash, wallet_address: profile.wallet_address, username: profile.username, avatar_tone: profile.avatar_tone, created_at: profile.created_at, updated_at: profile.updated_at };
}
