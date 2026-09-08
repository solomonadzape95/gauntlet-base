"use client";

import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Check, Clock3, Copy, Radio, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { useGauntletAuth } from "@/components/gauntlet-auth";
import { resolveBattleIntent, storedSessionMatchesIntent } from "@/lib/battle-intent";
import { hasUsablePrices, priceReturn, scoreLineup, type PricePoint, type ScoredPick } from "@/lib/battle-scoring";
import { clearBattleSession, createBattleSession, readBattleSession, remainingBattleSeconds, saveBattleSession, updateBattlePrices } from "@/lib/battle-session";
import type { BattleRecord } from "@/lib/battle-record";
import { defaultPracticeDraft } from "@/lib/practice-game";
import { playerHeaders } from "@/lib/team-client";
import { useBattleSession } from "@/lib/use-battle-session";
import { useActiveTeam } from "@/lib/use-active-team";

const rival = defaultPracticeDraft();
const rivalPicks = ["MSFTc", "GOOGLc", "AMZNc"];
rival.picks = rival.picks.map((pick, index) => ({ ...pick, ticker: rivalPicks[index] }));

export default function DemoBattlePage() {
  return <Suspense fallback={<div className="shell page-shell"><p className="eyebrow hazard">LOADING BATTLE…</p></div>}><BattleBoundary /></Suspense>;
}

function BattleBoundary() {
  const searchParams = useSearchParams();
  return <Battle key={searchParams.toString()} searchParams={searchParams} />;
}

