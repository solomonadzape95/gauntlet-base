import { Clock3, Radio, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";

const left = [
  ["NVDAc", "+1.82%", true],
  ["AAPLc", "−0.34%", false],
  ["TSLAc", "+2.14%", true],
] as const;
const right = [
  ["MSFTc", "+0.71%", true],
  ["GOOGLc", "+0.42%", true],
  ["AMZNc", "−0.18%", false],
] as const;

export default function DemoBattlePage() {
  return (
    <div className="shell page-shell battle-page">
      <div className="battle-status"><span><Radio size={14} /> LIVE BATTLE</span><span><Clock3 size={14} /> 04:38:12 REMAINING</span></div>
      <header className="battle-heading">
        <p className="eyebrow hazard">OWNED BATTLE · MATCH 0007</p>
        <h1>YOUR THREE.<br /><em>HEAD TO HEAD.</em></h1>
      </header>

      <section className="versus-grid">
        <Competitor name="SOLA" address="0x71E4…13B9" score="+1.21%" rank="01" stocks={left} leading />
        <div className="versus-mark">VS</div>
        <Competitor name="NOVA" address="0x88C1…9A20" score="+0.32%" rank="02" stocks={right} />
      </section>

      <section className="battle-proof">
        <ShieldCheck size={20} />
        <div><strong>BOTH DRAFTS OWNERSHIP-VERIFIED</strong><p>Stock balances were checked on Base when this battle began. Purchase amounts do not affect the score.</p></div>
      </section>
    </div>
  );
}

function Competitor({ name, address, score, rank, stocks, leading = false }: { name: string; address: string; score: string; rank: string; stocks: readonly (readonly [string, string, boolean])[]; leading?: boolean }) {
  return (
    <article className={`competitor ${leading ? "leading" : ""}`}>
      <div className="competitor-top"><span className="rank">{rank}</span><span className="status-chip"><span /> OWNED</span></div>
      <h2>{name}</h2><p className="wallet-address">{address}</p>
      <strong className="battle-score">{score}</strong>
      <div className="holding-list">
        {stocks.map(([ticker, change, up]) => <div key={ticker}><span>{ticker}</span><strong className={up ? "up" : "down"}>{up ? <TrendingUp size={15} /> : <TrendingDown size={15} />}{change}</strong></div>)}
      </div>
    </article>
  );
}
