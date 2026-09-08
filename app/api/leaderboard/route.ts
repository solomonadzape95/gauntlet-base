import { NextRequest, NextResponse } from "next/server";

import { hasUsablePrices, type PricePoint, type ScoredPick } from "@/lib/battle-scoring";
import { normalizeLineup } from "@/lib/battle-record";
import { readChainlinkPrices } from "@/lib/chainlink-market";
import { rankGameWeek, scoreGameWeek } from "@/lib/game-week";
import { isSamePlayer, readActiveTeam, resolvePlayerIdentity, withPlayerCookie } from "@/lib/player-identity";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type GameWeek = {
  id: string;
  label: string;
  status: "upcoming" | "active" | "complete";
  entry_lock_at: string;
  starts_at: string;
  ends_at: string;
  opening_prices: PricePoint[] | null;
  closing_prices: PricePoint[] | null;
};

type GameWeekEntry = {
  id: string;
  owner_user_id: string | null;
  guest_session_hash: string | null;
  lineup: ScoredPick[];
  joined_at: string;
  final_return_bps: number | null;
  final_points: number | null;
};

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Leaderboard persistence is not configured." }, { status: 503 });
  const identity = await resolvePlayerIdentity(request, supabase);
  if (!identity) return NextResponse.json({ error: "Your session has expired. Verify your wallet again." }, { status: 401 });

  const weeks = await supabase.from("game_weeks").select("id,label,status,entry_lock_at,starts_at,ends_at,opening_prices,closing_prices").order("starts_at", { ascending: false }).limit(6).returns<GameWeek[]>();
  if (weeks.error) return NextResponse.json({ error: "Could not load the current game week." }, { status: 503 });
  const week = weeks.data.find((item) => item.status === "active") ?? weeks.data.find((item) => item.status === "upcoming") ?? weeks.data[0];
  if (!week) return withPlayerCookie(NextResponse.json({ week: null, entries: [], viewerJoined: false }), identity);

  const rows = await supabase.from("game_week_entries").select("id,owner_user_id,guest_session_hash,lineup,joined_at,final_return_bps,final_points").eq("game_week_id", week.id).returns<GameWeekEntry[]>();
  if (rows.error) return NextResponse.json({ error: "Could not load game-week entries." }, { status: 503 });

  const userIds = rows.data.flatMap((entry) => entry.owner_user_id ? [entry.owner_user_id] : []);
  const profiles = userIds.length ? await supabase.from("profiles").select("user_id,username").in("user_id", userIds) : { data: [] as { user_id: string; username: string }[] };
  const names = new Map((profiles.data ?? []).map((profile) => [profile.user_id, profile.username]));
  let currentPrices = week.closing_prices ?? week.opening_prices ?? [];
  let marketDataStatus: "pending" | "live" | "held" | "final" = week.status === "complete" ? "final" : week.status === "upcoming" ? "pending" : "held";
  if (week.status === "active") {
    try {
      const livePrices = await readChainlinkPrices();
      const selectedTickers = [...new Set(rows.data.flatMap((entry) => entry.lineup.map((pick) => pick.ticker)))];
      if (hasUsablePrices(selectedTickers, livePrices)) {
        currentPrices = livePrices;
        marketDataStatus = "live";
      }
    } catch { /* A held feed is explicit in the response; never manufacture a zero return. */ }
  }

  const scored = rows.data.map((entry) => {
    const live = marketDataStatus !== "pending" && marketDataStatus !== "held" && week.opening_prices && hasUsablePrices(entry.lineup.map((pick) => pick.ticker), currentPrices)
      ? scoreGameWeek(entry.lineup, week.opening_prices, currentPrices)
      : null;
    return {
      id: entry.id,
      name: entry.owner_user_id ? names.get(entry.owner_user_id) ?? "Verified player" : `Guest ${entry.guest_session_hash?.slice(0, 4).toUpperCase()}`,
      picks: entry.lineup.map((pick) => pick.ticker),
      returnPercent: live?.returnPercent ?? null,
      returnBps: live?.returnBps ?? null,
      points: live?.points ?? null,
    };
  });
  const entries = marketDataStatus === "live" || marketDataStatus === "final"
    ? rankGameWeek(scored.map((entry) => ({ ...entry, returnPercent: entry.returnPercent!, returnBps: entry.returnBps!, points: entry.points! })))
    : scored.map((entry) => ({ ...entry, rank: null }));
  const viewerJoined = rows.data.some((entry) => isSamePlayer(identity, entry.owner_user_id, entry.guest_session_hash));
  return withPlayerCookie(NextResponse.json({ week: { ...week, opening_prices: undefined, closing_prices: undefined }, entries, viewerJoined, marketDataStatus }), identity);
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Leaderboard persistence is not configured." }, { status: 503 });
  const identity = await resolvePlayerIdentity(request, supabase);
  if (!identity) return NextResponse.json({ error: "Your session has expired. Verify your wallet again." }, { status: 401 });
  const week = await supabase.from("game_weeks").select("id,status,entry_lock_at").eq("status", "upcoming").order("starts_at", { ascending: true }).limit(1).maybeSingle<{ id: string; status: string; entry_lock_at: string }>();
  if (week.error || !week.data) return NextResponse.json({ error: "There is no open game week to enter." }, { status: week.error ? 503 : 409 });
  if (Date.parse(week.data.entry_lock_at) <= Date.now()) return NextResponse.json({ error: "Entries for this game week are locked." }, { status: 409 });

  const team = await readActiveTeam(supabase, identity);
  const lineup = normalizeLineup(team?.picks);
  if (!team || !lineup) return withPlayerCookie(NextResponse.json({ error: "Create a complete active team before entering the game week." }, { status: 409 }), identity);
  const inserted = await supabase.from("game_week_entries").insert({
    game_week_id: week.data.id,
    team_id: team.id,
    owner_user_id: identity.userId,
    guest_session_hash: identity.userId ? null : identity.guestHash,
    lineup,
  });
  if (inserted.error?.code === "23505") return NextResponse.json({ error: "Your team is already entered in this game week." }, { status: 409 });
  if (inserted.error) return NextResponse.json({ error: "Could not enter this game week." }, { status: 503 });
  return withPlayerCookie(NextResponse.json({ entered: true }, { status: 201 }), identity);
}
