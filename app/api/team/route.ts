import { NextRequest, NextResponse } from "next/server";

import { normalizeLineup } from "@/lib/battle-record";
import { readChainlinkPrices } from "@/lib/chainlink-market";
import { createDraftMarket, priceSelectionAtMarket, priceSquad, priceTransferSquad, squadBank } from "@/lib/fantasy-market";
import type { PracticeDraft } from "@/lib/practice-game";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { readActiveTeam, resolvePlayerIdentity, withPlayerCookie } from "@/lib/player-identity";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Team persistence is not configured yet." }, { status: 503 });

  const identity = await resolvePlayerIdentity(request, supabase);
  if (!identity) return NextResponse.json({ error: "Your session has expired. Verify your wallet again." }, { status: 401 });
  try {
    const active = await readActiveTeam(supabase, identity);
    const savedTeam: PracticeDraft | null = active ? { id: active.id, createdAt: active.createdAt, status: active.status, picks: active.picks } : null;
    const activeWeek = await supabase.from("game_weeks").select("id,ends_at").eq("status", "active").order("starts_at", { ascending: false }).limit(1).maybeSingle<{ id: string; ends_at: string }>();
    const upcomingWeek = await supabase.from("game_weeks").select("id,starts_at").eq("status", "upcoming").order("starts_at", { ascending: true }).limit(1).maybeSingle<{ id: string; starts_at: string }>();
    const transfer = upcomingWeek.data ? await supabase.from("team_transfer_windows").select("transfers_used,penalty_points").eq("game_week_id", upcomingWeek.data.id)
      .match(identity.userId ? { owner_user_id: identity.userId } : { guest_session_hash: identity.guestHash }).maybeSingle<{ transfers_used: number; penalty_points: number }>() : null;
    let market = [] as ReturnType<typeof createDraftMarket>;
    try { market = createDraftMarket(await readChainlinkPrices()); } catch { /* Team remains readable while the transfer market is held. */ }
    const currentPicks = savedTeam && market.length ? priceSelectionAtMarket(savedTeam.picks.map((pick) => pick.ticker), market) : null;
    const team = savedTeam && currentPicks ? { ...savedTeam, picks: currentPicks } : savedTeam;
    return withPlayerCookie(NextResponse.json({
      team,
      bank: team ? squadBank(team.picks) : 1_000,
      market,
      transferWindow: activeWeek.data ? { open: false, reopensAt: activeWeek.data.ends_at } : { open: true, closesAt: upcomingWeek.data?.starts_at ?? null },
      transfersUsed: transfer?.data?.transfers_used ?? 0,
      penaltyPoints: transfer?.data?.penalty_points ?? 0,
    }), identity);
  } catch {
    return NextResponse.json({ error: "Could not load the active team." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  let body: { picks?: unknown };
  try {
    body = await request.json() as { picks?: unknown };
  } catch {
    return NextResponse.json({ error: "The team request is not valid JSON." }, { status: 400 });
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Team persistence is not configured yet." }, { status: 503 });
  const identity = await resolvePlayerIdentity(request, supabase);
  if (!identity) return NextResponse.json({ error: "Your session has expired. Verify your wallet again." }, { status: 401 });
  const rawPicks = Array.isArray(body.picks) ? body.picks : [];
  const tickers = rawPicks.flatMap((pick) => pick && typeof pick === "object" && typeof (pick as { ticker?: unknown }).ticker === "string" ? [(pick as { ticker: string }).ticker] : []);
  let market;
  try { market = createDraftMarket(await readChainlinkPrices()); } catch {
    return withPlayerCookie(NextResponse.json({ error: "The transfer market is held until fresh onchain prices return." }, { status: 503 }), identity);
  }
  const active = await readActiveTeam(supabase, identity);
  const picks = active ? priceTransferSquad(tickers, market) : priceSquad(tickers, market);
  if (!picks || !normalizeLineup(picks)) return withPlayerCookie(NextResponse.json({ error: "Choose three to five affordable stocks within the 1,000-credit Squad Budget." }, { status: 400 }), identity);
  const saved = await supabase.rpc("save_priced_team", {
    p_owner_user_id: identity.userId,
    p_guest_session_hash: identity.userId ? null : identity.guestHash,
    p_picks: picks,
  });
  if (saved.error?.message.includes("TRANSFER_WINDOW_CLOSED")) return withPlayerCookie(NextResponse.json({ error: "The transfer window is closed while a Game Week is active." }, { status: 423 }), identity);
  if (saved.error || !saved.data || typeof saved.data !== "object") return withPlayerCookie(NextResponse.json({ error: "Could not save the active team." }, { status: 503 }), identity);

  const metadata = saved.data as { id: string; bank: number; transfersUsed: number; penaltyPoints: number };
  const team: PracticeDraft = { id: metadata.id, createdAt: new Date().toISOString(), status: "virtual", picks };
  return withPlayerCookie(NextResponse.json({ team, bank: metadata.bank, transfersUsed: metadata.transfersUsed, penaltyPoints: metadata.penaltyPoints }, { status: 201 }), identity);
}
