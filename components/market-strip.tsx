import { StockLogo } from "@/components/stock-logo";
import { MARKET_QUOTES } from "@/lib/practice-game";
import { getStock } from "@/lib/stocks";

export function MarketStrip() {
  const items = [...MARKET_QUOTES, ...MARKET_QUOTES];

  return (
    <section className="market-strip" aria-label="Tokenized stocks available in Gauntlet">
      <div className="market-strip-label">SIMULATED MARKET FEED · PRACTICE PRICES</div>
      <div className="market-strip-track">
        {items.map((quote, index) => {
          const stock = getStock(quote.ticker);
          if (!stock) return null;
          return (
            <article
              className="market-tile"
              key={`${quote.ticker}-${index}`}
              style={{ "--stock-tone": stock.tone, "--logo-color": stock.logoColor } as React.CSSProperties}
              aria-hidden={index >= MARKET_QUOTES.length}
            >
              <div className="market-tile-top">
                <span>{quote.ticker}</span>
                <strong className={quote.change >= 0 ? "up" : "down"}>{quote.change >= 0 ? "+" : ""}{quote.change.toFixed(2)}%</strong>
              </div>
              <div className={`market-tile-logo ${quote.ticker === "SNDKc" ? "wide-logo" : ""}`}><StockLogo ticker={quote.ticker} /></div>
              <div><p>{stock.company}</p><strong>${quote.price.toFixed(2)}</strong></div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
