"use client";

import { ArrowRight, Shield, Swords, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

import { GauntletLoader } from "@/components/gauntlet-loader";
import { ProfilePanel } from "@/components/profile-panel";
import { StockProofPanel } from "@/components/stock-proof-panel";
import { StockLogo } from "@/components/stock-logo";
import { WalletButton } from "@/components/wallet-button";
import { createDraftMarket, type DraftMarketStock } from "@/lib/fantasy-market";
import { getStock } from "@/lib/stocks";
import { useActiveTeam } from "@/lib/use-active-team";
import { formatVirtualMoney } from "@/lib/virtual-money";

export function PlayerDashboard() {
  const { isConnected, status } = useAccount();
  const { team, loading } = useActiveTeam();
  const [market, setMarket] = useState<DraftMarketStock[]>([]);
  const [proofTicker, setProofTicker] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/market", { cache: "no-store" }).then(async (response) => {
      const result = await response.json() as { prices?: Parameters<typeof createDraftMarket>[0] };
      if (!response.ok || !result.prices) return;
      if (!cancelled) setMarket(createDraftMarket(result.prices));
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  if (status === "reconnecting") return <div className="dashboard-shell shell page-shell"><GauntletLoader label="RESTORING PLAYER" /></div>;

  if (!isConnected) {
    return <div className="dashboard-shell shell page-shell"><section className="dashboard-gate dashboard-panel"><p className="eyebrow hazard">PLAYER</p><h1>Your team, name and wallet.</h1><p>Connect your wallet to manage your player and draft a team.</p><div className="gate-actions"><WalletButton /></div></section></div>;
  }

  if (loading) return <div className="dashboard-shell shell page-shell"><GauntletLoader label="LOADING PLAYER" /></div>;

  return <div className="dashboard-shell shell page-shell player-hub">
    <header className="dashboard-titlebar"><div><p className="eyebrow hazard">PLAYER</p><h1>Your hub</h1></div><Link className="primary-action" href="/draft">MANAGE TEAM <ArrowRight size={16} /></Link></header>

    <section className="dashboard-panel player-team-card">
      <div className="panel-heading"><div><p className="eyebrow">YOUR TEAM</p><h2>{team ? `${team.picks.length} STOCKS` : "NO TEAM YET"}</h2></div>{!team && <Link className="primary-action" href="/draft">DRAFT NOW <ArrowRight size={16} /></Link>}</div>
      {team && <div className="dashboard-holdings">{team.picks.map((pick) => { const stock = getStock(pick.ticker); if (!stock) return null; const currentQuote = market.find((item) => item.ticker === pick.ticker); return <button type="button" key={pick.ticker} onClick={() => setProofTicker(pick.ticker)} aria-label={`Open ${stock.company} onchain details`}><span className="holding-logo" style={{ color: stock.logoColor }}><StockLogo ticker={pick.ticker} /></span><span><strong>{stock.company}</strong><small>{pick.ticker}</small></span><strong>{currentQuote ? formatVirtualMoney(currentQuote.draftCost) : "HELD"}</strong><ArrowRight size={14} /></button>; })}</div>}
      <div className="player-quick-actions"><Link href="/battle"><Swords size={18} /><span><strong>BATTLE</strong><small>Challenge a friend</small></span></Link><Link href="/leaderboard"><Trophy size={18} /><span><strong>GAME WEEK</strong><small>See your points</small></span></Link><Link href="/leagues"><Shield size={18} /><span><strong>LEAGUES</strong><small>Play with a group</small></span></Link></div>
    </section>

    <ProfilePanel embedded />
    <StockProofPanel ticker={proofTicker} savedCost={team?.picks.find((pick) => pick.ticker === proofTicker)?.virtualAmount} marketQuote={market.find((quote) => quote.ticker === proofTicker)} onClose={() => setProofTicker(null)} />
  </div>;
}
