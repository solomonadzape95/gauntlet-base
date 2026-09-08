import { NextRequest, NextResponse } from "next/server";

import { hasUsablePrices, type PricePoint } from "@/lib/battle-scoring";
import { BATTLE_RECORD_SELECTION, createBattleWindow, isUuid, normalizeLineup, type BattleRecord } from "@/lib/battle-record";
import { readChainlinkPrices } from "@/lib/chainlink-market";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isSameBrowserGuest, isSamePlayer, readActiveTeam, resolvePlayerIdentity, withPlayerCookie } from "@/lib/player-identity";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "That challenge ID is invalid." }, { status: 400 });
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Durable challenges are not configured yet." }, { status: 503 });

  const identity = await resolvePlayerIdentity(request, supabase);
  if (!identity) return NextResponse.json({ error: "Your session has expired. Verify your wallet again." }, { status: 401 });
  const found = await supabase.from("battles").select(`${BATTLE_RECORD_SELECTION},creator_user_id,creator_guest_hash,opponent_user_id,opponent_guest_hash`).eq("id", id).maybeSingle<BattleRecord & { creator_user_id: string | null; creator_guest_hash: string | null; opponent_user_id: string | null; opponent_guest_hash: string | null }>();
  if (found.error) return NextResponse.json({ error: "The challenge could not be loaded." }, { status: 503 });
  if (!found.data) return NextResponse.json({ error: "That challenge does not exist." }, { status: 404 });
  const role = isSamePlayer(identity, found.data.creator_user_id, found.data.creator_guest_hash)
    ? "creator"
    : isSamePlayer(identity, found.data.opponent_user_id, found.data.opponent_guest_hash) ? "opponent" : "visitor";
  const playerIds = [found.data.creator_user_id, found.data.opponent_user_id].filter((value): value is string => Boolean(value));
  const profiles = playerIds.length ? await supabase.from("profiles").select("user_id,username").in("user_id", playerIds) : { data: [] as { user_id: string; username: string }[] };
  const profileNames = new Map((profiles.data ?? []).map((profile) => [profile.user_id, profile.username]));
  const players = {
    creator: found.data.creator_user_id ? profileNames.get(found.data.creator_user_id) ?? "Verified player" : `Guest ${found.data.creator_guest_hash?.slice(0, 4).toUpperCase()}`,
    opponent: found.data.opponent_user_id ? profileNames.get(found.data.opponent_user_id) ?? "Verified player" : found.data.opponent_guest_hash ? `Guest ${found.data.opponent_guest_hash.slice(0, 4).toUpperCase()}` : "Opponent",
  };

  let battle: BattleRecord = toPublicBattle(found.data);
  try {
    const currentPrices = battle.status === "complete" && battle.end_prices ? battle.end_prices : await readChainlinkPrices();
    const tickers = [...battle.player_picks, ...(battle.opponent_picks ?? [])].map((pick) => pick.ticker);
    let marketDataStatus = battle.status === "complete" ? "final" : battle.status === "waiting" ? "waiting" : hasUsablePrices(tickers, currentPrices) ? "live" : "held";
    if (battle.status === "active" && marketDataStatus === "live") {
      await supabase.from("battle_price_snapshots").insert({ battle_id: id, kind: "current", prices: currentPrices });
    }
    if (battle.status === "active" && battle.ends_at && Date.parse(battle.ends_at) <= Date.now() && hasUsablePrices(tickers, currentPrices)) {
      const settled = await supabase.from("battles").update({
        status: "complete",
        end_prices: currentPrices,
        settled_at: new Date().toISOString(),
      }).eq("id", id).is("end_prices", null).select(BATTLE_RECORD_SELECTION).maybeSingle<BattleRecord>();
      if (settled.data) {
        battle = settled.data;
        marketDataStatus = "final";
      }
    }
    return withPlayerCookie(NextResponse.json({ battle, currentPrices, role, marketDataStatus, players }, { headers: { "Cache-Control": "no-store" } }), identity);
  } catch (cause) {
    console.error("Could not refresh durable challenge", cause);
    const lastSnapshot = await supabase.from("battle_price_snapshots").select("prices").eq("battle_id", id).eq("kind", "current").order("captured_at", { ascending: false }).limit(1).maybeSingle<{ prices: PricePoint[] }>();
    return withPlayerCookie(NextResponse.json({ battle, currentPrices: battle.end_prices ?? lastSnapshot.data?.prices ?? [], role, marketDataStatus: battle.status === "complete" ? "final" : "held", players, warning: "Live prices are temporarily unavailable." }), identity);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "That challenge ID is invalid." }, { status: 400 });
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Durable challenges are not configured yet." }, { status: 503 });
  const identity = await resolvePlayerIdentity(request, supabase);
  if (!identity) return NextResponse.json({ error: "Your session has expired. Verify your wallet again." }, { status: 401 });
  const team = await readActiveTeam(supabase, identity);
  const picks = normalizeLineup(team?.picks);
  if (!team || !picks) return withPlayerCookie(NextResponse.json({ error: "Create a complete active team before joining this challenge." }, { status: 409 }), identity);

  let prices;
  try {
    prices = await readChainlinkPrices();
  } catch (cause) {
    console.error("Could not lock challenge opening prices", cause);
    return NextResponse.json({ error: "Fresh opening prices are temporarily unavailable." }, { status: 503 });
  }
  const tickers = [...picks].map((pick) => pick.ticker);
  const existing = await supabase.from("battles").select("player_picks,duration_minutes,creator_user_id,creator_guest_hash").eq("id", id).maybeSingle<{ player_picks: BattleRecord["player_picks"]; duration_minutes: 60 | 1440; creator_user_id: string | null; creator_guest_hash: string | null }>();
  if (existing.error || !existing.data) return NextResponse.json({ error: "That challenge does not exist." }, { status: existing.error ? 503 : 404 });
  if (isSamePlayer(identity, existing.data.creator_user_id, existing.data.creator_guest_hash) || isSameBrowserGuest(identity, existing.data.creator_guest_hash)) return NextResponse.json({ error: "You cannot accept your own challenge." }, { status: 409 });
  tickers.push(...existing.data.player_picks.map((pick) => pick.ticker));
  if (!hasUsablePrices(tickers, prices)) return NextResponse.json({ error: "A fresh opening snapshot is not available for both lineups." }, { status: 503 });
  const { startsAt, endsAt } = createBattleWindow(new Date(), existing.data.duration_minutes);
  const result = await supabase.from("battles").update({
    opponent_picks: picks,
    opponent_team_id: team.id,
    opponent_user_id: identity.userId,
    opponent_guest_hash: identity.userId ? null : identity.guestHash,
    status: "active",
    opening_prices: prices,
    starts_at: startsAt,
    ends_at: endsAt,
  })
    .eq("id", id)
    .is("opponent_picks", null)
    .eq("status", "waiting")
    .select(BATTLE_RECORD_SELECTION)
    .maybeSingle<BattleRecord>();
  if (result.error) return NextResponse.json({ error: "The challenge could not be joined." }, { status: 503 });
  if (!result.data) return NextResponse.json({ error: "This challenge was already joined or has ended." }, { status: 409 });
  const event = await supabase.from("battle_events").upsert({ battle_id: id, event_type: "opponent_joined" }, { onConflict: "battle_id,event_type", ignoreDuplicates: true });
  if (event.error) console.warn("Opponent joined without analytics event", event.error.message);
  return withPlayerCookie(NextResponse.json({ battle: result.data, role: "opponent" }), identity);
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "That challenge ID is invalid." }, { status: 400 });
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Durable challenges are not configured yet." }, { status: 503 });

  const event = await supabase.from("battle_events").upsert(
    { battle_id: id, event_type: "challenge_shared" },
    { onConflict: "battle_id,event_type", ignoreDuplicates: true },
  );
  if (event.error) return NextResponse.json({ error: "The share could not be recorded." }, { status: 503 });
  return NextResponse.json({ recorded: true });
}

function toPublicBattle(row: BattleRecord): BattleRecord {
  return {
    id: row.id,
    status: row.status,
    player_picks: row.player_picks,
    opponent_picks: row.opponent_picks,
    opening_prices: row.opening_prices,
    end_prices: row.end_prices,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    settled_at: row.settled_at,
    duration_minutes: row.duration_minutes,
  };
}
