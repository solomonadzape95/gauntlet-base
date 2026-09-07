import { StockLogo } from "@/components/stock-logo";
import { MARKET_QUOTES } from "@/lib/practice-game";
import type { Stock } from "@/lib/stocks";

export function StockCard({
  stock,
  selected = false,
  disabled = false,
  onSelect,
}: {
  stock: Stock;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}) {
  const interactive = Boolean(onSelect);
  const Tag = interactive ? "button" : "article";
  const quote = MARKET_QUOTES.find((item) => item.ticker === stock.ticker);

  return (
    <Tag
      {...(interactive ? { type: "button", onClick: onSelect, disabled } : {})}
      className={`stock-card ${selected ? "selected" : ""} ${disabled ? "disabled" : ""}`}
      style={{ "--stock-tone": stock.tone, "--logo-color": stock.logoColor } as React.CSSProperties}
      aria-pressed={interactive ? selected : undefined}
    >
      <div className="stock-card-top">
        <span>{stock.ticker}</span>
        {quote && <strong className={quote.change >= 0 ? "up" : "down"}>{quote.change >= 0 ? "+" : ""}{quote.change.toFixed(2)}%</strong>}
      </div>
      <div className={`stock-logo ${stock.ticker === "SNDKc" ? "wide-logo" : ""}`}>
        <StockLogo ticker={stock.ticker} />
      </div>
      <div className="stock-card-bottom">
        <h3>{stock.company}</h3>
        {quote && <strong>${quote.price.toFixed(2)}</strong>}
      </div>
    </Tag>
  );
}
