import { ExternalLink, RadioTower } from "lucide-react";

const metrics = [
  ["NEW B20 WALLETS", "0", "Awaiting mainnet launch"],
  ["CONFIRMED PURCHASES", "0", "Only verified transactions count"],
  ["OWNED DRAFTS", "0", "Every selected balance verified"],
  ["OWNED BATTLES", "0", "Both players verified"],
];

export default function ImpactPage() {
  return (
    <div className="shell page-shell impact-page">
      <header className="dashboard-titlebar">
        <div><p className="eyebrow hazard">PUBLIC PROOF · BASE MAINNET</p><h1>Verified impact</h1></div>
        <p className="heading-aside">This dashboard will count confirmed B20 activity created through Gauntlet. Empty numbers remain empty until real transactions exist.</p>
      </header>
      <div className="data-notice"><RadioTower size={17} /><p><strong>INTEGRATION MODE</strong> Live indexing is not connected yet. No demonstration data is included in adoption totals.</p></div>
      <section className="metric-grid">
        {metrics.map(([label, value, note]) => <article key={label} className="metric-card"><span className="eyebrow">{label}</span><strong>{value}</strong><p>{note}</p></article>)}
      </section>
      <section className="activity-panel">
        <div><p className="eyebrow">CONFIRMED ACTIVITY</p><h2>TRANSACTION LEDGER</h2></div>
        <div className="empty-ledger"><ExternalLink size={22} /><strong>NO CONFIRMED PURCHASES YET</strong><p>Each real row will link to its independent BaseScan record.</p></div>
      </section>
    </div>
  );
}
