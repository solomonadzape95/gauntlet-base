"use client";

import Link from "next/link";
import { ArrowRight, Clock3, Radio, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

import { defaultPracticeDraft, MARKET_QUOTES, scoreDraft } from "@/lib/practice-game";
import { usePracticeDrafts } from "@/lib/use-practice-drafts";

const rival = defaultPracticeDraft();
const rivalPicks = ["MSFTc", "GOOGLc", "AMZNc"];
rival.picks = rival.picks.map((pick, index) => ({ ...pick, ticker: rivalPicks[index] }));

export default function DemoBattlePage() {
  const drafts = usePracticeDrafts();
  const draft = drafts[0] ?? null;
  const [started, setStarted] = useState(false);
  const [remaining, setRemaining] = useState(24 * 60 * 60);

  useEffect(() => {
    if (!started) return;
    const timer = window.setInterval(() => setRemaining((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [started]);

  const player = draft ?? defaultPracticeDraft();
  const playerScore = scoreDraft(player);
  const rivalScore = scoreDraft(rival);
  const leading = playerScore >= rivalScore;
  const holdings = player.picks.map((pick) => {
    const quote = MARKET_QUOTES.find((item) => item.ticker === pick.ticker);
    return [pick.ticker, quote?.change ?? 0] as const;
  });

  return (
    <div className="shell page-shell battle-page">
      <header className="dashboard-titlebar battle-titlebar">
        <div><p className="eyebrow hazard">PRACTICE BATTLE · MATCH 0007</p><h1>Head to head</h1></div>
        <span className="battle-mode">NO MONEY AT RISK</span>
      </header>

      {!draft && (
        <div className="practice-notice"><p>You are viewing the demo lineup. Build and save a draft to battle with your own picks.</p><Link href="/draft">BUILD A FREE DRAFT <ArrowRight size={14} /></Link></div>
      )}

      {!started ? (
        <section className="battle-lobby dashboard-panel">
          <div><p className="eyebrow">YOUR LINEUP IS READY</p><strong>{player.picks.map((pick) => pick.ticker).join(" · ")}</strong><p>The clock starts when you enter. Scores use virtual allocations and sample market movement for this test build.</p></div>
          <button className="primary-action" onClick={() => setStarted(true)}>ENTER PRACTICE BATTLE <ArrowRight size={16} /></button>
        </section>
      ) : (
        <>
          <div className="battle-status"><span><Radio size={14} /> LIVE PRACTICE</span><span><Clock3 size={14} /> {formatDuration(remaining)} REMAINING</span></div>
          <section className="versus-grid">
            <Competitor name="YOU" score={playerScore} rank={leading ? "01" : "02"} stocks={holdings} leading={leading} />
            <div className="versus-mark">VS</div>
            <Competitor name="NOVA" score={rivalScore} rank={leading ? "02" : "01"} stocks={rival.picks.map((pick) => {
              const quote = MARKET_QUOTES.find((item) => item.ticker === pick.ticker);
              return [pick.ticker, quote?.change ?? 0] as const;
            })} leading={!leading} />
          </section>
          <section className="battle-proof"><ShieldCheck size={20} /><div><strong>FREE PRACTICE MODE</strong><p>This battle uses virtual funds. Owning stocks is optional and never changes the score.</p></div></section>
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
