"use client";

import { ArrowRight, LockKeyhole, Shield, Shuffle, Swords, Trophy, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { DitherAvatar } from "@/components/dither-avatar";
import { DraftBuilder } from "@/components/draft-builder";
import { GauntletLoader } from "@/components/gauntlet-loader";
import { useGauntletAuth } from "@/components/gauntlet-auth";
import { StockLogo } from "@/components/stock-logo";
import type { DraftMarketStock } from "@/lib/fantasy-market";
import { squadBank } from "@/lib/fantasy-market";
import type { PracticeDraft } from "@/lib/practice-game";
import { MARKET_QUOTES } from "@/lib/practice-game";
import { getStock, STOCKS } from "@/lib/stocks";
import { playerHeaders, saveActiveTeam } from "@/lib/team-client";
import { useActiveTeam } from "@/lib/use-active-team";

type TeamState = {
  team: PracticeDraft | null;
  bank: number;
  market: DraftMarketStock[];
  transferWindow: { open: boolean; closesAt?: string | null; reopensAt?: string | null };
  transfersUsed: number;
  penaltyPoints: number;
};

type Tab = "squad" | "transfers" | "market";

const previewMarket: DraftMarketStock[] = MARKET_QUOTES.map((quote) => ({ ticker: quote.ticker, price: quote.price, draftCost: Math.max(25, Math.min(500, Math.round(quote.price))), updatedAt: new Date(0).toISOString(), fresh: true }));
const previewTeam: PracticeDraft = { id: "preview-team", createdAt: new Date(0).toISOString(), status: "virtual", picks: ["NVDAc", "AAPLc", "TSLAc"].map((ticker) => ({ ticker, virtualAmount: previewMarket.find((quote) => quote.ticker === ticker)!.draftCost })) };

export function TeamRoom({ ownDraftId, returnTo, preview = false }: { ownDraftId?: string; returnTo?: string; preview?: boolean }) {
  const { session, profile } = useGauntletAuth();
  const active = useActiveTeam();
  const [state, setState] = useState<TeamState | null>(preview ? { team: previewTeam, bank: squadBank(previewTeam.picks), market: previewMarket, transferWindow: { open: true }, transfersUsed: 0, penaltyPoints: 0 } : null);
  const [tab, setTab] = useState<Tab>("squad");
  const [selected, setSelected] = useState<string[]>(preview ? previewTeam.picks.map((pick) => pick.ticker) : []);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [viewerPoints, setViewerPoints] = useState<number | null>(null);

  useEffect(() => {
    if (preview) return;
    let cancelled = false;
    fetch("/api/team", { cache: "no-store", headers: playerHeaders(session) }).then(async (response) => {
      const result = await response.json() as TeamState & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not load team management.");
      if (!cancelled) {
        setState(result);
        setSelected(result.team?.picks.map((pick) => pick.ticker) ?? []);
      }
    }).catch((cause) => { if (!cancelled) setMessage(cause instanceof Error ? cause.message : "Could not load team management."); });
    fetch("/api/leaderboard", { cache: "no-store", headers: playerHeaders(session) }).then(async (response) => {
      const result = await response.json() as { entries?: { id: string; points: number | null }[]; viewerEntryId?: string | null };
      if (!cancelled && result.viewerEntryId) setViewerPoints(result.entries?.find((entry) => entry.id === result.viewerEntryId)?.points ?? null);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [preview, session]);

  const team = state?.team ?? active.team;
  const market = state?.market ?? [];
  const selectionCost = selected.reduce((sum, ticker) => sum + (market.find((item) => item.ticker === ticker)?.draftCost ?? 0), 0);
  const bank = 1_000 - selectionCost;
  const projectedTransfers = team ? selected.filter((ticker) => !team.picks.some((pick) => pick.ticker === ticker)).length : 0;
  const projectedPenalty = Math.max(state?.penaltyPoints ?? 0, Math.max(0, (state?.transfersUsed ?? 0) + projectedTransfers - 1) * 25);
  const changed = Boolean(team && (selected.length !== team.picks.length || selected.some((ticker) => !team.picks.some((pick) => pick.ticker === ticker))));
  const playerName = profile?.username ?? (preview ? "NEBULA_CAPTAIN" : "YOUR TEAM");

  if (active.loading && !ownDraftId && !preview) return <GauntletLoader label="LOADING TEAM" />;
  if (ownDraftId || (!team && !active.loading)) return <DraftBuilder ownDraftId={ownDraftId} returnTo={returnTo} />;
  if (!team) return <div className="team-room-loading">{active.error ?? message ?? "TEAM UNAVAILABLE"}</div>;

  function toggle(ticker: string) {
    setMessage(null);
    setSelected((current) => {
      if (current.includes(ticker)) return current.length > 3 ? current.filter((item) => item !== ticker) : current;
      const cost = market.find((item) => item.ticker === ticker)?.draftCost ?? 0;
      return current.length < 5 && cost > 0 ? [...current, ticker] : current;
    });
  }

  async function saveTransfers() {
    if (!changed || selected.length < 3 || bank < 0 || !state?.transferWindow.open) return;
    setSaving(true);
    setMessage(null);
    try {
      const saved = await saveActiveTeam(selected.map((ticker) => ({ ticker, virtualAmount: market.find((item) => item.ticker === ticker)?.draftCost ?? 0 })), session);
      setState((current) => current ? { ...current, team: saved, bank: squadBank(saved.picks), transfersUsed: current.transfersUsed + projectedTransfers, penaltyPoints: projectedPenalty } : current);
      setSelected(saved.picks.map((pick) => pick.ticker));
      setTab("squad");
      setMessage("Transfers saved. Your upcoming Game Week snapshot has been updated.");
      setSaving(false);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Could not save transfers.");
      setSaving(false);
    }
  }

  return (
    <div className="team-room">
      <section className="team-identity-hero">
        <div className="team-identity-copy">
          <p className="eyebrow hazard">TEAM HEADQUARTERS · {state?.transferWindow.open ? "WINDOW OPEN" : "GAME WEEK LIVE"}</p>
          <div className="team-name-lockup"><DitherAvatar seed={playerName} tone={profile?.avatar_tone ?? "hazard"} size={82} /><div><span>MANAGER</span><h1>{playerName}</h1></div></div>
          <div className="team-command-grid">
            <Link href="/battle"><Swords size={18} /><span>Challenge</span></Link>
            <Link href="/leaderboard"><Trophy size={18} /><span>Game Week</span></Link>
            <Link href="/leagues"><Shield size={18} /><span>Leagues</span></Link>
            <Link href="/me#profile"><UserRound size={18} /><span>Profile</span></Link>
          </div>
        </div>
        <div className="team-metrics"><span><small>GAME WEEK PTS</small><strong>{viewerPoints?.toLocaleString() ?? "—"}</strong></span><span><small>STOCKS</small><strong>{team.picks.length}</strong></span><span><small>BANK</small><strong>{state?.bank ?? squadBank(team.picks)} CR</strong></span></div>
      </section>

      <nav className="team-tabs" aria-label="Team views">
        {(["squad", "transfers", "market"] as Tab[]).map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}
      </nav>
      {message && tab !== "transfers" && <p className="battle-data-error">{message}</p>}

      {tab === "squad" && <section className="squad-board">
        <div className="squad-board-heading"><div><p className="eyebrow">ACTIVE TEAM</p><h2>{team.picks.length} STOCKS ON THE FLOOR</h2></div><span>{squadBank(team.picks)} CR BANKED</span></div>
        <div className="squad-strips">{team.picks.map((pick, index) => {
          const stock = getStock(pick.ticker);
          return stock && <article key={pick.ticker} style={{ "--stock-tone": stock.tone } as React.CSSProperties}><span className="squad-number">0{index + 1}</span><span className="squad-logo"><StockLogo ticker={pick.ticker} /></span><span className="squad-company"><small>{stock.sector}</small><strong>{stock.company}</strong></span><span className="squad-price"><small>COST</small><strong>{pick.virtualAmount} CR</strong></span></article>;
        })}</div>
      </section>}

      {tab === "transfers" && <section className="transfer-desk">
        <header><div><p className="eyebrow hazard">TRANSFER WINDOW</p><h2>RESHAPE THE TEAM</h2><p>One incoming stock is free each Game Week. Every additional incoming stock deducts 25 points from that week.</p></div><div className={`transfer-budget ${bank < 0 ? "over" : ""}`}><small>BANK AFTER MOVES</small><strong>{bank} CR</strong><span>{bank < 0 ? "REMOVE A STOCK TO CONFIRM" : projectedPenalty ? `−${projectedPenalty} PTS` : "FREE MOVE AVAILABLE"}</span></div></header>
        {!state?.transferWindow.open && <div className="transfer-lock"><LockKeyhole size={20} /><div><strong>TEAM LOCKED</strong><p>The active Game Week must finish before this team can change.{state?.transferWindow.reopensAt ? ` Window reopens after ${new Date(state.transferWindow.reopensAt).toLocaleString()}.` : ""}</p></div></div>}
        <div className="transfer-list">{STOCKS.map((stock) => {
          const quote = market.find((item) => item.ticker === stock.ticker);
          const chosen = selected.includes(stock.ticker);
          const unaffordable = !chosen && selectionCost + (quote?.draftCost ?? 1_001) > 1_000;
          return <button key={stock.ticker} disabled={!state?.transferWindow.open || !quote || (!chosen && selected.length >= 5)} onClick={() => toggle(stock.ticker)} className={chosen ? "selected" : ""}><span className="transfer-logo"><StockLogo ticker={stock.ticker} /></span><span><strong>{stock.company}</strong><small>{stock.ticker} · {stock.sector}</small></span><span><small>DRAFT COST</small><strong>{quote ? `${quote.draftCost} CR` : "HELD"}</strong></span><span className="transfer-action">{chosen ? "REMOVE" : unaffordable ? "ADD · OVER BUDGET" : "ADD"}</span></button>;
        })}</div>
        <div className="transfer-save"><span><Shuffle size={17} /> {projectedTransfers} INCOMING · {selected.length}/5 STOCKS</span><button className="primary-action" disabled={!changed || saving || selected.length < 3 || bank < 0 || !state?.transferWindow.open} onClick={() => void saveTransfers()}>{saving ? "SAVING…" : "CONFIRM TRANSFERS"} <ArrowRight size={16} /></button></div>
        {message && <p className="battle-data-error">{message}</p>}
      </section>}

      {tab === "market" && <section className="market-ledger"><div className="squad-board-heading"><div><p className="eyebrow">ONCHAIN MARKET</p><h2>EVERY AVAILABLE STOCK</h2></div><span>PRICES REFRESH SERVER-SIDE</span></div><div>{STOCKS.map((stock) => {
        const quote = market.find((item) => item.ticker === stock.ticker);
        return <article key={stock.ticker}><span className="transfer-logo"><StockLogo ticker={stock.ticker} /></span><span><strong>{stock.company}</strong><small>{stock.ticker}</small></span><strong>{quote ? `${quote.draftCost} CR` : "HELD"}</strong><small>{quote ? `$${quote.price.toFixed(2)} REFERENCE` : "WAITING FOR FEED"}</small></article>;
      })}</div></section>}
    </div>
  );
}
