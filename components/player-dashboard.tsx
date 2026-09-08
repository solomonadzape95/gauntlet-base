"use client";

import Link from "next/link";
import { ArrowRight, CircleDot, Clock3, LockKeyhole, Swords, Trophy } from "lucide-react";
import { useAccount } from "wagmi";

import { StockLogo } from "@/components/stock-logo";
import { WalletButton } from "@/components/wallet-button";
import { MARKET_QUOTES, scoreDraft } from "@/lib/practice-game";
import { getStock } from "@/lib/stocks";
import { usePracticeDrafts } from "@/lib/use-practice-drafts";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function PlayerDashboard() {
  const { isConnected, status } = useAccount();
  const drafts = usePracticeDrafts();

  const latest = drafts[0];
  const score = latest ? scoreDraft(latest) : 0;

  if (status === "reconnecting") {
    return (
      <div className="dashboard-shell shell page-shell">
        <section className="dashboard-gate dashboard-panel">
          <span className="gate-icon"><LockKeyhole size={30} /></span>
          <p className="eyebrow hazard">PLAYER DESK · WALLET ACCESS</p>
          <h1>Restoring your wallet session…</h1>
        </section>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="dashboard-shell shell page-shell">
        <section className="dashboard-gate dashboard-panel">
          <span className="gate-icon"><LockKeyhole size={30} /></span>
          <p className="eyebrow hazard">PLAYER DESK · WALLET ACCESS</p>
          <h1>Connect to enter your desk.</h1>
          <p>Connect a wallet to open the dashboard. You can still draft and play practice battles without one.</p>
          <div className="gate-actions">
            <WalletButton />
            <Link className="secondary-action" href="/draft">PLAY WITHOUT A WALLET</Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="dashboard-shell shell page-shell">
      <header className="dashboard-titlebar">
        <div><p className="eyebrow hazard">PLAYER DESK · PRACTICE MODE</p><h1>Your market room</h1></div>
        <Link className="primary-action" href="/draft">NEW DRAFT <ArrowRight size={16} /></Link>
      </header>

      <section className="dashboard-metrics">
        <Metric label="VIRTUAL BALANCE" value={latest ? "$100,000" : "—"} note="No deposit required" />
        <Metric label="PRACTICE RETURN" value={latest ? `${score >= 0 ? "+" : ""}${score.toFixed(2)}%` : "—"} note="Simulated market feed" signal />
        <Metric label="DRAFTS" value={String(drafts.length)} note="Saved on this device" />
        <Metric label="BATTLE RECORD" value={latest ? "0–0" : "—"} note="Start your first match" />
      </section>

      {latest ? (
        <div className="dashboard-grid">
          <section className="dashboard-panel portfolio-card">
            <div className="panel-heading"><div><p className="eyebrow">CURRENT LINEUP</p><h2>Virtual portfolio</h2></div><span className="status-chip"><span /> LIVE</span></div>
            <div className="dashboard-holdings">
              {latest.picks.map((pick) => {
                const stock = getStock(pick.ticker);
                const quote = MARKET_QUOTES.find((item) => item.ticker === pick.ticker);
                if (!stock || !quote) return null;
                return (
                  <div key={pick.ticker}>
                    <span className={`holding-logo ${pick.ticker === "SNDKc" ? "wide-logo" : ""}`} style={{ color: stock.logoColor }}><StockLogo ticker={pick.ticker} /></span>
                    <span><strong>{stock.company}</strong><small>{pick.ticker} · {money.format(pick.virtualAmount)}</small></span>
                    <strong className={quote.change >= 0 ? "up" : "down"}>{quote.change >= 0 ? "+" : ""}{quote.change.toFixed(2)}%</strong>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="dashboard-panel battle-launcher">
            <p className="eyebrow">NEXT MOVE</p>
            <Swords size={34} />
            <h2>Put the draft to work.</h2>
            <p>Enter a free practice battle. Your score follows percentage performance, not how much money you own.</p>
            <Link className="primary-action full" href="/battle/demo">START PRACTICE BATTLE <ArrowRight size={16} /></Link>
            <Link className="dashboard-text-link" href="/draft">OR BUILD ANOTHER LINEUP</Link>
          </section>

          <section className="dashboard-panel activity-card">
            <div className="panel-heading"><div><p className="eyebrow">ACTIVITY</p><h2>Game log</h2></div><Clock3 size={18} /></div>
            <div className="activity-row"><CircleDot size={14} /><span><strong>DRAFT SAVED</strong><small>{new Date(latest.createdAt).toLocaleString()}</small></span><span>VIRTUAL</span></div>
            <div className="activity-row muted"><Trophy size={14} /><span><strong>FIRST BATTLE</strong><small>Ready when you are</small></span><span>OPEN</span></div>
          </section>
        </div>
      ) : (
        <section className="dashboard-empty dashboard-panel">
          <Swords size={36} />
          <h2>Your desk is waiting.</h2>
          <p>Create a free virtual lineup. A wallet and real money are never required to play.</p>
          <Link className="primary-action" href="/draft">BUILD YOUR FIRST DRAFT <ArrowRight size={16} /></Link>
        </section>
      )}
    </div>
  );
}

function Metric({ label, value, note, signal = false }: { label: string; value: string; note: string; signal?: boolean }) {
  return <article><span className="eyebrow">{label}</span><strong className={signal ? "signal" : ""}>{value}</strong><p>{note}</p></article>;
}
