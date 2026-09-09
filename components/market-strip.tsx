"use client";

import { useEffect, useRef, useState } from "react";

import { GauntletLoader } from "@/components/gauntlet-loader";
import { StockLogo } from "@/components/stock-logo";
import type { PricePoint } from "@/lib/battle-scoring";
import { getStock } from "@/lib/stocks";

export function MarketStrip() {
  const [prices, setPrices] = useState<PricePoint[] | null>(null);
  const [held, setHeld] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/market", { cache: "no-store" }).then(async (response) => {
      const result = await response.json() as { prices?: PricePoint[] };
      if (!response.ok || !result.prices) throw new Error("Market held");
      if (!cancelled) setPrices(result.prices);
    }).catch(() => { if (!cancelled) setHeld(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!prices?.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let previous = 0;
    const move = (time: number) => {
      const track = trackRef.current;
      if (track && previous && !pausedRef.current) {
        track.scrollLeft += Math.min(time - previous, 50) * .028;
        const loopAt = track.scrollWidth / 2;
        if (loopAt > 0 && track.scrollLeft >= loopAt) track.scrollLeft -= loopAt;
      }
      previous = time;
      frame = window.requestAnimationFrame(move);
    };
    frame = window.requestAnimationFrame(move);
    return () => window.cancelAnimationFrame(frame);
  }, [prices]);

  const loopedPrices = prices ? [...prices, ...prices] : null;
  const originalCount = prices?.length ?? 0;

  return <section className="market-strip" aria-label="Tokenized stocks available in Gauntlet">
    <div className="market-strip-label">{held ? "MARKET FEED HELD" : "ONCHAIN PRICES · CHAINLINK BASE"}</div>
    {!loopedPrices ? <GauntletLoader label={held ? "PRICES UNAVAILABLE" : "READING MARKET"} /> : <div ref={trackRef} className="market-strip-track" onPointerEnter={() => { pausedRef.current = true; }} onPointerLeave={() => { pausedRef.current = false; }} onPointerDown={() => { pausedRef.current = true; }} onPointerUp={() => { pausedRef.current = false; }}>{loopedPrices.map((quote, index) => {
      const stock = getStock(quote.ticker);
      if (!stock) return null;
      return <article className="market-tile" key={`${index < originalCount ? "first" : "repeat"}:${quote.ticker}`} aria-hidden={index >= originalCount || undefined} style={{ "--stock-tone": stock.tone, "--logo-color": stock.logoColor } as React.CSSProperties}>
        <div className="market-tile-top"><span>{quote.ticker}</span><strong>{quote.fresh ? "LIVE" : "HELD"}</strong></div>
        <div className={`market-tile-logo ${quote.ticker === "SNDKc" ? "wide-logo" : ""}`}><StockLogo ticker={quote.ticker} /></div>
        <div><p>{stock.company}</p><strong>${quote.price.toFixed(2)}</strong></div>
      </article>;
    })}</div>}
  </section>;
}
