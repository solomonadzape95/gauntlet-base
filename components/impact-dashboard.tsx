"use client";

import { ExternalLink, RadioTower } from "lucide-react";
import { useEffect, useState } from "react";

import { EMPTY_IMPACT, type ImpactSnapshot } from "@/lib/impact";

export function ImpactDashboard() {
  const [snapshot, setSnapshot] = useState<ImpactSnapshot>(EMPTY_IMPACT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/impact", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as ImpactSnapshot;
        if (!cancelled) setSnapshot(result);
      })
      .catch(() => { /* The explicit offline state remains visible. */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const metrics = [
    ["NEW B20 WALLETS", snapshot.newB20Wallets, "Distinct wallets with a verified owned draft"],
    ["CONFIRMED PURCHASES", snapshot.confirmedPurchases, "Only balance-verified transactions count"],
    ["OWNED DRAFTS", snapshot.ownedDrafts, "Every selected balance verified"],
    ["OWNED BATTLES", snapshot.ownedBattles, "Both players verified"],
  ] as const;

  return (
    <div className="shell page-shell impact-page">
      <header className="dashboard-titlebar">
        <div><p className="eyebrow hazard">PUBLIC PROOF · BASE MAINNET</p><h1>Verified impact</h1></div>
        <p className="heading-aside">This dashboard counts confirmed B20 activity attributed to Gauntlet. Empty numbers remain empty until real transactions exist.</p>
      </header>
      <div className="data-notice"><RadioTower size={17} /><p><strong>{loading ? "CHECKING INDEX" : snapshot.healthy ? "INDEX ONLINE" : snapshot.configured ? "INDEX UNHEALTHY" : "SERVER INDEX OFFLINE"}</strong>{snapshot.healthy ? ` Last confirmed activity: ${snapshot.lastIndexedAt ? new Date(snapshot.lastIndexedAt).toLocaleString() : "none yet"}.` : " No demonstration data is included in adoption totals."}</p></div>
      <section className="metric-grid">
        {metrics.map(([label, value, note]) => <article key={label} className="metric-card"><span className="eyebrow">{label}</span><strong>{value}</strong><p>{note}</p></article>)}
      </section>
      <section className="activity-panel">
        <div><p className="eyebrow">CONFIRMED ACTIVITY</p><h2>TRANSACTION LEDGER</h2></div>
        {snapshot.ledger.length ? (
          <div className="impact-ledger">
            {snapshot.ledger.map((row) => <a key={row.transactionHash} href={`https://basescan.org/tx/${row.transactionHash}`} target="_blank" rel="noreferrer"><span>{row.ticker}</span><strong>{row.transactionHash.slice(0, 10)}…</strong><small>{new Date(row.confirmedAt).toLocaleString()} ↗</small></a>)}
          </div>
        ) : (
          <div className="empty-ledger"><ExternalLink size={22} /><strong>NO CONFIRMED PURCHASES YET</strong><p>Each real row will link to its independent BaseScan record.</p></div>
        )}
      </section>
    </div>
  );
}
