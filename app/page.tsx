import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { MarketStrip } from "@/components/market-strip";

export default function Home() {
  return (
    <div className="landing">
      <MarketStrip />

      <section className="landing-story shell">
        <div className="landing-statement">
          <p className="eyebrow hazard">THE FANTASY MARKET · FREE TO PLAY</p>
          <h1><span>PLAY.</span><span className="outline-word">OWN.</span></h1>
        </div>

        <div className="landing-pitch">
          <p className="eyebrow">PRACTICE FIRST · POWERED BY BASE</p>
          <h2>Build the portfolio before you buy it.</h2>
          <p>Draft a $1,000 virtual team with no wallet or deposit. If you like your call, eligible players can later buy a small version using tokenized stocks [digital tokens that track stock value].</p>
          <div className="hero-actions">
            <Link className="primary-action" href="/draft">BUILD A LINEUP <ArrowRight size={18} /></Link>
            <Link className="secondary-action" href="/battle/demo">WATCH A BATTLE</Link>
          </div>
        </div>

        <div className="landing-flow" aria-label="How Gauntlet works">
          <FlowStep number="01" title="DRAFT" copy="Choose 3–5 stocks." />
          <FlowStep number="02" title="PLAY" copy="Compete with virtual money." />
          <FlowStep number="03" title="OWN" copy="Buy only when ready." />
        </div>
      </section>
    </div>
  );
}

function FlowStep({ number, title, copy }: { number: string; title: string; copy: string }) {
  return <article><span>{number}</span><div><strong>{title}</strong><p>{copy}</p></div></article>;
}
