"use client";

import { ArrowRight, LockKeyhole, Shield, Shuffle, Swords, Trophy, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { DitherAvatar } from "@/components/dither-avatar";
import { DraftBuilder } from "@/components/draft-builder";
import { GauntletLoader } from "@/components/gauntlet-loader";
import { useGauntletAuth } from "@/components/gauntlet-auth";
import { StockProofPanel } from "@/components/stock-proof-panel";
import { StockLogo } from "@/components/stock-logo";
import { WalletButton } from "@/components/wallet-button";
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
  const { session, profile, status: authStatus, verified } = useGauntletAuth();
  const active = useActiveTeam();
  const [state, setState] = useState<TeamState | null>(preview ? { team: previewTeam, bank: squadBank(previewTeam.picks), market: previewMarket, transferWindow: { open: true }, transfersUsed: 0, penaltyPoints: 0 } : null);
  const [tab, setTab] = useState<Tab>("squad");
  const [selected, setSelected] = useState<string[]>(preview ? previewTeam.picks.map((pick) => pick.ticker) : []);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [viewerPoints, setViewerPoints] = useState<number | null>(null);
  const [proofTicker, setProofTicker] = useState<string | null>(null);

  useEffect(() => {
    if (preview || authStatus === "loading" || !verified) return;
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
  }, [authStatus, preview, session, verified]);

  const team = state?.team ?? active.team;
  const market = state?.market ?? [];
  const selectionCost = selected.reduce((sum, ticker) => {
    const current = market.find((item) => item.ticker === ticker)?.draftCost;
    const saved = team?.picks.find((pick) => pick.ticker === ticker)?.virtualAmount;
    return sum + (current ?? saved ?? 0);
  }, 0);
  const bank = 1_000 - selectionCost;
  const projectedTransfers = team ? selected.filter((ticker) => !team.picks.some((pick) => pick.ticker === ticker)).length : 0;
  const projectedPenalty = Math.max(state?.penaltyPoints ?? 0, Math.max(0, (state?.transfersUsed ?? 0) + projectedTransfers - 1) * 25);
  const changed = Boolean(team && (selected.length !== team.picks.length || selected.some((ticker) => !team.picks.some((pick) => pick.ticker === ticker))));
  const playerName = profile?.username ?? (preview ? "NEBULA_CAPTAIN" : "YOUR TEAM");

  if ((authStatus === "loading" || active.loading) && !ownDraftId && !preview) return <GauntletLoader label="LOADING TEAM" />;
  if (!verified && !preview) return <section className="draft-auth-gate dashboard-panel"><div><p className="eyebrow hazard">YOUR TEAM STARTS HERE</p><h1>Connect a wallet to draft.</h1><p>Your wallet keeps this team separate from everyone else and brings it back when you return.</p></div><WalletButton /></section>;
  if (ownDraftId || (!team && !active.loading)) return <DraftBuilder ownDraftId={ownDraftId} returnTo={returnTo} />;
  if (!team) return <div className="team-room-loading">{active.error ?? message ?? "TEAM UNAVAILABLE"}</div>;

  function toggle(ticker: string) {
    setMessage(null);
    setSelected((current) => {
      if (current.includes(ticker)) return current.filter((item) => item !== ticker);
      const cost = market.find((item) => item.ticker === ticker)?.draftCost ?? 0;
      return current.length < 5 && cost > 0 ? [...current, ticker] : current;
    });
  }

  async function saveTransfers() {
    if (!changed || selected.length < 3 || bank < 0 || !state?.transferWindow.open) return;
    setSaving(true);
    setMessage(null);
    try {
      const saved = await saveActiveTeam(selected.map((ticker) => ({
        ticker,
        virtualAmount: team?.picks.find((pick) => pick.ticker === ticker)?.virtualAmount ?? market.find((item) => item.ticker === ticker)?.draftCost ?? 0,
      })), session);
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
        <div className="team-identity-main">
          <div className="team-identity-copy">
            <div className="team-name-lockup"><DitherAvatar seed={playerName} tone={profile?.avatar_tone ?? "hazard"} size={82} /><h1>{playerName.toLocaleLowerCase()}</h1></div>
            <div className="team-command-grid">
              <Link href="/battle"><Swords size={18} /><span>Challenge</span></Link>
              <Link href="/leaderboard"><Trophy size={18} /><span>Game Week</span></Link>
              <Link href="/leagues"><Shield size={18} /><span>Leagues</span></Link>
              <Link href="/me#profile"><UserRound size={18} /><span>Profile</span></Link>
            </div>
          </div>
          <div className="team-total-score"><small>TOTAL SCORE</small><strong>{viewerPoints?.toLocaleString() ?? "0"}</strong><span>{state?.transferWindow.open ? "WINDOW OPEN" : "GAME WEEK LIVE"}</span></div>
        </div>
        <div className="team-metrics"><span><small>GAME WEEK PTS</small><strong>{viewerPoints?.toLocaleString() ?? "0"}</strong></span><span><small>STOCKS</small><strong>{team.picks.length}</strong></span><span><small>BANK</small><strong>{state?.bank ?? squadBank(team.picks)} CR</strong></span></div>
      </section>

      <nav className="team-tabs" aria-label="Team views">
        {(["squad", "transfers", "market"] as Tab[]).map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}
      </nav>
      {message && tab !== "transfers" && <p className="battle-data-error">{message}</p>}

      {tab === "squad" && <section className="squad-board">
        <div className="squad-board-heading"><div><p className="eyebrow">ACTIVE TEAM</p><h2>{team.picks.length} STOCKS ON THE FLOOR</h2></div><span>{squadBank(team.picks)} CR BANKED</span></div>
        <div className="squad-strips">{team.picks.map((pick, index) => {
          const stock = getStock(pick.ticker);
          return stock && <button type="button" className="squad-stock-row" key={pick.ticker} onClick={() => setProofTicker(pick.ticker)} aria-label={`Open ${stock.company} onchain details`} style={{ "--stock-tone": stock.tone } as React.CSSProperties}><span className="squad-number">0{index + 1}</span><span className="squad-logo"><StockLogo ticker={pick.ticker} /></span><span className="squad-company"><small>{stock.sector}</small><strong>{stock.company}</strong></span><span className="squad-price"><small>COST</small><strong>{pick.virtualAmount} CR</strong></span><ArrowRight className="squad-open" size={16} /></button>;
        })}</div>
      </section>}

      {tab === "transfers" && <section className="transfer-desk">
        <header><div><p className="eyebrow hazard">TRANSFERS</p><h2>SWAP OR ADD STOCKS</h2></div><div className={`transfer-budget ${bank < 0 ? "over" : ""}`}><small>BANK</small><strong>{bank} CR</strong><span>{bank < 0 ? "OVER BUDGET" : projectedPenalty ? `−${projectedPenalty} PTS` : "FREE MOVE AVAILABLE"}</span></div></header>
        {!state?.transferWindow.open && <div className="transfer-lock"><LockKeyhole size={20} /><div><strong>TEAM LOCKED</strong><p>The active Game Week must finish before this team can change.{state?.transferWindow.reopensAt ? ` Window reopens after ${new Date(state.transferWindow.reopensAt).toLocaleString()}.` : ""}</p></div></div>}
        <div className="transfer-columns">
          <section><header><strong>YOUR TEAM</strong><small>CLICK TO REMOVE</small></header><div className="transfer-list">{team.picks.map((pick) => { const stock = getStock(pick.ticker); if (!stock) return null; const kept = selected.includes(stock.ticker); const currentCost = market.find((item) => item.ticker === stock.ticker)?.draftCost ?? pick.virtualAmount; return <button key={stock.ticker} disabled={!state?.transferWindow.open} onClick={() => toggle(stock.ticker)} className={kept ? "selected" : "removed"} style={{ "--stock-tone": stock.logoColor } as React.CSSProperties}><span className="transfer-logo"><StockLogo ticker={stock.ticker} /></span><span><strong>{stock.company}</strong><small>{stock.ticker}</small></span><span><small>DRAFT COST</small><strong>{currentCost} CR</strong></span><span className="transfer-action">{kept ? "REMOVE" : "ADD BACK"}</span></button>; })}</div></section>
          <section><header><strong>MARKET</strong><small>CLICK TO ADD</small></header><div className="transfer-list">{STOCKS.filter((stock) => !team.picks.some((pick) => pick.ticker === stock.ticker)).map((stock) => { const quote = market.find((item) => item.ticker === stock.ticker); const chosen = selected.includes(stock.ticker); return <button key={stock.ticker} disabled={!state?.transferWindow.open || !quote || (!chosen && selected.length >= 5)} onClick={() => toggle(stock.ticker)} className={chosen ? "selected incoming" : ""} style={{ "--stock-tone": stock.logoColor } as React.CSSProperties}><span className="transfer-logo"><StockLogo ticker={stock.ticker} /></span><span><strong>{stock.company}</strong><small>{stock.ticker}</small></span><span><small>DRAFT COST</small><strong>{quote ? `${quote.draftCost} CR` : "HELD"}</strong></span><span className="transfer-action">{chosen ? "REMOVE" : "ADD"}</span></button>; })}</div></section>
        </div>
        <div className="transfer-save"><span><Shuffle size={17} /> {projectedTransfers} INCOMING · {selected.length}/5 STOCKS · FIRST MOVE FREE, THEN −25 PTS</span><button className="primary-action" disabled={!changed || saving || selected.length < 3 || bank < 0 || !state?.transferWindow.open} onClick={() => void saveTransfers()}>{saving ? "SAVING…" : "CONFIRM TRANSFERS"} <ArrowRight size={16} /></button></div>
        {message && <p className="battle-data-error">{message}</p>}
      </section>}

      {tab === "market" && <section className="market-ledger"><div className="squad-board-heading"><div><p className="eyebrow">ONCHAIN MARKET</p><h2>EVERY AVAILABLE STOCK</h2></div><span>PRICES REFRESH SERVER-SIDE</span></div><div>{STOCKS.map((stock) => {
        const quote = market.find((item) => item.ticker === stock.ticker);
        return <button type="button" className="market-stock-row" key={stock.ticker} onClick={() => setProofTicker(stock.ticker)} aria-label={`Open ${stock.company} onchain details`} style={{ "--stock-tone": stock.logoColor } as React.CSSProperties}><span className="transfer-logo"><StockLogo ticker={stock.ticker} /></span><span><strong>{stock.company}</strong><small>{stock.ticker}</small></span><strong>{quote ? `${quote.draftCost} CR` : "HELD"}</strong><small>{quote ? `$${quote.price.toFixed(2)} REFERENCE` : "WAITING FOR FEED"}</small><ArrowRight size={15} /></button>;
      })}</div></section>}
      <StockProofPanel ticker={proofTicker} savedCost={team.picks.find((pick) => pick.ticker === proofTicker)?.virtualAmount} marketQuote={market.find((quote) => quote.ticker === proofTicker)} onClose={() => setProofTicker(null)} />
    </div>
  );
}
