"use client";

import { ArrowRight, Clock3, Trophy } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useGauntletAuth } from "@/components/gauntlet-auth";
import { playerHeaders } from "@/lib/team-client";
import { useActiveTeam } from "@/lib/use-active-team";

type Week = { id: string; label: string; status: "upcoming" | "active" | "complete"; entry_lock_at: string; starts_at: string; ends_at: string };
type Entry = { id: string; rank: number | null; name: string; picks: string[]; returnPercent: number | null; points: number | null; transferPenaltyPoints: number };

export function Leaderboard() {
  const { session } = useGauntletAuth();
  const { team } = useActiveTeam();
  const [week, setWeek] = useState<Week | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [joined, setJoined] = useState(false);
  const [marketDataStatus, setMarketDataStatus] = useState<"pending" | "live" | "held" | "final">("pending");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/leaderboard", { cache: "no-store", headers: playerHeaders(session) });
      const result = await response.json() as { week?: Week | null; entries?: Entry[]; viewerJoined?: boolean; marketDataStatus?: "pending" | "live" | "held" | "final"; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not load the leaderboard.");
      setWeek(result.week ?? null);
      setEntries(result.entries ?? []);
      setJoined(Boolean(result.viewerJoined));
      setMarketDataStatus(result.marketDataStatus ?? "pending");
      setMessage(null);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Could not load the leaderboard.");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    const refresh = week?.status === "active" ? window.setInterval(() => void load(), 60_000) : null;
    return () => {
      window.clearTimeout(timer);
      if (refresh) window.clearInterval(refresh);
    };
  }, [load, week?.status]);

  async function enterWeek() {
    const response = await fetch("/api/leaderboard", { method: "POST", headers: playerHeaders(session) });
    const result = await response.json() as { error?: string };
    if (!response.ok) {
      setMessage(result.error ?? "Could not enter the game week.");
      return;
    }
    await load();
  }

  const deadline = week ? (week.status === "upcoming" ? week.starts_at : week.ends_at) : null;

  return (
    <div className="shell page-shell leaderboard-page">
      <header className="dashboard-titlebar">
        <div><p className="eyebrow hazard">WEEKLY COMPETITION</p><h1>The leaderboard</h1></div>
        <span className="battle-mode">1,000 BASE POINTS</span>
      </header>

      <section className="leaderboard-hero dashboard-panel">
        <div><p className="eyebrow">{week?.label ?? "NEXT GAME WEEK"}</p><h2>{week?.status === "active" ? "THE MARKET IS LIVE" : week?.status === "complete" ? "WEEK COMPLETE" : "ENTRIES ARE OPEN"}</h2><p>One team snapshot. One market week. Every basis point of weighted portfolio return adds or removes one point from the 1,000-point baseline.</p></div>
        <div className="week-clock"><Clock3 size={18} /><span>{deadline ? `${week?.status === "upcoming" ? "LOCKS" : "ENDS"} ${new Date(deadline).toLocaleString()}` : "SCHEDULE PENDING"}</span></div>
        {week?.status === "upcoming" && !joined && (team ? <button className="primary-action" onClick={() => void enterWeek()}>ENTER ACTIVE TEAM <ArrowRight size={16} /></button> : <Link className="primary-action" href="/draft?returnTo=%2Fleaderboard">DRAFT A TEAM <ArrowRight size={16} /></Link>)}
        {joined && <span className="status-chip"><span /> TEAM LOCKED FOR THIS WEEK</span>}
      </section>

      {message && <p className="battle-data-error">{message}</p>}
      <section className="leaderboard-table dashboard-panel">
        <div className="leaderboard-row heading"><span>RANK</span><span>PLAYER / TEAM</span><span>RETURN</span><span>POINTS</span></div>
        {loading ? <p className="leaderboard-empty">LOADING GAME WEEK…</p> : entries.length ? entries.map((entry) => (
          <article className="leaderboard-row" key={entry.id}>
            <strong className="leaderboard-rank">{entry.rank ? String(entry.rank).padStart(2, "0") : "—"}</strong>
            <span><Link className="leaderboard-team-link" href={`/team/${entry.id}`}><strong>{entry.name}</strong><small>{entry.picks.join(" · ")}{entry.transferPenaltyPoints ? ` · −${entry.transferPenaltyPoints} TRANSFER PTS` : ""}</small></Link></span>
            <strong className={entry.returnPercent != null && entry.returnPercent >= 0 ? "up" : "down"}>{entry.returnPercent == null ? "—" : `${entry.returnPercent >= 0 ? "+" : ""}${entry.returnPercent.toFixed(2)}%`}</strong>
            <strong className="leaderboard-points">{entry.points == null ? "—" : entry.points.toLocaleString()}</strong>
          </article>
        )) : <div className="leaderboard-empty"><Trophy size={28} /><p>No teams entered yet. The first clean score belongs to whoever steps in first.</p></div>}
      </section>
      {marketDataStatus === "held" && <p className="data-notice">LIVE RANKING HELD · Waiting for fresh Chainlink prices. The app will not display a manufactured tie.</p>}
    </div>
  );
}
