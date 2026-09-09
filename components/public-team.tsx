"use client";

import { ArrowLeft, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { DitherAvatar } from "@/components/dither-avatar";
import { GauntletLoader } from "@/components/gauntlet-loader";
import type { AvatarTone } from "@/components/gauntlet-auth";
import { PerformanceSparkline } from "@/components/performance-sparkline";
import { StockLogo } from "@/components/stock-logo";
import { squadBank } from "@/lib/fantasy-market";
import { getStock } from "@/lib/stocks";

type Entry = { id: string; name: string; tone: AvatarTone; lineup: { ticker: string; virtualAmount: number }[]; points: number | null; returnPercent: number | null; history: { capturedAt: string; points: number; returnPercent: number }[]; transferPenaltyPoints: number; joinedAt: string; week: { label: string; status: string } };

export function PublicTeam({ entryId }: { entryId: string }) {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { fetch(`/api/teams/${encodeURIComponent(entryId)}`, { cache: "no-store" }).then(async (response) => { const result = await response.json() as { entry?: Entry; error?: string }; if (!response.ok || !result.entry) throw new Error(result.error ?? "Could not load this team."); setEntry(result.entry); }).catch((cause) => setError(cause instanceof Error ? cause.message : "Could not load this team.")); }, [entryId]);
  if (error) return <div className="shell page-shell"><section className="battle-lobby dashboard-panel"><div><p className="eyebrow hazard">TEAM UNAVAILABLE</p><strong>{error}</strong></div><Link className="primary-action" href="/leaderboard">BACK TO RANKS</Link></section></div>;
  if (!entry) return <div className="shell page-shell"><GauntletLoader label="LOADING TEAM" /></div>;
  return <div className="shell page-shell public-team-page"><Link className="dashboard-text-link" href="/leaderboard"><ArrowLeft size={14} /> BACK TO RANKS</Link><section className="team-identity-hero public"><div className="team-identity-copy"><p className="eyebrow hazard">{entry.week.label} · {entry.week.status}</p><div className="team-name-lockup"><DitherAvatar seed={entry.name} tone={entry.tone} size={82} /><div><span>TEAM</span><h1>{entry.name}</h1></div></div></div><div className="team-metrics"><span><small>POINTS</small><strong>{entry.points?.toLocaleString() ?? "LIVE"}</strong></span><span><small>RETURN</small><strong>{entry.returnPercent == null ? "—" : `${entry.returnPercent >= 0 ? "+" : ""}${entry.returnPercent.toFixed(2)}%`}</strong></span><span><small>BANK</small><strong>{squadBank(entry.lineup)} CR</strong></span></div><div className="team-performance"><small>RECORDED PERFORMANCE</small><PerformanceSparkline history={entry.history} label={`${entry.name} score`} /></div></section><section className="squad-board"><div className="squad-board-heading"><div><p className="eyebrow">GAME WEEK SNAPSHOT</p><h2>THE LOCKED LINEUP</h2></div>{entry.transferPenaltyPoints ? <span>−{entry.transferPenaltyPoints} TRANSFER PTS</span> : <span><Trophy size={14} /> CLEAN SHEET</span>}</div><div className="squad-strips">{entry.lineup.map((pick, index) => { const stock = getStock(pick.ticker); return stock && <article key={pick.ticker} style={{ "--stock-tone": stock.tone } as React.CSSProperties}><span className="squad-number">0{index + 1}</span><span className="squad-logo"><StockLogo ticker={pick.ticker} /></span><span className="squad-company"><small>{stock.sector}</small><strong>{stock.company}</strong></span><span className="squad-price"><small>DRAFT COST</small><strong>{pick.virtualAmount} CR</strong></span></article>; })}</div></section></div>;
}
