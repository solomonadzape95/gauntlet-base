import { StockLogo } from "@/components/stock-logo";
import type { Stock } from "@/lib/stocks";

export function StockCard({
  stock,
  selected = false,
  disabled = false,
  draftCost,
  onSelect,
}: {
  stock: Stock;
  selected?: boolean;
  disabled?: boolean;
  draftCost?: number;
  onSelect?: () => void;
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
        <span>{stock.ticker}</span>
        <strong>{selected ? "SELECTED" : "AVAILABLE"}</strong>
      </div>
      <div className={`stock-logo ${stock.ticker === "SNDKc" ? "wide-logo" : ""}`}>
        <StockLogo ticker={stock.ticker} />
      </div>
      <div className="stock-card-bottom">
        <h3>{stock.company}</h3>
        <strong>{draftCost ? `${draftCost} CR` : "—"}</strong>
        {draftCost && <small className="draft-cost-note">DRAFT COST · ONCHAIN PRICED</small>}
      </div>
    </Tag>
  );
}
