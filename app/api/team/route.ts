import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { normalizeLineup } from "@/lib/battle-record";
import type { PracticeDraft } from "@/lib/practice-game";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const GUEST_COOKIE = "gauntlet_guest";

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Team persistence is not configured yet." }, { status: 503 });

  const identity = await resolveIdentity(request);
  if (!identity) return NextResponse.json({ error: "Your session has expired. Verify your wallet again." }, { status: 401 });
  const query = supabase.from("drafts")
    .select("id,status,created_at")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1);
  const draftResult = identity.userId
    ? await query.eq("owner_user_id", identity.userId).maybeSingle()
    : await query.eq("guest_session_hash", identity.guestHash).maybeSingle();

  if (draftResult.error) return NextResponse.json({ error: "Could not load the active team." }, { status: 503 });
  if (!draftResult.data) return withGuestCookie(NextResponse.json({ team: null }), identity);

  const picksResult = await supabase.from("draft_picks")
    .select("ticker,virtual_amount,position")
    .eq("draft_id", draftResult.data.id)
    .order("position", { ascending: true });
  if (picksResult.error) return NextResponse.json({ error: "Could not load the active team." }, { status: 503 });

  const team: PracticeDraft = {
    id: draftResult.data.id,
    createdAt: draftResult.data.created_at,
    status: draftResult.data.status,
    picks: (picksResult.data ?? []).map((pick) => ({ ticker: pick.ticker, virtualAmount: pick.virtual_amount })),
  };
  return withGuestCookie(NextResponse.json({ team }), identity);
}

export async function POST(request: NextRequest) {
  let body: { picks?: unknown };
  try {
    body = await request.json() as { picks?: unknown };
  } catch {
    return NextResponse.json({ error: "The team request is not valid JSON." }, { status: 400 });
  }
  const picks = normalizeLineup(body.picks);
  if (!picks) return NextResponse.json({ error: "A team requires three to five stocks totaling $1,000." }, { status: 400 });

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Team persistence is not configured yet." }, { status: 503 });
  const identity = await resolveIdentity(request);
  if (!identity) return NextResponse.json({ error: "Your session has expired. Verify your wallet again." }, { status: 401 });
  const saved = await supabase.rpc("replace_active_team", {
    p_owner_user_id: identity.userId,
    p_guest_session_hash: identity.userId ? null : identity.guestHash,
    p_picks: picks,
  });
  if (saved.error || typeof saved.data !== "string") return NextResponse.json({ error: "Could not save the active team." }, { status: 503 });

  const team: PracticeDraft = { id: saved.data, createdAt: new Date().toISOString(), status: "virtual", picks };
  return withGuestCookie(NextResponse.json({ team }, { status: 201 }), identity);
}

async function resolveIdentity(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (supabase && token) {
    const { data } = await supabase.auth.getUser(token);
    if (data.user) return { userId: data.user.id, guestId: null, guestHash: "" };
    return null;
  }
  const guestId = request.cookies.get(GUEST_COOKIE)?.value ?? randomUUID();
  return { userId: null, guestId, guestHash: createHash("sha256").update(guestId).digest("hex") };
}

function withGuestCookie(response: NextResponse, identity: NonNullable<Awaited<ReturnType<typeof resolveIdentity>>>) {
  if (identity.guestId) response.cookies.set(GUEST_COOKIE, identity.guestId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return response;
}
