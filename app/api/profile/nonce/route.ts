import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { resolvePlayerIdentity, withPlayerCookie } from "@/lib/player-identity";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { buildWalletStatement, normalizeWalletAddress, WALLET_NONCE_COOKIE } from "@/lib/wallet-auth";

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Player profiles are not configured." }, { status: 503 });
  const address = normalizeWalletAddress(request.nextUrl.searchParams.get("address"));
  if (!address) return NextResponse.json({ error: "Connect a valid wallet first." }, { status: 400 });
  const identity = await resolvePlayerIdentity(request, supabase);
  if (!identity) return NextResponse.json({ error: "Your session has expired." }, { status: 401 });
  const nonce = randomBytes(18).toString("hex");
  const response = withPlayerCookie(NextResponse.json({ message: buildWalletStatement(address, nonce) }), identity);
  response.cookies.set(WALLET_NONCE_COOKIE, nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60,
    path: "/",
  });
  return response;
}
