"use client";

import { ArrowRight, Shield, Swords, Trophy } from "lucide-react";
import Link from "next/link";
import { useAccount } from "wagmi";

import { GauntletLoader } from "@/components/gauntlet-loader";
import { ProfilePanel } from "@/components/profile-panel";
import { StockLogo } from "@/components/stock-logo";
import { WalletButton } from "@/components/wallet-button";
import { getStock } from "@/lib/stocks";
import { useActiveTeam } from "@/lib/use-active-team";

export function PlayerDashboard() {
  const { isConnected, status } = useAccount();
  const { team, loading } = useActiveTeam();

  if (status === "reconnecting") return <div className="dashboard-shell shell page-shell"><GauntletLoader label="RESTORING PLAYER" /></div>;

  if (!isConnected) {
    return <div className="dashboard-shell shell page-shell"><section className="dashboard-gate dashboard-panel"><p className="eyebrow hazard">PLAYER</p><h1>Your team, name and wallet.</h1><p>Connect to manage your player. You can still draft and play for free without connecting.</p><div className="gate-actions"><WalletButton /><Link className="secondary-action" href="/draft">PLAY WITHOUT A WALLET</Link></div></section></div>;
  }

  if (loading) return <div className="dashboard-shell shell page-shell"><GauntletLoader label="LOADING PLAYER" /></div>;

  return <div className="dashboard-shell shell page-shell player-hub">
    <header className="dashboard-titlebar"><div><p className="eyebrow hazard">PLAYER</p><h1>Your hub</h1></div><Link className="primary-action" href="/draft">MANAGE TEAM <ArrowRight size={16} /></Link></header>

    <section className="dashboard-panel player-team-card">
      <div className="panel-heading"><div><p className="eyebrow">YOUR TEAM</p><h2>{team ? `${team.picks.length} STOCKS` : "NO TEAM YET"}</h2></div>{!team && <Link className="primary-action" href="/draft">DRAFT NOW <ArrowRight size={16} /></Link>}</div>
      {team && <div className="dashboard-holdings">{team.picks.map((pick) => { const stock = getStock(pick.ticker); if (!stock) return null; return <div key={pick.ticker}><span className="holding-logo" style={{ color: stock.logoColor }}><StockLogo ticker={pick.ticker} /></span><span><strong>{stock.company}</strong><small>{pick.ticker}</small></span><strong>{pick.virtualAmount} CR</strong></div>; })}</div>}
      <div className="player-quick-actions"><Link href="/battle"><Swords size={18} /><span><strong>BATTLE</strong><small>Challenge a friend</small></span></Link><Link href="/leaderboard"><Trophy size={18} /><span><strong>GAME WEEK</strong><small>See your points</small></span></Link><Link href="/leagues"><Shield size={18} /><span><strong>LEAGUES</strong><small>Play with a group</small></span></Link></div>
    </section>

    <ProfilePanel embedded />
  </div>;
}
