"use client";

import { useEffect, useState } from "react";

import { GauntletLoader } from "@/components/gauntlet-loader";
import { StockLogo } from "@/components/stock-logo";
import type { PricePoint } from "@/lib/battle-scoring";
import { getStock } from "@/lib/stocks";

export function MarketStrip() {
  const [prices, setPrices] = useState<PricePoint[] | null>(null);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/market", { cache: "no-store" }).then(async (response) => {
      const result = await response.json() as { prices?: PricePoint[] };
      if (!response.ok || !result.prices) throw new Error("Market held");
      if (!cancelled) setPrices(result.prices);
    }).catch(() => { if (!cancelled) setHeld(true); });
    return () => { cancelled = true; };
  }, []);

  return <section className="market-strip" aria-label="Tokenized stocks available in Gauntlet">
    <div className="market-strip-label">{held ? "MARKET FEED HELD" : "ONCHAIN PRICES · CHAINLINK BASE"}</div>
    {!prices ? <GauntletLoader label={held ? "PRICES UNAVAILABLE" : "READING MARKET"} /> : <div className="market-strip-track">{prices.map((quote) => {
      const stock = getStock(quote.ticker);
      if (!stock) return null;
      return <article className="market-tile" key={quote.ticker} style={{ "--stock-tone": stock.tone, "--logo-color": stock.logoColor } as React.CSSProperties}>
        <div className="market-tile-top"><span>{quote.ticker}</span><strong>{quote.fresh ? "LIVE" : "HELD"}</strong></div>
        <div className={`market-tile-logo ${quote.ticker === "SNDKc" ? "wide-logo" : ""}`}><StockLogo ticker={quote.ticker} /></div>
        <div><p>{stock.company}</p><strong>${quote.price.toFixed(2)}</strong></div>
      </article>;
    })}</div>}
  </section>;
}
