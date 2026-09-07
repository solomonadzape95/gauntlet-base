import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { MarketStrip } from "@/components/market-strip";

export default function Home() {
  return (
    <>
      <div className="landing">
        <section className="landing-word shell">
          <p className="eyebrow hazard">THE FANTASY MARKET · FREE TO PLAY</p>
          <h1>PLAY.</h1>
          <p>Build a $100,000 virtual portfolio. No wallet. No deposit. Just your read on the market.</p>
        </section>

        <MarketStrip />

        <section className="landing-word landing-own shell">
          <p className="eyebrow hazard">WHEN YOU ARE READY · POWERED BY BASE</p>
          <h2>OWN.</h2>
          <div className="landing-own-copy">
            <p>Keep playing for free, or optionally buy a small version of your lineup using tokenized stocks [digital tokens that track stock value].</p>
            <div className="hero-actions">
              <Link className="primary-action" href="/draft">BUILD A LINEUP <ArrowRight size={18} /></Link>
              <Link className="secondary-action" href="/battle/demo">WATCH A BATTLE</Link>
            </div>
          </div>
        </section>

        <section className="landing-flow shell" aria-label="How Gauntlet works">
          <FlowStep number="01" title="DRAFT" copy="Choose 3–5 stocks and decide how to allocate your virtual $100K." />
          <FlowStep number="02" title="PLAY" copy="Save the portfolio and enter a practice battle. Real money is never required." />
          <FlowStep number="03" title="OWN" copy="If eligible, optionally buy the same weighted portfolio directly to your wallet." />
        </section>
      </div>

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
