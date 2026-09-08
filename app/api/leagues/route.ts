import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { hasUsablePrices, type PricePoint, type ScoredPick } from "@/lib/battle-scoring";
import { readChainlinkPrices } from "@/lib/chainlink-market";
import { scoreGameWeek } from "@/lib/game-week";
import { resolvePlayerIdentity, withPlayerCookie } from "@/lib/player-identity";
import { fallbackPlayerName, playerReferenceKey, readPlayerPresentations } from "@/lib/player-profiles";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type League = { id: string; name: string; join_code: string; created_at: string };
type Member = { league_id: string; owner_user_id: string | null; guest_session_hash: string | null; joined_at: string };
type LeagueWeek = { id: string; status: "upcoming" | "active" | "complete"; starts_at: string; opening_prices: PricePoint[] | null; closing_prices: PricePoint[] | null };
type LeagueWeekEntry = { id: string; owner_user_id: string | null; guest_session_hash: string | null; lineup: ScoredPick[]; final_points: number | null; transfer_penalty_points: number };

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "League persistence is not configured." }, { status: 503 });
  const identity = await resolvePlayerIdentity(request, supabase);
  if (!identity) return NextResponse.json({ error: "Your session has expired. Verify your wallet again." }, { status: 401 });
  const memberships = await supabase.from("league_members").select("league_id").match(identity.userId ? { owner_user_id: identity.userId } : { guest_session_hash: identity.guestHash }).returns<{ league_id: string }[]>();
  if (memberships.error) return NextResponse.json({ error: "Could not load your leagues." }, { status: 503 });
  const ids = memberships.data.map((item) => item.league_id);
  if (!ids.length) return withPlayerCookie(NextResponse.json({ leagues: [] }), identity);
  const leagues = await supabase.from("leagues").select("id,name,join_code,created_at").in("id", ids).order("created_at", { ascending: false }).returns<League[]>();
  const members = await supabase.from("league_members").select("league_id,owner_user_id,guest_session_hash,joined_at").in("league_id", ids).returns<Member[]>();
  const profiles = await readPlayerPresentations(supabase, members.data ?? []);
  const recentWeeks = await supabase.from("game_weeks").select("id,status,starts_at,opening_prices,closing_prices").order("starts_at", { ascending: false }).limit(8).returns<LeagueWeek[]>();
  const availableWeeks = recentWeeks.data ?? [];
  const latestWeek = availableWeeks.find((week) => week.status === "active")
    ?? [...availableWeeks].reverse().find((week) => week.status === "upcoming")
    ?? availableWeeks.find((week) => week.status === "complete")
    ?? null;
  const weekEntries = latestWeek ? await supabase.from("game_week_entries").select("id,owner_user_id,guest_session_hash,lineup,final_points,transfer_penalty_points").eq("game_week_id", latestWeek.id).returns<LeagueWeekEntry[]>() : { data: [] as LeagueWeekEntry[] };
  let livePrices: PricePoint[] | null = latestWeek?.closing_prices ?? null;
  if (latestWeek?.status === "active") {
    try {
      const current = await readChainlinkPrices();
      const tickers = [...new Set((weekEntries.data ?? []).flatMap((entry) => entry.lineup.map((pick) => pick.ticker)))];
      if (hasUsablePrices(tickers, current)) livePrices = current;
    } catch { /* League scores remain held until fresh feeds return. */ }
  }
  const entryPoints = new Map((weekEntries.data ?? []).map((entry) => {
    const liveScore = latestWeek?.status === "active" && latestWeek.opening_prices && livePrices
      && hasUsablePrices(entry.lineup.map((pick) => pick.ticker), livePrices)
      ? Math.max(0, scoreGameWeek(entry.lineup, latestWeek.opening_prices, livePrices).points - entry.transfer_penalty_points)
      : null;
    const ownerKey = entry.owner_user_id ? `user:${entry.owner_user_id}` : `guest:${entry.guest_session_hash}`;
    return [ownerKey, { id: entry.id, points: liveScore ?? entry.final_points }] as const;
  }));
  const payload = (leagues.data ?? []).map((league) => ({
    ...league,
    members: (members.data ?? []).filter((member) => member.league_id === league.id).map((member) => ({
      name: profiles.get(playerReferenceKey(member))?.username ?? fallbackPlayerName(member),
      tone: profiles.get(playerReferenceKey(member))?.avatarTone ?? "hazard",
      joinedAt: member.joined_at,
      teamEntryId: entryPoints.get(member.owner_user_id ? `user:${member.owner_user_id}` : `guest:${member.guest_session_hash}`)?.id ?? null,
      points: entryPoints.get(member.owner_user_id ? `user:${member.owner_user_id}` : `guest:${member.guest_session_hash}`)?.points ?? null,
    })),
  }));
  return withPlayerCookie(NextResponse.json({ leagues: payload }), identity);
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "League persistence is not configured." }, { status: 503 });
  const identity = await resolvePlayerIdentity(request, supabase);
  if (!identity) return NextResponse.json({ error: "Your session has expired. Verify your wallet again." }, { status: 401 });
  let body: { action?: unknown; name?: unknown; code?: unknown };
  try { body = await request.json() as typeof body; } catch { return NextResponse.json({ error: "The league request is not valid JSON." }, { status: 400 }); }
  if (body.action === "create") {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length < 3 || name.length > 32) return NextResponse.json({ error: "League names must be 3–32 characters." }, { status: 400 });
    const joinCode = randomBytes(3).toString("hex").toUpperCase();
    const created = await supabase.from("leagues").insert({ name, join_code: joinCode, owner_user_id: identity.userId, owner_guest_hash: identity.userId ? null : identity.guestHash }).select("id").single<{ id: string }>();
    if (created.error) return NextResponse.json({ error: "Could not create this league. Try once more." }, { status: 503 });
    const member = await supabase.from("league_members").insert({ league_id: created.data.id, owner_user_id: identity.userId, guest_session_hash: identity.userId ? null : identity.guestHash });
    if (member.error) {
      await supabase.from("leagues").delete().eq("id", created.data.id);
      return NextResponse.json({ error: "The league could not be created. Try once more." }, { status: 503 });
    }
    return withPlayerCookie(NextResponse.json({ created: true, code: joinCode }, { status: 201 }), identity);
  }
  if (body.action === "join") {
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    if (!/^[A-Z0-9]{6}$/.test(code)) return NextResponse.json({ error: "Enter the six-character league code." }, { status: 400 });
    const league = await supabase.from("leagues").select("id").eq("join_code", code).maybeSingle<{ id: string }>();
    if (!league.data) return NextResponse.json({ error: "No league uses that code." }, { status: 404 });
    const joined = await supabase.from("league_members").insert({ league_id: league.data.id, owner_user_id: identity.userId, guest_session_hash: identity.userId ? null : identity.guestHash });
    if (joined.error?.code === "23505") return NextResponse.json({ error: "You already belong to this league." }, { status: 409 });
    if (joined.error) return NextResponse.json({ error: "Could not join this league." }, { status: 503 });
    return withPlayerCookie(NextResponse.json({ joined: true }, { status: 201 }), identity);
  }
  return NextResponse.json({ error: "Choose whether to create or join a league." }, { status: 400 });
}
