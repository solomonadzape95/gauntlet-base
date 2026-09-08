"use client";

import { ArrowRight, Clock3, Swords, Target } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useGauntletAuth } from "@/components/gauntlet-auth";
import type { BattleRecord } from "@/lib/battle-record";
import { playerHeaders } from "@/lib/team-client";
import { useActiveTeam } from "@/lib/use-active-team";

export function BattleHub() {
  const router = useRouter();
  const { session } = useGauntletAuth();
  const { team, loading, error: teamError } = useActiveTeam();
  const [duration, setDuration] = useState<60 | 1440>(1440);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createChallenge() {
    if (!team) return;
    setCreating(true);
    setError(null);
    try {
      const response = await fetch("/api/challenges", {
        method: "POST",
        headers: { "content-type": "application/json", ...playerHeaders(session) },
        body: JSON.stringify({ durationMinutes: duration }),
      });
      const result = await response.json() as { battle?: BattleRecord; error?: string };
      if (!response.ok || !result.battle) throw new Error(result.error ?? "Could not create the challenge.");
      router.push(`/battle/demo?battle=${encodeURIComponent(result.battle.id)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create the challenge.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="shell page-shell battle-page">
      <header className="dashboard-titlebar battle-titlebar">
        <div><p className="eyebrow hazard">BATTLE DESK</p><h1>Choose the match</h1></div>
        <span className="battle-mode">YOUR TEAM · YOUR CALL</span>
      </header>

      <section className="battle-choice-grid">
        <article className="dashboard-panel battle-choice-card">
          <Swords size={34} />
          <p className="eyebrow">SOLO · 24 HOURS</p>
          <h2>Practice battle</h2>
          <p>Run your active team against Nova. It stays local, carries no public record, and never becomes a friend challenge by accident.</p>
          <Link className="secondary-action" href="/battle/demo?mode=practice&new=1">START PRACTICE <ArrowRight size={16} /></Link>
        </article>

        <article className="dashboard-panel battle-choice-card featured">
          <Target size={34} />
          <p className="eyebrow hazard">HEAD TO HEAD</p>
          <h2>Create challenge</h2>
          <p>Freeze your active team, choose the scoring window, and send one durable link to another player.</p>
          <div className="duration-picker" aria-label="Challenge duration">
            <button className={duration === 60 ? "active" : ""} onClick={() => setDuration(60)}><Clock3 size={14} /> 1 HOUR</button>
            <button className={duration === 1440 ? "active" : ""} onClick={() => setDuration(1440)}><Clock3 size={14} /> 24 HOURS</button>
          </div>
          {loading ? <p className="battle-data-error">LOADING YOUR TEAM…</p> : team ? <p className="team-ready">TEAM READY · {team.picks.map((pick) => pick.ticker).join(" · ")}</p> : <Link className="secondary-action" href="/draft?returnTo=%2Fbattle">DRAFT YOUR TEAM</Link>}
          {teamError && <p className="battle-data-error">{teamError}</p>}
          {error && <p className="battle-data-error">{error}</p>}
          <button className="primary-action" disabled={!team || loading || creating} onClick={() => void createChallenge()}>{creating ? "CREATING…" : "CREATE CHALLENGE"} <ArrowRight size={16} /></button>
        </article>
      </section>
    </div>
  );
}
