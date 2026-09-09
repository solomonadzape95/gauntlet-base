"use client";

import { BarChart3, Check, ChevronDown, ChevronUp, Copy, Plus, Shield, TimerReset, TrendingDown, TrendingUp, UserPlus, WalletCards, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { DitherAvatar } from "@/components/dither-avatar";
import { GauntletLoader } from "@/components/gauntlet-loader";
import { useGauntletAuth, type AvatarTone } from "@/components/gauntlet-auth";
import { savePracticeDraft, type DraftPick } from "@/lib/practice-game";
import { playerHeaders } from "@/lib/team-client";

type StockStat = { ticker: string; returnPercent: number };
type LeagueStats = { best: StockStat | null; worst: StockStat | null; mostPicked: { ticker: string; teams: number } | null };
type Member = { name: string; tone: AvatarTone; joinedAt: string; teamEntryId: string | null; points: number | null; quickPoints: number | null; quickRank: number | null; quickReturnPercent: number | null; quickLineup: DraftPick[] | null };
type League = { id: string; name: string; join_code: string; isOwner: boolean; quickRound: { status: "active" | "complete"; startsAt: string; endsAt: string; stats: LeagueStats | null } | null; members: Member[] };

function signedPoints(points: number | null) {
  if (points == null) return "— PTS";
  return `${points > 0 ? "+" : ""}${points.toLocaleString()} PTS`;
}

function signedPercent(value: number | null) {
  if (value == null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(4)}%`;
}

export function LeaguesPanel() {
  const router = useRouter();
  const { session } = useGauntletAuth();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [mode, setMode] = useState<"create" | "join">("create");
  const [value, setValue] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [quickLeagueReady, setQuickLeagueReady] = useState(true);
  const [expandedLeague, setExpandedLeague] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/leagues", { cache: "no-store", headers: playerHeaders(session) });
    const result = await response.json() as { leagues?: League[]; quickLeagueReady?: boolean; error?: string };
    if (!response.ok) throw new Error(result.error ?? "Could not load leagues.");
    setLeagues(result.leagues ?? []);
    setQuickLeagueReady(result.quickLeagueReady !== false);
    setLoading(false);
  }, [session]);

  const showLoadError = useCallback((cause: unknown) => {
    setMessage(cause instanceof Error ? cause.message : "Could not load leagues.");
  }, []);

  useEffect(() => {
    const first = window.setTimeout(() => void load().catch(showLoadError).finally(() => setLoading(false)), 0);
    const refresh = window.setInterval(() => void load().catch(showLoadError), 5_000);
    return () => { window.clearTimeout(first); window.clearInterval(refresh); };
  }, [load, showLoadError]);

  async function submit() {
    setWorking(true);
    setMessage(null);
    try {
      const response = await fetch("/api/leagues", { method: "POST", headers: { "content-type": "application/json", ...playerHeaders(session) }, body: JSON.stringify(mode === "create" ? { action: mode, name: value } : { action: mode, code: value }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not update leagues.");
      setValue("");
      await load();
    } catch (cause) { showLoadError(cause); } finally { setWorking(false); }
  }

  async function startQuickLeague(leagueId: string) {
    setWorking(true);
    setMessage(null);
    try {
      const response = await fetch("/api/leagues", { method: "POST", headers: { "content-type": "application/json", ...playerHeaders(session) }, body: JSON.stringify({ action: "start_sprint", leagueId }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not start the Quick League.");
      await load();
    } catch (cause) { showLoadError(cause); } finally { setWorking(false); }
  }

  async function copy(code: string) {
    await navigator.clipboard.writeText(code);
    setCopied(code);
    window.setTimeout(() => setCopied(null), 1200);
  }

  function ownDraft(lineup: DraftPick[]) {
    const draft = savePracticeDraft(lineup);
    router.push(`/draft?own=${encodeURIComponent(draft.id)}`);
  }

  return <div className="shell page-shell leagues-page">
    <header className="dashboard-titlebar"><div><p className="eyebrow hazard">PRIVATE COMPETITION</p><h1>Leagues</h1></div><span className="battle-mode">GAME WEEK TABLES</span></header>
    <section className="league-control dashboard-panel">
      <div className="league-control-tabs"><button className={mode === "create" ? "active" : ""} onClick={() => setMode("create")}><Plus size={15} /> CREATE</button><button className={mode === "join" ? "active" : ""} onClick={() => setMode("join")}><UserPlus size={15} /> JOIN</button></div>
      <div><p className="eyebrow">{mode === "create" ? "LEAGUE NAME" : "INVITE CODE"}</p><h2>{mode === "create" ? "MAKE A TABLE FOR YOUR PEOPLE." : "ENTER THEIR SIX-CHARACTER CODE."}</h2></div>
      <div className="league-input-row"><input maxLength={mode === "create" ? 32 : 6} value={value} onChange={(event) => setValue(mode === "join" ? event.target.value.toUpperCase() : event.target.value)} placeholder={mode === "create" ? "After Hours Club" : "A1B2C3"} /><button className="primary-action" disabled={working || value.trim().length < (mode === "create" ? 3 : 6)} onClick={() => void submit()}>{working ? "WORKING…" : mode === "create" ? "CREATE LEAGUE" : "JOIN LEAGUE"}</button></div>
      {!quickLeagueReady && <p className="battle-data-error">QUICK LEAGUE NEEDS MIGRATION 010.</p>}
      {message && <p className="battle-data-error">{message}</p>}
    </section>
    <div className="league-grid">{leagues.map((league) => {
      const quick = league.quickRound;
      const members = [...league.members].sort((left, right) => quick ? (left.quickRank ?? 999) - (right.quickRank ?? 999) : (right.points ?? -1) - (left.points ?? -1));
      return <section className={`league-card dashboard-panel ${expandedLeague === league.id ? "expanded" : ""}`} key={league.id}>
        <header><span className="league-shield"><Shield size={24} /></span><div><p className="eyebrow">YOUR LEAGUE</p><h2>{league.name}</h2></div><button onClick={() => void copy(league.join_code)}>{copied === league.join_code ? <Check size={14} /> : <Copy size={14} />}{league.join_code}</button></header>
        <div className={`league-sprint ${quick?.status ?? "ready"}`}><span><Zap size={16} /><b>QUICK LEAGUE</b><small>{quick ? quick.status === "active" ? `LIVE · ENDS ${new Date(quick.endsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "FINAL · TWO-MINUTE TABLE" : "REAL FEEDS · TWO MINUTES"}</small></span>{league.isOwner && quick?.status !== "active" && <button disabled={working || !quickLeagueReady} onClick={() => void startQuickLeague(league.id)}><TimerReset size={15} /> {quick ? "RUN AGAIN" : "START 2 MIN"}</button>}</div>
        <div className="league-members">{members.map((member, index) => { const shownPoints = quick ? member.quickPoints : member.points; const shownRank = quick ? member.quickRank ?? index + 1 : index + 1; return <div key={`${member.name}:${member.joinedAt}`}><strong>{String(shownRank).padStart(2, "0")}</strong><DitherAvatar seed={member.name} tone={member.tone} size={34} /><span>{member.teamEntryId ? <Link href={`/team/${member.teamEntryId}`}><b>{member.name}</b></Link> : <b>{member.name}</b>}<small>{quick ? quick.status === "active" ? "QUICK LEAGUE LIVE" : "QUICK LEAGUE FINAL" : shownPoints != null && index === 0 ? "LEAGUE LEADER" : "MEMBER"}</small></span><em>{quick ? signedPoints(shownPoints) : shownPoints == null ? "— PTS" : `${shownPoints.toLocaleString()} PTS`}</em></div>; })}</div>
        <button className="league-view-toggle" onClick={() => setExpandedLeague((current) => current === league.id ? null : league.id)}>{expandedLeague === league.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />} {expandedLeague === league.id ? "CLOSE LEAGUE" : "VIEW LEAGUE"}</button>
        {expandedLeague === league.id && <div className="league-inside">
          {quick?.stats && <div className="league-stat-grid">
            <article><TrendingUp size={17} /><small>BEST STOCK</small><strong>{quick.stats.best?.ticker ?? "—"}</strong><span>{signedPercent(quick.stats.best?.returnPercent ?? null)}</span></article>
            <article><TrendingDown size={17} /><small>WORST STOCK</small><strong>{quick.stats.worst?.ticker ?? "—"}</strong><span>{signedPercent(quick.stats.worst?.returnPercent ?? null)}</span></article>
            <article><BarChart3 size={17} /><small>MOST PICKED</small><strong>{quick.stats.mostPicked?.ticker ?? "—"}</strong><span>{quick.stats.mostPicked ? `${quick.stats.mostPicked.teams} TEAMS` : "—"}</span></article>
          </div>}
          <div className="league-lineups">{members.map((member) => <article key={`lineup:${member.name}:${member.joinedAt}`}>
            <DitherAvatar seed={member.name} tone={member.tone} size={38} />
            <span><strong>{member.name}</strong><small>{member.quickLineup?.map((pick) => pick.ticker).join(" · ") || "NO SNAPSHOT YET"}</small></span>
            <em>{signedPercent(member.quickReturnPercent)}</em>
            {quick?.status === "complete" && member.quickLineup && <button onClick={() => ownDraft(member.quickLineup!)}><WalletCards size={14} /> OWN DRAFT</button>}
          </article>)}</div>
        </div>}
      </section>;
    })}</div>
    {loading ? <GauntletLoader label="LOADING LEAGUES" /> : !leagues.length && <div className="league-empty"><Shield size={34} /><p>Create a league and share its code, or join one from a friend.</p></div>}
  </div>;
}
