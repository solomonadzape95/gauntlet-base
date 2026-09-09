import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { hasUsablePrices, type PricePoint, type ScoredPick } from "@/lib/battle-scoring";
import { readChainlinkPrices } from "@/lib/chainlink-market";
import { scoreGameWeek } from "@/lib/game-week";
import { readLatestGameWeekSnapshot } from "@/lib/game-week-snapshots";
import { LEAGUE_SPRINT_MINUTES, leagueSprintState, rankLeagueSprint, scoreLeagueSprint, summarizeLeagueStocks } from "@/lib/league-sprint";
import { readActiveTeam, resolvePlayerIdentity, withPlayerCookie, type PlayerIdentity } from "@/lib/player-identity";
import { fallbackPlayerName, playerReferenceKey, readPlayerPresentations } from "@/lib/player-profiles";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type League = { id: string; name: string; join_code: string; created_at: string; owner_user_id: string | null; owner_guest_hash: string | null };
type Member = { league_id: string; owner_user_id: string | null; guest_session_hash: string | null; joined_at: string };
type LeagueWeek = { id: string; status: "upcoming" | "active" | "complete"; starts_at: string; opening_prices: PricePoint[] | null; closing_prices: PricePoint[] | null };
type LeagueWeekEntry = { id: string; owner_user_id: string | null; guest_session_hash: string | null; lineup: ScoredPick[]; final_points: number | null; transfer_penalty_points: number };
type LeagueSprint = { id: string; league_id: string; status: "active" | "complete"; starts_at: string; ends_at: string; opening_prices: PricePoint[]; closing_prices: PricePoint[] | null };
type LeagueSprintEntry = { id: string; sprint_id: string; owner_user_id: string | null; guest_session_hash: string | null; lineup: ScoredPick[]; final_points: number | null };

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "League persistence is not configured." }, { status: 503 });
  const identity = await resolvePlayerIdentity(request, supabase);
  if (!identity) return NextResponse.json({ error: "Your session has expired. Verify your wallet again." }, { status: 401 });
  const memberships = await supabase.from("league_members").select("league_id").match(identity.userId ? { owner_user_id: identity.userId } : { guest_session_hash: identity.guestHash }).returns<{ league_id: string }[]>();
  if (memberships.error) return NextResponse.json({ error: "Could not load your leagues." }, { status: 503 });
  const ids = memberships.data.map((item) => item.league_id);
  if (!ids.length) return withPlayerCookie(NextResponse.json({ leagues: [] }), identity);
  const leagues = await supabase.from("leagues").select("id,name,join_code,created_at,owner_user_id,owner_guest_hash").in("id", ids).order("created_at", { ascending: false }).returns<League[]>();
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
    const tickers = [...new Set((weekEntries.data ?? []).flatMap((entry) => entry.lineup.map((pick) => pick.ticker)))];
    const latest = await readLatestGameWeekSnapshot(supabase, latestWeek.id, tickers);
    if (latest) livePrices = latest.prices;
  }
  const entryPoints = new Map((weekEntries.data ?? []).map((entry) => {
    const liveScore = latestWeek?.status === "active" && latestWeek.opening_prices && livePrices
      && hasUsablePrices(entry.lineup.map((pick) => pick.ticker), livePrices)
      ? Math.max(0, scoreGameWeek(entry.lineup, latestWeek.opening_prices, livePrices).points - entry.transfer_penalty_points)
      : null;
    const ownerKey = entry.owner_user_id ? `user:${entry.owner_user_id}` : `guest:${entry.guest_session_hash}`;
    return [ownerKey, { id: entry.id, points: liveScore ?? entry.final_points }] as const;
  }));
  const sprintResult = await supabase.from("league_sprints").select("id,league_id,status,starts_at,ends_at,opening_prices,closing_prices").in("league_id", ids).order("starts_at", { ascending: false }).returns<LeagueSprint[]>();
  const quickLeagueReady = !sprintResult.error;
  const latestSprintByLeague = new Map<string, LeagueSprint>();
  for (const sprint of sprintResult.data ?? []) if (!latestSprintByLeague.has(sprint.league_id)) latestSprintByLeague.set(sprint.league_id, sprint);
  const sprintIds = [...latestSprintByLeague.values()].map((sprint) => sprint.id);
  const sprintEntriesResult = sprintIds.length
    ? await supabase.from("league_sprint_entries").select("id,sprint_id,owner_user_id,guest_session_hash,lineup,final_points").in("sprint_id", sprintIds).returns<LeagueSprintEntry[]>()
    : { data: [] as LeagueSprintEntry[], error: null };
  let sprintPrices: PricePoint[] | null = null;
  if ([...latestSprintByLeague.values()].some((sprint) => sprint.status === "active")) {
    try { sprintPrices = await readChainlinkPrices(); } catch { /* Quick League holds the last visible score until feeds return. */ }
  }
  const quickResults = new Map<string, { points: number | null; rank: number | null; returnPercent: number | null; lineup: ScoredPick[] }>();
  const quickStats = new Map<string, ReturnType<typeof summarizeLeagueStocks>>();
  for (const sprint of latestSprintByLeague.values()) {
    const sprintEntries = (sprintEntriesResult.data ?? []).filter((entry) => entry.sprint_id === sprint.id);
    const expired = leagueSprintState(sprint.starts_at, sprint.ends_at) === "complete";
    const scoringPrices = sprint.status === "complete" ? sprint.closing_prices : sprintPrices;
    const canScore = Boolean(scoringPrices && sprintEntries.every((entry) => hasUsablePrices(entry.lineup.map((pick) => pick.ticker), scoringPrices)));
    if (sprint.status === "active" && expired && canScore && scoringPrices) {
      const finalRows = sprintEntries.map((entry) => ({ ...entry, ...scoreLeagueSprint(entry.lineup, sprint.opening_prices, scoringPrices) }));
      await Promise.all(finalRows.map((entry) => supabase.from("league_sprint_entries").update({ final_points: entry.points }).eq("id", entry.id)));
      const settled = await supabase.from("league_sprints").update({ status: "complete", closing_prices: scoringPrices }).eq("id", sprint.id).eq("status", "active");
      if (!settled.error) { sprint.status = "complete"; sprint.closing_prices = scoringPrices; }
    }
    const finalPrices = sprint.status === "complete" ? sprint.closing_prices : scoringPrices;
    const rows = finalPrices && canScore
      ? sprintEntries.map((entry) => {
        const score = scoreLeagueSprint(entry.lineup, sprint.opening_prices, finalPrices);
        return { ...entry, ...score, points: sprint.status === "complete" ? entry.final_points ?? score.points : score.points };
      })
      : [];
    const ranked = rankLeagueSprint(rows);
    for (const entry of sprintEntries) {
      const result = ranked.find((row) => row.id === entry.id);
      quickResults.set(`${sprint.league_id}:${playerReferenceKey(entry)}`, {
        points: result?.points ?? entry.final_points,
        rank: result?.rank ?? null,
        returnPercent: result?.returnPercent ?? null,
        lineup: entry.lineup,
      });
    }
    if (finalPrices && canScore) quickStats.set(sprint.league_id, summarizeLeagueStocks(sprintEntries.map((entry) => entry.lineup), sprint.opening_prices, finalPrices));
  }
  const payload = (leagues.data ?? []).map((league) => ({
    id: league.id,
    name: league.name,
    join_code: league.join_code,
    created_at: league.created_at,
    isOwner: identity.userId ? league.owner_user_id === identity.userId : league.owner_guest_hash === identity.guestHash,
    quickRound: latestSprintByLeague.has(league.id) ? {
      status: latestSprintByLeague.get(league.id)!.status,
      startsAt: latestSprintByLeague.get(league.id)!.starts_at,
      endsAt: latestSprintByLeague.get(league.id)!.ends_at,
      stats: quickStats.get(league.id) ?? null,
    } : null,
    members: (members.data ?? []).filter((member) => member.league_id === league.id).map((member) => ({
      name: profiles.get(playerReferenceKey(member))?.username ?? fallbackPlayerName(member),
      tone: profiles.get(playerReferenceKey(member))?.avatarTone ?? "hazard",
      joinedAt: member.joined_at,
      teamEntryId: entryPoints.get(member.owner_user_id ? `user:${member.owner_user_id}` : `guest:${member.guest_session_hash}`)?.id ?? null,
      points: entryPoints.get(member.owner_user_id ? `user:${member.owner_user_id}` : `guest:${member.guest_session_hash}`)?.points ?? null,
      quickPoints: quickResults.get(`${league.id}:${playerReferenceKey(member)}`)?.points ?? null,
      quickRank: quickResults.get(`${league.id}:${playerReferenceKey(member)}`)?.rank ?? null,
      quickReturnPercent: quickResults.get(`${league.id}:${playerReferenceKey(member)}`)?.returnPercent ?? null,
      quickLineup: quickResults.get(`${league.id}:${playerReferenceKey(member)}`)?.lineup ?? null,
    })),
  }));
  return withPlayerCookie(NextResponse.json({ leagues: payload, quickLeagueReady }), identity);
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "League persistence is not configured." }, { status: 503 });
  const identity = await resolvePlayerIdentity(request, supabase);
  if (!identity) return NextResponse.json({ error: "Your session has expired. Verify your wallet again." }, { status: 401 });
  let body: { action?: unknown; name?: unknown; code?: unknown; leagueId?: unknown };
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
  if (body.action === "start_sprint") {
    const leagueId = typeof body.leagueId === "string" ? body.leagueId : "";
    const league = await supabase.from("leagues").select("id,owner_user_id,owner_guest_hash").eq("id", leagueId).maybeSingle<{ id: string; owner_user_id: string | null; owner_guest_hash: string | null }>();
    if (!league.data) return NextResponse.json({ error: "That league does not exist." }, { status: 404 });
    const ownsLeague = identity.userId ? league.data.owner_user_id === identity.userId : league.data.owner_guest_hash === identity.guestHash;
    if (!ownsLeague) return NextResponse.json({ error: "Only the league owner can start a Quick League." }, { status: 403 });
    const activeSprint = await supabase.from("league_sprints").select("id").eq("league_id", leagueId).eq("status", "active").maybeSingle<{ id: string }>();
    if (activeSprint.error?.code === "42P01") return NextResponse.json({ error: "Run migration 010 before starting a Quick League." }, { status: 503 });
    if (activeSprint.data) return NextResponse.json({ error: "This league already has a Quick League running." }, { status: 409 });
    const leagueMembers = await supabase.from("league_members").select("league_id,owner_user_id,guest_session_hash,joined_at").eq("league_id", leagueId).returns<Member[]>();
    if ((leagueMembers.data?.length ?? 0) < 2) return NextResponse.json({ error: "Invite one more player before starting the Quick League." }, { status: 409 });
    const teams = await Promise.all((leagueMembers.data ?? []).map(async (member) => ({ member, team: await readActiveTeam(supabase, memberIdentity(member)) })));
    if (teams.some(({ team }) => !team)) return NextResponse.json({ error: "Every league member must draft an active team first." }, { status: 409 });
    let prices: PricePoint[];
    try { prices = await readChainlinkPrices(); } catch { return NextResponse.json({ error: "Fresh market prices are required to start the Quick League." }, { status: 503 }); }
    const tickers = teams.flatMap(({ team }) => team?.picks.map((pick) => pick.ticker) ?? []);
    if (!hasUsablePrices(tickers, prices)) return NextResponse.json({ error: "A required market feed is held. Try again when fresh prices return." }, { status: 503 });
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + LEAGUE_SPRINT_MINUTES * 60 * 1_000);
    const sprint = await supabase.from("league_sprints").insert({ league_id: leagueId, starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(), opening_prices: prices }).select("id").single<{ id: string }>();
    if (sprint.error || !sprint.data) return NextResponse.json({ error: "The Quick League could not start." }, { status: 503 });
    const entries = teams.map(({ member, team }) => ({ sprint_id: sprint.data.id, team_id: team!.id, owner_user_id: member.owner_user_id, guest_session_hash: member.guest_session_hash, lineup: team!.picks }));
    const inserted = await supabase.from("league_sprint_entries").insert(entries);
    if (inserted.error) {
      await supabase.from("league_sprints").delete().eq("id", sprint.data.id);
      return NextResponse.json({ error: "The Quick League could not snapshot every team." }, { status: 503 });
    }
    return withPlayerCookie(NextResponse.json({ started: true, endsAt: endsAt.toISOString() }, { status: 201 }), identity);
  }
  return NextResponse.json({ error: "Choose whether to create or join a league." }, { status: 400 });
}

function memberIdentity(member: Member): PlayerIdentity {
  return { userId: member.owner_user_id, guestId: null, guestHash: member.guest_session_hash ?? "", sessionHash: member.guest_session_hash ?? "" };
}