function Battle({ searchParams }: { searchParams: ReturnType<typeof useSearchParams> }) {
  const { session: authSession } = useGauntletAuth();
  const router = useRouter();
  const intent = useMemo(() => resolveBattleIntent(searchParams), [searchParams]);
  const serverBattleId = intent.kind === "durable" ? intent.battleId : null;
  const [serverBattle, setServerBattle] = useState<BattleRecord | null>(null);
  const [serverLoading, setServerLoading] = useState(Boolean(serverBattleId));
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverRole, setServerRole] = useState<"creator" | "opponent" | "visitor" | null>(null);
  const [serverMarketStatus, setServerMarketStatus] = useState<"waiting" | "live" | "held" | "final" | null>(null);
  const challengerPicks = serverBattle?.player_picks ?? null;
  const { team: draft, loading: teamLoading, error: teamLoadError } = useActiveTeam();
  const storedSession = useBattleSession();
  const belongsToCurrentPlayer = authSession
    ? storedSession?.ownerUserId === authSession.user.id
    : storedSession?.ownerUserId == null;
  const activeSession = belongsToCurrentPlayer && storedSessionMatchesIntent(storedSession, intent, intent.kind !== "durable" || Boolean(serverBattle)) ? storedSession : null;
  const started = Boolean(activeSession);
  const [remaining, setRemaining] = useState(24 * 60 * 60);
  const [marketPreview, setMarketPreview] = useState<PricePoint[]>([]);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [loadingMarket, setLoadingMarket] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "creating" | "copied" | "shared">("idle");
  const openingPrices = activeSession?.openingPrices ?? [];
  const currentPrices = activeSession?.currentPrices ?? marketPreview;

  useEffect(() => {
    if (intent.kind !== "practice" || !intent.reset) return;
    clearBattleSession();
    router.replace("/battle/demo?mode=practice");
  }, [intent, router]);

  useEffect(() => {
    if (!serverBattleId) return;
    let cancelled = false;
    fetchDurableBattle(serverBattleId, authSession)
      .then((result) => {
        if (!cancelled) {
          setServerBattle(result.battle);
          setServerRole(result.role);
          setServerMarketStatus(result.marketDataStatus);
          setMarketPreview(result.currentPrices);
        }
      })
      .catch((cause) => {
        if (!cancelled) setServerError(cause instanceof Error ? cause.message : "Could not load this challenge.");
      })
      .finally(() => { if (!cancelled) setServerLoading(false); });
    return () => { cancelled = true; };
  }, [authSession, serverBattleId]);

  const loadMarket = useCallback(async () => {
    const saved = readBattleSession();
    const durableId = serverBattleId && (saved?.serverBattleId === serverBattleId || saved?.sharedBattleId === serverBattleId)
      ? serverBattleId
      : !serverBattleId ? saved?.serverBattleId : null;
    if (saved && durableId) {
      const result = await fetchDurableBattle(durableId, authSession);
      setServerMarketStatus(result.marketDataStatus);
      if (result.battle.status === "waiting" || !result.battle.opening_prices || !result.battle.starts_at || !result.battle.ends_at) {
        setServerBattle(result.battle);
        setMarketPreview(result.currentPrices);
        return result.currentPrices;
      }
      const creator = saved.sharedBattleId === durableId || saved.serverRole !== "opponent";
      const resultTickers = [...result.battle.player_picks, ...(result.battle.opponent_picks ?? [])].map((pick) => pick.ticker);
      const next = {
        ...saved,
        playerPicks: creator ? result.battle.player_picks : result.battle.opponent_picks ?? saved.playerPicks,
        rivalPicks: creator ? result.battle.opponent_picks ?? saved.rivalPicks : result.battle.player_picks,
        openingPrices: result.battle.opening_prices,
        currentPrices: hasUsablePrices(resultTickers, result.currentPrices) ? result.currentPrices : saved.currentPrices,
        endsAt: result.battle.ends_at,
        startedAt: result.battle.starts_at,
      };
      saveBattleSession(next);
      setServerBattle(result.battle);
      setMarketPreview(result.currentPrices);
      return result.currentPrices;
    }
    const response = await fetch("/api/market", { cache: "no-store" });
    const result = await response.json() as { prices?: PricePoint[]; error?: string };
    if (!response.ok || !result.prices) throw new Error(result.error ?? "Could not read Base market data.");
    setMarketPreview(result.prices);
    updateBattlePrices(result.prices);
    return result.prices;
  }, [authSession, serverBattleId]);

  useEffect(() => {
    if (!started || (!serverBattleId && activeSession && remainingBattleSeconds(activeSession) === 0)) return;
    const timer = window.setInterval(() => {
      if (activeSession) setRemaining(remainingBattleSeconds(activeSession));
    }, 1000);
    const refreshDelay = serverBattle?.status === "waiting" ? 5_000 : 60_000;
    const marketTimer = window.setInterval(() => void loadMarket().catch(() => setMarketError("The latest feed refresh failed. The last verified prices remain on screen.")), refreshDelay);
    return () => {
      window.clearInterval(timer);
      window.clearInterval(marketTimer);
    };
  }, [activeSession, loadMarket, serverBattle?.status, serverBattleId, started]);

  useEffect(() => {
    if (!serverBattleId || serverBattle?.status !== "waiting" || started) return;
    const timer = window.setInterval(() => {
      void fetchDurableBattle(serverBattleId, authSession).then((result) => {
        setServerBattle(result.battle);
        setServerRole(result.role);
        setServerMarketStatus(result.marketDataStatus);
        setMarketPreview(result.currentPrices);
      }).catch(() => setServerError("This challenge could not be refreshed."));
    }, 5_000);
    return () => window.clearInterval(timer);
  }, [authSession, serverBattle?.status, serverBattleId, started]);

  useEffect(() => {
    if (!draft || !serverBattle || serverRole !== "creator" || serverBattle.status !== "active" || !serverBattle.opponent_picks || !serverBattle.opening_prices || !serverBattle.starts_at || !serverBattle.ends_at || activeSession) return;
    saveBattleSession(createBattleSession({
      playerDraftId: draft.id,
      playerPicks: serverBattle.player_picks,
      rivalPicks: serverBattle.opponent_picks,
      openingPrices: serverBattle.opening_prices,
      serverBattleId: serverBattle.id,
      serverRole: "creator",
      ownerUserId: authSession?.user.id ?? null,
      battleId: serverBattle.id,
      endsAt: serverBattle.ends_at,
      now: new Date(serverBattle.starts_at),
    }));
  }, [activeSession, authSession?.user.id, draft, serverBattle, serverRole]);

  const activePlayerPicks: ScoredPick[] = useMemo(() => activeSession?.playerPicks ?? (serverRole === "creator" ? serverBattle?.player_picks : draft?.picks) ?? [], [activeSession?.playerPicks, draft?.picks, serverBattle?.player_picks, serverRole]);
  const activeRivalPicks: ScoredPick[] = activeSession?.rivalPicks ?? (serverRole === "creator" ? serverBattle?.opponent_picks : challengerPicks) ?? rival.picks;
  const battleTickers = useMemo(() => [...new Set([...activePlayerPicks, ...activeRivalPicks].map((pick) => pick.ticker))], [activePlayerPicks, activeRivalPicks]);
  const pricesUsable = serverMarketStatus !== "held" && hasUsablePrices(battleTickers, currentPrices);
  const playerScore = scoreLineup(activePlayerPicks, openingPrices, currentPrices);
  const rivalScore = scoreLineup(activeRivalPicks, openingPrices, currentPrices);
  const leading = playerScore >= rivalScore;
  const holdings = activePlayerPicks.map((pick) => {
    const opening = openingPrices.find((item) => item.ticker === pick.ticker)?.price ?? 0;
    const current = currentPrices.find((item) => item.ticker === pick.ticker)?.price ?? 0;
    return [pick.ticker, priceReturn(opening, current)] as const;
  });
  const strongestPick = holdings.reduce((best, item) => item[1] > best[1] ? item : best, holdings[0] ?? ["—", 0] as const);
  const canOwnBattleDraft = Boolean(!serverBattleId && draft && activeSession?.playerDraftId === draft.id);
  const isComplete = serverBattleId ? serverBattle?.status === "complete" : Boolean(activeSession && remainingBattleSeconds(activeSession) === 0);
  const settling = Boolean(serverBattleId && activeSession && remainingBattleSeconds(activeSession) === 0 && serverBattle?.status !== "complete");
  const awaitingOpponent = Boolean(serverBattleId && serverRole === "creator" && serverBattle?.status === "waiting");
  const isTie = Math.abs(playerScore - rivalScore) < 0.000_001;
  const feedTimestamp = currentPrices.reduce((latest, point) => point.updatedAt > latest ? point.updatedAt : latest, "");

  async function enterBattle() {
    if (!draft || serverRole === "creator") return;
    setLoadingMarket(true);
    setMarketError(null);
    try {
      const prices = await loadMarket();
      if (!hasUsablePrices(battleTickers, prices)) {
        throw new Error("A required feed is held or stale. Start the battle when fresh market data resumes.");
      }
      let joinedBattle = serverBattle;
      if (serverBattleId) {
        joinedBattle = await joinDurableBattle(serverBattleId, authSession);
        setServerBattle(joinedBattle);
        setServerRole("opponent");
        setServerMarketStatus("live");
      }
      const session = createBattleSession({
        playerDraftId: draft.id,
        playerPicks: draft.picks,
        rivalPicks: joinedBattle?.player_picks ?? activeRivalPicks,
        openingPrices: joinedBattle?.opening_prices ?? prices,
        challengeCode: null,
        serverBattleId: serverBattleId ?? null,
        serverRole: serverBattleId ? "opponent" : null,
        ownerUserId: authSession?.user.id ?? null,
        battleId: joinedBattle?.id,
        endsAt: joinedBattle?.ends_at ?? undefined,
      });
      saveBattleSession(session);
      setRemaining(remainingBattleSeconds(session));
    } catch (cause) {
      setMarketError(cause instanceof Error ? cause.message : "Could not start this battle.");
    } finally {
      setLoadingMarket(false);
    }
  }

  async function shareChallenge() {
    if (!serverBattleId) return;
    setShareState("creating");
    const url = `${window.location.origin}/battle/demo?battle=${serverBattleId}`;
    if (navigator.share) {
      try {
        setShareState("idle");
        await navigator.share({ title: "Gauntlet practice battle", text: "Run your lineup against mine on Gauntlet.", url });
        void markDurableBattleShared(serverBattleId, authSession);
        setShareState("shared");
        window.setTimeout(() => setShareState("idle"), 1800);
        return;
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
      }
    }
    await navigator.clipboard.writeText(url);
    void markDurableBattleShared(serverBattleId, authSession);
    setShareState("copied");
    window.setTimeout(() => setShareState("idle"), 1800);
  }

  if (serverLoading || (!activeSession && teamLoading)) return <div className="shell page-shell"><p className="eyebrow hazard">LOADING YOUR TEAM…</p></div>;

  if (intent.kind === "hub" || intent.kind === "create") {
    return <div className="shell page-shell"><section className="battle-lobby dashboard-panel"><div><p className="eyebrow hazard">CHOOSE A BATTLE</p><strong>PRACTICE OR CHALLENGE?</strong><p>Practice battles stay local. Friend challenges are durable server records with their own scoring window.</p></div><Link className="primary-action" href="/battle">OPEN BATTLE DESK <ArrowRight size={16} /></Link></section></div>;
  }

  if (serverError && serverBattleId) {
    return <div className="shell page-shell"><section className="battle-lobby dashboard-panel"><div><p className="eyebrow hazard">CHALLENGE UNAVAILABLE</p><strong>THIS BATTLE IS NOT IN THE DATABASE</strong><p>{serverError} No browser copy will be shown in its place.</p></div><Link className="primary-action" href="/battle">BACK TO BATTLE DESK <ArrowRight size={16} /></Link></section></div>;
  }

  if (!activeSession && !draft) {
    const returnPath = serverBattleId
      ? `/battle/demo?battle=${encodeURIComponent(serverBattleId)}`
      : "/battle/demo?mode=practice";
    return (
      <div className="shell page-shell battle-page">
        <header className="dashboard-titlebar battle-titlebar">
          <div><p className="eyebrow hazard">TEAM REQUIRED</p><h1>Bring your own lineup</h1></div>
          <span className="battle-mode">NO MONEY AT RISK</span>
        </header>
        <section className="battle-lobby dashboard-panel">
          <div><p className="eyebrow">DRAFT BEFORE YOU BATTLE</p><strong>{teamLoadError ? "YOUR TEAM COULD NOT BE LOADED" : challengerPicks ? "YOUR OPPONENT IS WAITING" : "BUILD YOUR FIRST TEAM"}</strong><p>{teamLoadError ?? "Choose three to five stocks and allocate the full virtual $1,000. This team will be yours across future battles; each match locks a snapshot when it begins."}</p></div>
          <Link className="primary-action" href={`/draft?returnTo=${encodeURIComponent(returnPath)}`}>{challengerPicks ? "DRAFT TEAM TO ACCEPT" : "DRAFT YOUR TEAM"} <ArrowRight size={16} /></Link>
        </section>
      </div>
    );
  }

  return (
    <div className="shell page-shell battle-page">
      <header className="dashboard-titlebar battle-titlebar">
        <div><p className="eyebrow hazard">{serverBattleId ? `PLAYER CHALLENGE · ${serverBattle?.duration_minutes === 60 ? "1 HOUR" : "24 HOURS"}` : "SOLO PRACTICE · 24 HOURS"}</p><h1>Head to head</h1></div>
        <span className="battle-mode">NO MONEY AT RISK</span>
      </header>

      {awaitingOpponent ? (
        <>
          <div className="battle-status"><span><Radio size={14} /> CHALLENGE OPEN</span><span><Clock3 size={14} /> {serverBattle?.duration_minutes === 60 ? "1 HOUR" : "24 HOURS"} · STARTS WHEN JOINED</span></div>
          <section className="battle-lobby dashboard-panel">
            <div><p className="eyebrow hazard">CHALLENGE READY</p><strong>{activePlayerPicks.map((pick) => pick.ticker).join(" · ")}</strong><p>This durable challenge starts—and locks both lineups and opening prices—when another player accepts with their active team.</p></div>
            <button className="primary-action" onClick={() => void shareChallenge()}><Copy size={15} /> {shareState === "copied" ? "LINK COPIED" : "SHARE CHALLENGE"}</button>
          </section>
        </>
      ) : !started ? (
        <section className="battle-lobby dashboard-panel">
          <div><p className="eyebrow">YOUR LINEUP IS READY</p><strong>{activePlayerPicks.map((pick) => pick.ticker).join(" · ")}</strong><p>The clock starts after fresh Chainlink total-return prices are locked for both lineups. Feeds run 24/5 and hold their last value when markets close.</p>{marketError && <p className="battle-data-error">{marketError}</p>}</div>
          <button className="primary-action" disabled={loadingMarket} onClick={() => void enterBattle()}>{loadingMarket ? "LOCKING PRICES…" : serverBattleId ? "ACCEPT CHALLENGE" : "START PRACTICE"} <ArrowRight size={16} /></button>
        </section>
      ) : (
        <>
          <div className="battle-status"><span><Radio size={14} /> {awaitingOpponent ? "CHALLENGE OPEN" : isComplete ? "FINAL · CHAINLINK" : settling ? "SETTLING · CHAINLINK" : pricesUsable ? "LIVE · CHAINLINK" : "FEED HELD"}{feedTimestamp ? ` · ${new Date(feedTimestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}</span><span><Clock3 size={14} /> {awaitingOpponent ? "WAITING FOR OPPONENT" : isComplete ? "COMPLETE" : settling ? "VERIFYING FINAL SNAPSHOT" : `${formatDuration(remaining)} REMAINING`}</span></div>
          {awaitingOpponent ? (
            <section className="battle-lobby dashboard-panel">
              <div><p className="eyebrow hazard">CHALLENGE SENT</p><strong>{activePlayerPicks.map((pick) => pick.ticker).join(" · ")}</strong><p>Your original practice battle is unchanged. This new head-to-head starts—and locks its Chainlink opening prices—when your opponent enters with their lineup.</p></div>
            </section>
          ) : <>
            <section className="versus-grid">
            <Competitor name="YOU" score={playerScore} rank={isTie ? "T" : leading ? "01" : "02"} stocks={holdings} leading={!isTie && leading} />
            <div className="versus-mark">VS</div>
            <Competitor name={activeSession?.serverRole === "creator" ? "OPPONENT" : challengerPicks ? "CHALLENGER" : "NOVA"} score={rivalScore} rank={isTie ? "T" : leading ? "02" : "01"} stocks={activeRivalPicks.map((pick) => {
              const opening = openingPrices.find((item) => item.ticker === pick.ticker)?.price ?? 0;
              const current = currentPrices.find((item) => item.ticker === pick.ticker)?.price ?? 0;
              return [pick.ticker, priceReturn(opening, current)] as const;
            })} leading={!isTie && !leading} />
            </section>
            <section className="battle-proof"><ShieldCheck size={20} /><div><strong>CHAINLINK TOTAL-RETURN SCORE</strong><p>This battle uses virtual funds and official Base feed addresses. Owning stocks is optional and never changes the score.{marketError ? ` ${marketError}` : ""}</p></div></section>
            <section className="battle-conversion dashboard-panel">
            <div className="battle-conversion-copy"><p className="checkpoint-heading">{isComplete ? "FINAL LINEUP RESULT" : "LIVE LINEUP CHECKPOINT"}</p><h2><span>PNL</span>{playerScore >= 0 ? "+" : ""}{playerScore.toFixed(2)}%</h2><p>{strongestPick[0]} is currently the strongest contributor at {strongestPick[1] >= 0 ? "+" : ""}{strongestPick[1].toFixed(2)}%. If you want real exposure, buy a small version of this exact lineup; ownership never changes the game score.</p></div>
            <div className="battle-conversion-art" aria-hidden />
            <Link className="primary-action" href={canOwnBattleDraft && activeSession ? `/draft?own=${encodeURIComponent(activeSession.playerDraftId)}` : "/draft"}>{canOwnBattleDraft ? "OWN THIS LINEUP" : "BUILD A LINEUP"} <ArrowRight size={16} /></Link>
            </section>
          </>}
          {serverBattleId ? <button className="secondary-action battle-share" disabled={shareState === "creating"} onClick={() => void shareChallenge()}>{shareState === "idle" || shareState === "creating" ? <Copy size={15} /> : <Check size={15} />}{shareState === "shared" ? "CHALLENGE SHARED" : shareState === "copied" ? "CHALLENGE LINK COPIED" : "SHARE THIS BATTLE"}</button> : <Link className="secondary-action battle-share" href="/battle">CREATE A FRIEND CHALLENGE</Link>}
        </>
      )}
    </div>
  );
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return [hours, minutes, rest].map((value) => String(value).padStart(2, "0")).join(":");
}

type DurableBattleResponse = { battle?: BattleRecord; currentPrices?: PricePoint[]; role?: "creator" | "opponent" | "visitor"; marketDataStatus?: "waiting" | "live" | "held" | "final"; error?: string };

async function fetchDurableBattle(id: string, session: Session | null) {
  const response = await fetch(`/api/challenges/${encodeURIComponent(id)}`, { cache: "no-store", headers: playerHeaders(session) });
  const result = await response.json() as DurableBattleResponse;
  if (!response.ok || !result.battle || !result.currentPrices || !result.role || !result.marketDataStatus) throw new Error(result.error ?? "Could not load this challenge.");
  return { battle: result.battle, currentPrices: result.currentPrices, role: result.role, marketDataStatus: result.marketDataStatus };
}

async function joinDurableBattle(id: string, session: Session | null) {
  const response = await fetch(`/api/challenges/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: playerHeaders(session),
  });
  const result = await response.json() as DurableBattleResponse;
  if (!response.ok || !result.battle) throw new Error(result.error ?? "Could not join this challenge.");
  return result.battle;
}

async function markDurableBattleShared(id: string, session: Session | null) {
  await fetch(`/api/challenges/${encodeURIComponent(id)}`, { method: "POST", headers: playerHeaders(session) });
}

function Competitor({ name, score, rank, stocks, leading = false }: { name: string; score: number; rank: string; stocks: readonly (readonly [string, number])[]; leading?: boolean }) {
  return (
    <article className={`competitor ${leading ? "leading" : ""}`}>
      <div className="competitor-top"><span className="rank">{rank}</span><span className="status-chip"><span /> VIRTUAL</span></div>
      <h2>{name}</h2><p className="wallet-address">PRACTICE PORTFOLIO</p>
      <strong className="battle-score">{score >= 0 ? "+" : ""}{score.toFixed(2)}%</strong>
      <div className="holding-list">
        {stocks.map(([ticker, change]) => <div key={ticker}><span>{ticker}</span><strong className={change >= 0 ? "up" : "down"}>{change >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}{change >= 0 ? "+" : ""}{change.toFixed(2)}%</strong></div>)}
      </div>
    </article>
  );
}
