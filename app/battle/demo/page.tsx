"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check, Clock3, Copy, Radio, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { hasUsablePrices, priceReturn, scoreLineup, type PricePoint, type ScoredPick } from "@/lib/battle-scoring";
import { createBattleSession, readBattleSession, remainingBattleSeconds, saveBattleSession, updateBattlePrices } from "@/lib/battle-session";
import type { BattleRecord } from "@/lib/battle-record";
import { decodeChallenge, encodeChallenge } from "@/lib/challenge-code";
import { defaultPracticeDraft } from "@/lib/practice-game";
import { useBattleSession } from "@/lib/use-battle-session";
import { usePracticeDrafts } from "@/lib/use-practice-drafts";

const rival = defaultPracticeDraft();
const rivalPicks = ["MSFTc", "GOOGLc", "AMZNc"];
rival.picks = rival.picks.map((pick, index) => ({ ...pick, ticker: rivalPicks[index] }));

export default function DemoBattlePage() {
  return <Suspense fallback={<div className="shell page-shell"><p className="eyebrow hazard">LOADING BATTLE…</p></div>}><Battle /></Suspense>;
}

function Battle() {
  const searchParams = useSearchParams();
  const challengeCode = searchParams.get("challenge");
  const serverBattleId = searchParams.get("battle");
  const challenge = useMemo(() => decodeChallenge(challengeCode), [challengeCode]);
  const [serverBattle, setServerBattle] = useState<BattleRecord | null>(null);
  const [serverLoading, setServerLoading] = useState(Boolean(serverBattleId));
  const challengerPicks = serverBattle?.player_picks ?? challenge?.picks ?? null;
  const drafts = usePracticeDrafts();
  const draft = drafts[0] ?? null;
  const storedSession = useBattleSession();
  const activeSession = storedSession && (
    serverBattleId ? storedSession.serverBattleId === serverBattleId : storedSession.challengeCode === challengeCode && !storedSession.serverBattleId
  ) ? storedSession : null;
  const started = Boolean(activeSession);
  const [remaining, setRemaining] = useState(24 * 60 * 60);
  const [marketPreview, setMarketPreview] = useState<PricePoint[]>([]);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [loadingMarket, setLoadingMarket] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "creating" | "copied" | "shared">("idle");
  const openingPrices = activeSession?.openingPrices ?? [];
  const currentPrices = activeSession?.currentPrices ?? marketPreview;

  useEffect(() => {
    if (!serverBattleId) return;
    let cancelled = false;
    fetch(`/api/challenges/${encodeURIComponent(serverBattleId)}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as { battle?: BattleRecord; currentPrices?: PricePoint[]; error?: string };
        if (!response.ok || !result.battle) throw new Error(result.error ?? "Could not load this challenge.");
        if (!cancelled) {
          setServerBattle(result.battle);
          if (result.currentPrices) setMarketPreview(result.currentPrices);
        }
      })
      .catch((cause) => {
        if (!cancelled) setMarketError(cause instanceof Error ? cause.message : "Could not load this challenge.");
      })
      .finally(() => { if (!cancelled) setServerLoading(false); });
    return () => { cancelled = true; };
  }, [serverBattleId]);

  const loadMarket = useCallback(async () => {
    const saved = readBattleSession();
    if (saved?.serverBattleId) {
      const response = await fetch(`/api/challenges/${encodeURIComponent(saved.serverBattleId)}`, { cache: "no-store" });
      const result = await response.json() as { battle?: BattleRecord; currentPrices?: PricePoint[]; error?: string };
      if (!response.ok || !result.battle || !result.currentPrices) throw new Error(result.error ?? "Could not refresh this challenge.");
      const next = {
        ...saved,
        rivalPicks: result.battle.opponent_picks ?? saved.rivalPicks,
        currentPrices: result.currentPrices,
        endsAt: result.battle.ends_at,
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
  }, []);

  useEffect(() => {
    if (!started || (activeSession && remainingBattleSeconds(activeSession) === 0)) return;
    const timer = window.setInterval(() => {
      if (activeSession) setRemaining(remainingBattleSeconds(activeSession));
    }, 1000);
    const marketTimer = window.setInterval(() => void loadMarket().catch(() => setMarketError("The latest feed refresh failed. The last verified prices remain on screen.")), 60_000);
    return () => {
      window.clearInterval(timer);
      window.clearInterval(marketTimer);
    };
  }, [activeSession, loadMarket, started]);

  const player = draft ?? defaultPracticeDraft();
  const activePlayerPicks: ScoredPick[] = activeSession?.playerPicks ?? player.picks;
  const activeRivalPicks: ScoredPick[] = activeSession?.rivalPicks ?? challengerPicks ?? rival.picks;
  const battleTickers = useMemo(() => [...new Set([...activePlayerPicks, ...activeRivalPicks].map((pick) => pick.ticker))], [activePlayerPicks, activeRivalPicks]);
  const pricesUsable = hasUsablePrices(battleTickers, currentPrices);
  const playerScore = scoreLineup(activePlayerPicks, openingPrices, currentPrices);
  const rivalScore = scoreLineup(activeRivalPicks, openingPrices, currentPrices);
  const leading = playerScore >= rivalScore;
  const holdings = activePlayerPicks.map((pick) => {
    const opening = openingPrices.find((item) => item.ticker === pick.ticker)?.price ?? 0;
    const current = currentPrices.find((item) => item.ticker === pick.ticker)?.price ?? 0;
    return [pick.ticker, priceReturn(opening, current)] as const;
  });
  const strongestPick = holdings.reduce((best, item) => item[1] > best[1] ? item : best, holdings[0] ?? ["—", 0] as const);
  const canOwnBattleDraft = Boolean(draft && activeSession?.playerDraftId === draft.id);
  const isComplete = Boolean(activeSession && remainingBattleSeconds(activeSession) === 0);
  const isTie = Math.abs(playerScore - rivalScore) < 0.000_001;
  const feedTimestamp = currentPrices.reduce((latest, point) => point.updatedAt > latest ? point.updatedAt : latest, "");

  async function enterBattle() {
    setLoadingMarket(true);
    setMarketError(null);
    try {
      const prices = await loadMarket();
      if (!hasUsablePrices(battleTickers, prices)) {
        throw new Error("A required feed is held or stale. Start the battle when fresh market data resumes.");
      }
      if (challenge && Date.parse(challenge.endsAt) <= Date.now()) throw new Error("This challenge has ended. Ask the player for a rematch link.");
      let joinedBattle = serverBattle;
      if (serverBattleId) {
        const response = await fetch(`/api/challenges/${encodeURIComponent(serverBattleId)}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ picks: player.picks }),
        });
        const result = await response.json() as { battle?: BattleRecord; error?: string };
        if (!response.ok || !result.battle) throw new Error(result.error ?? "Could not join this challenge.");
        joinedBattle = result.battle;
        setServerBattle(result.battle);
      }
      const session = createBattleSession({
        playerDraftId: player.id,
        playerPicks: player.picks,
        rivalPicks: joinedBattle?.player_picks ?? activeRivalPicks,
        openingPrices: joinedBattle?.opening_prices ?? challenge?.openingPrices ?? prices,
        challengeCode: serverBattleId ? null : challengeCode,
        serverBattleId: serverBattleId ?? null,
        battleId: joinedBattle?.id ?? challenge?.id,
        endsAt: joinedBattle?.ends_at ?? challenge?.endsAt,
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
    if (!activeSession) return;
    setShareState("creating");
    const code = encodeChallenge({
      id: activeSession.id,
      endsAt: activeSession.endsAt,
      picks: activePlayerPicks,
      openingPrices: activeSession.openingPrices,
    });
    let url = `${window.location.origin}/battle/demo?challenge=${code}`;
    if (activeSession.serverBattleId) {
      url = `${window.location.origin}/battle/demo?battle=${activeSession.serverBattleId}`;
    } else {
      try {
        const response = await fetch("/api/challenges", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ picks: activePlayerPicks }),
        });
        const result = await response.json() as { battle?: BattleRecord };
        if (response.ok && result.battle) url = `${window.location.origin}/battle/demo?battle=${result.battle.id}`;
      } catch {
        // Portable practice links remain available while server persistence is offline.
      }
    }
    if (navigator.share) {
      try {
        setShareState("idle");
        await navigator.share({ title: "Gauntlet practice battle", text: "Run your lineup against mine on Gauntlet.", url });
        setShareState("shared");
        window.setTimeout(() => setShareState("idle"), 1800);
        return;
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
      }
    }
    await navigator.clipboard.writeText(url);
    setShareState("copied");
    window.setTimeout(() => setShareState("idle"), 1800);
  }

  if (serverLoading) return <div className="shell page-shell"><p className="eyebrow hazard">LOADING SERVER CHALLENGE…</p></div>;

  return (
    <div className="shell page-shell battle-page">
      <header className="dashboard-titlebar battle-titlebar">
        <div><p className="eyebrow hazard">PRACTICE BATTLE · {challengerPicks ? "PLAYER CHALLENGE" : "MATCH 0007"}</p><h1>Head to head</h1></div>
        <span className="battle-mode">NO MONEY AT RISK</span>
      </header>

      {!draft && (
        <div className="practice-notice"><p>You are viewing the demo lineup. Build and save a draft to battle with your own picks.</p><Link href="/draft">BUILD A FREE DRAFT <ArrowRight size={14} /></Link></div>
      )}

      {!started ? (
        <section className="battle-lobby dashboard-panel">
          <div><p className="eyebrow">YOUR LINEUP IS READY</p><strong>{activePlayerPicks.map((pick) => pick.ticker).join(" · ")}</strong><p>The clock starts after fresh Chainlink total-return prices are locked for both lineups. Feeds run 24/5 and hold their last value when markets close.</p>{marketError && <p className="battle-data-error">{marketError}</p>}</div>
          <button className="primary-action" disabled={loadingMarket} onClick={() => void enterBattle()}>{loadingMarket ? "LOCKING PRICES…" : "ENTER PRACTICE BATTLE"} <ArrowRight size={16} /></button>
        </section>
      ) : (
        <>
          <div className="battle-status"><span><Radio size={14} /> {isComplete ? "FINAL · CHAINLINK" : pricesUsable ? "LIVE · CHAINLINK" : "FEED HELD"}{feedTimestamp ? ` · ${new Date(feedTimestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}</span><span><Clock3 size={14} /> {isComplete ? "COMPLETE" : `${formatDuration(remaining)} REMAINING`}</span></div>
          <section className="versus-grid">
            <Competitor name="YOU" score={playerScore} rank={isTie ? "T" : leading ? "01" : "02"} stocks={holdings} leading={!isTie && leading} />
            <div className="versus-mark">VS</div>
            <Competitor name={challengerPicks ? "CHALLENGER" : "NOVA"} score={rivalScore} rank={isTie ? "T" : leading ? "02" : "01"} stocks={activeRivalPicks.map((pick) => {
              const opening = openingPrices.find((item) => item.ticker === pick.ticker)?.price ?? 0;
              const current = currentPrices.find((item) => item.ticker === pick.ticker)?.price ?? 0;
              return [pick.ticker, priceReturn(opening, current)] as const;
            })} leading={!isTie && !leading} />
          </section>
          <section className="battle-proof"><ShieldCheck size={20} /><div><strong>CHAINLINK TOTAL-RETURN SCORE</strong><p>This battle uses virtual funds and official Base feed addresses. Owning stocks is optional and never changes the score.{marketError ? ` ${marketError}` : ""}</p></div></section>
          <section className="battle-conversion dashboard-panel">
            <div><p className="eyebrow hazard">{isComplete ? "FINAL LINEUP RESULT" : "LIVE LINEUP CHECKPOINT"}</p><h2>{playerScore >= 0 ? "+" : ""}{playerScore.toFixed(2)}% {isComplete ? "FINAL." : "SO FAR."}</h2><p>{strongestPick[0]} is currently the strongest contributor at {strongestPick[1] >= 0 ? "+" : ""}{strongestPick[1].toFixed(2)}%. If you want real exposure, buy a small version of this exact lineup; ownership never changes the game score.</p></div>
            <Link className="primary-action" href={canOwnBattleDraft && activeSession ? `/draft?own=${encodeURIComponent(activeSession.playerDraftId)}` : "/draft"}>{canOwnBattleDraft ? "OWN THIS LINEUP" : "BUILD A LINEUP"} <ArrowRight size={16} /></Link>
          </section>
          <button className="secondary-action battle-share" disabled={shareState === "creating"} onClick={() => void shareChallenge()}>{shareState === "idle" || shareState === "creating" ? <Copy size={15} /> : <Check size={15} />}{shareState === "creating" ? "CREATING CHALLENGE…" : shareState === "shared" ? "CHALLENGE SHARED" : shareState === "copied" ? "CHALLENGE LINK COPIED" : "CHALLENGE A FRIEND"}</button>
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
