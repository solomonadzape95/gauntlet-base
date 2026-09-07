import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { StockCard } from "@/components/stock-card";
import { STOCKS } from "@/lib/stocks";

export default function Home() {
  return (
    <>
      <main className="landing shell">
        <section className="landing-intro">
          <p className="eyebrow hazard">FANTASY STOCKS · POWERED BY BASE</p>
          <h1>PLAY THE MARKET.<br /><em>OWN YOUR PICKS.</em></h1>
          <p className="hero-lede">
            Draft 3–5 companies with $100,000 in virtual funds, compete on performance,
            then optionally buy a small version using tokenized stocks [digital tokens that track stock value].
          </p>
          <div className="hero-actions">
            <Link className="primary-action" href="/draft">BUILD A LINEUP <ArrowRight size={18} /></Link>
            <Link className="secondary-action" href="/battle/demo">SEE A BATTLE</Link>
          </div>
        </section>

        <section className="landing-cards" aria-label="Stocks available to draft">
          {STOCKS.slice(0, 4).map((stock, index) => (
            <StockCard stock={stock} index={index + 1} key={stock.ticker} />
          ))}
        </section>

        <section className="landing-flow" aria-label="How Gauntlet works">
          <FlowStep number="01" title="DRAFT" copy="Choose 3–5 stocks and decide how to allocate your virtual $100K." />
          <FlowStep number="02" title="OWN" copy="Optionally buy the same weighted portfolio from $5, directly to your wallet." />
          <FlowStep number="03" title="BATTLE" copy="Challenge friends. Percentage performance—not money spent—decides who wins." />
        </section>
      </main>

      <footer className="site-footer shell">
        <span>GAUNTLET · SEASON 0</span>
        <span>FREE TO PLAY · ELIGIBLE NON-US USERS ONLY FOR REAL PURCHASES</span>
      </footer>
    </>
  );
}

function FlowStep({ number, title, copy }: { number: string; title: string; copy: string }) {
  return <article><span>{number}</span><div><strong>{title}</strong><p>{copy}</p></div></article>;
}
