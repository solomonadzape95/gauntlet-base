import Link from "next/link";
import { ArrowRight, CheckCircle2, Shield, Swords } from "lucide-react";

import { StockCard } from "@/components/stock-card";
import { STOCKS } from "@/lib/stocks";

export default function Home() {
  return (
    <>
      <section className="hero shell">
        <div className="hero-copy">
          <p className="eyebrow hazard">FANTASY PICKS · REAL OWNERSHIP · BASE</p>
          <h1><span>BUILD A LINEUP.</span><span>OWN A <em>LITTLE.</em></span><span>BEAT EVERYONE.</span></h1>
          <p className="hero-lede">Build a $100,000 fantasy portfolio for free. Then own a miniature real version using Coinbase tokenized stocks.</p>
          <div className="hero-actions">
            <Link className="primary-action" href="/draft">ENTER THE GAUNTLET <ArrowRight size={18} /></Link>
            <Link className="secondary-action" href="/battle/demo">WATCH A BATTLE</Link>
          </div>
        </div>

        <div className="hero-deck" aria-label="Example stock lineup">
          {STOCKS.slice(0, 3).map((stock, index) => (
            <div className={`deck-card deck-${index + 1}`} key={stock.ticker}>
              <StockCard stock={stock} index={index + 1} />
            </div>
          ))}
          <div className="owned-stamp"><CheckCircle2 size={18} /> OWNED ON BASE</div>
        </div>
      </section>

      <section className="proof-strip">
        <div className="shell proof-grid">
          <div><span className="eyebrow">VIRTUAL START</span><strong>$100K</strong></div>
          <div><span className="eyebrow">REAL START</span><strong>FROM $5*</strong></div>
          <div><span className="eyebrow">YOUR TEAM</span><strong>3 STOCKS</strong></div>
          <div><span className="eyebrow">CUSTODY</span><strong>YOUR WALLET</strong></div>
        </div>
      </section>

      <section className="shell how-section">
        <div className="section-kicker"><Swords size={18} /><span>THE FORMAT</span></div>
        <div className="how-heading"><h2>FROM FANTASY<br />TO <em>OWNERSHIP.</em></h2><p>No jargon-heavy terminal. No need to risk money before you understand the game. Choose freely, then decide whether to own your picks.</p></div>
        <div className="how-grid">
          <Step number="01" title="PICK" copy="Draft three to five companies with $100,000 in virtual funds." />
          <Step number="02" title="OWN" copy="Buy a small real version. Every tokenized stock goes to your wallet." />
          <Step number="03" title="BATTLE" copy="Challenge a friend. Percentage returns decide the winner—not money spent." />
        </div>
      </section>

      <section className="safety-band">
        <div className="shell safety-grid">
          <div><Shield size={32} /><h2>YOUR MONEY NEVER ENTERS OUR HANDS.</h2></div>
          <p>Gauntlet coordinates the draft and the competition. Your wallet approves each purchase, Base settles it, and the stocks remain under your control.</p>
          <Link className="text-link" href="/draft">START FOR FREE →</Link>
        </div>
      </section>

      <footer className="site-footer shell">
        <span>GAUNTLET · SEASON 0</span>
        <span>*Minimum purchase subject to live-liquidity testing. Eligible non-US users only.</span>
      </footer>
    </>
  );
}

function Step({ number, title, copy }: { number: string; title: string; copy: string }) {
  return <article className="how-card"><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>;
}
