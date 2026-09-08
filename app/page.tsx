import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { MarketStrip } from "@/components/market-strip";

export default function Home() {
  return (
    <div className="landing">
      <MarketStrip />

      <section className="landing-story shell">
        <div className="landing-pitch">
          <p className="eyebrow hazard">FANTASY STOCKS · FREE TO PLAY</p>
          <h1>Build your stock team.</h1>
          <p>Pick 3–5 tokenized stocks with 1,000 credits, then compete on performance. Connecting a wallet and buying real tokens are optional.</p>
          <div className="hero-actions">
            <Link className="primary-action" href="/draft">BUILD YOUR TEAM <ArrowRight size={18} /></Link>
            <Link className="secondary-action" href="/battle">CHOOSE A BATTLE</Link>
          </div>
        </div>

        <div className="landing-flow" aria-label="How Gauntlet works">
          <FlowStep number="01" title="PICK" copy="Choose 3–5 stocks." />
          <FlowStep number="02" title="PLAY" copy="Earn points when they perform." />
          <FlowStep number="03" title="COMPETE" copy="Join a week or challenge a friend." />
        </div>
      </section>
    </div>
  );
}

function FlowStep({ number, title, copy }: { number: string; title: string; copy: string }) {
  return <article><span>{number}</span><div><strong>{title}</strong><p>{copy}</p></div></article>;
}
