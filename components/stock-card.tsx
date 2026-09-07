import { StockLogo } from "@/components/stock-logo";
import type { Stock } from "@/lib/stocks";

export function StockCard({
  stock,
  selected = false,
  disabled = false,
  onSelect,
  index,
}: {
  stock: Stock;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
  index?: number;
}) {
  const interactive = Boolean(onSelect);
  const Tag = interactive ? "button" : "article";

  return (
    <Tag
      {...(interactive ? { type: "button", onClick: onSelect, disabled } : {})}
      className={`stock-card ${selected ? "selected" : ""} ${disabled ? "disabled" : ""}`}
      style={{ "--stock-tone": stock.tone, "--logo-color": stock.logoColor } as React.CSSProperties}
      aria-pressed={interactive ? selected : undefined}
    >
      <div className="stock-card-top">
        <span className="stock-index">{String(index ?? 0).padStart(2, "0")}</span>
      </div>
      <div className="stock-logo">
        <StockLogo ticker={stock.ticker} />
      </div>
      <div>
        <p className="eyebrow">{stock.sector}</p>
        <h3>{stock.company}</h3>
        <p className="ticker">{stock.ticker}</p>
      </div>
    </Tag>
  );
}
