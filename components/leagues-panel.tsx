"use client";

import { Check, Copy, Plus, Shield, UserPlus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { DitherAvatar } from "@/components/dither-avatar";
import { useGauntletAuth, type AvatarTone } from "@/components/gauntlet-auth";
import { playerHeaders } from "@/lib/team-client";

type League = { id: string; name: string; join_code: string; members: { name: string; tone: AvatarTone; joinedAt: string; teamEntryId: string | null; points: number | null }[] };

export function LeaguesPanel() {
  const { session } = useGauntletAuth();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [mode, setMode] = useState<"create" | "join">("create");
  const [value, setValue] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/leagues", { cache: "no-store", headers: playerHeaders(session) });
    const result = await response.json() as { leagues?: League[]; error?: string };
    if (!response.ok) throw new Error(result.error ?? "Could not load leagues.");
    setLeagues(result.leagues ?? []);
  }, [session]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load().catch((cause) => setMessage(cause instanceof Error ? cause.message : "Could not load leagues.")), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function submit() {
    setWorking(true);
    setMessage(null);
    try {
      const response = await fetch("/api/leagues", { method: "POST", headers: { "content-type": "application/json", ...playerHeaders(session) }, body: JSON.stringify(mode === "create" ? { action: mode, name: value } : { action: mode, code: value }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not update leagues.");
      setValue("");
      await load();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Could not update leagues.");
    } finally {
      setWorking(false);
    }
  }

  async function copy(code: string) {
    await navigator.clipboard.writeText(code);
    setCopied(code);
    window.setTimeout(() => setCopied(null), 1200);
  }

  return <div className="shell page-shell leagues-page">
    <header className="dashboard-titlebar"><div><p className="eyebrow hazard">PRIVATE COMPETITION</p><h1>Leagues</h1></div><span className="battle-mode">GAME WEEK TABLES</span></header>
    <section className="league-control dashboard-panel">
      <div className="league-control-tabs"><button className={mode === "create" ? "active" : ""} onClick={() => setMode("create")}><Plus size={15} /> CREATE</button><button className={mode === "join" ? "active" : ""} onClick={() => setMode("join")}><UserPlus size={15} /> JOIN</button></div>
      <div><p className="eyebrow">{mode === "create" ? "LEAGUE NAME" : "INVITE CODE"}</p><h2>{mode === "create" ? "MAKE A TABLE FOR YOUR PEOPLE." : "ENTER THEIR SIX-CHARACTER CODE."}</h2></div>
      <div className="league-input-row"><input maxLength={mode === "create" ? 32 : 6} value={value} onChange={(event) => setValue(mode === "join" ? event.target.value.toUpperCase() : event.target.value)} placeholder={mode === "create" ? "After Hours Club" : "A1B2C3"} /><button className="primary-action" disabled={working || value.trim().length < (mode === "create" ? 3 : 6)} onClick={() => void submit()}>{working ? "WORKING…" : mode === "create" ? "CREATE LEAGUE" : "JOIN LEAGUE"}</button></div>
      {message && <p className="battle-data-error">{message}</p>}
    </section>
    <div className="league-grid">{leagues.map((league) => <section className="league-card dashboard-panel" key={league.id}><header><span className="league-shield"><Shield size={24} /></span><div><p className="eyebrow">YOUR LEAGUE</p><h2>{league.name}</h2></div><button onClick={() => void copy(league.join_code)}>{copied === league.join_code ? <Check size={14} /> : <Copy size={14} />}{league.join_code}</button></header><div className="league-members">{[...league.members].sort((a, b) => (b.points ?? -1) - (a.points ?? -1)).map((member, index) => <div key={`${member.name}:${member.joinedAt}`}><strong>{String(index + 1).padStart(2, "0")}</strong><DitherAvatar seed={`${league.id}:${member.name}`} tone={member.tone} size={34} /><span>{member.teamEntryId ? <Link href={`/team/${member.teamEntryId}`}><b>{member.name}</b></Link> : <b>{member.name}</b>}<small>{member.points != null && index === 0 ? "LEAGUE LEADER" : "MEMBER"}</small></span><em>{member.points == null ? "— PTS" : `${member.points.toLocaleString()} PTS`}</em></div>)}</div></section>)}</div>
    {!leagues.length && <div className="league-empty"><Shield size={34} /><p>Your leagues will live here. Create one and share its code, or join one from a friend.</p></div>}
  </div>;
}
