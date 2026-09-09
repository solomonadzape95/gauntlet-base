"use client";

import { Activity, ExternalLink, ShieldCheck, WalletCards, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { erc20Abi, formatUnits } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { base } from "wagmi/chains";

import { GauntletLoader } from "@/components/gauntlet-loader";
import { StockLogo } from "@/components/stock-logo";
import type { DraftMarketStock } from "@/lib/fantasy-market";
import type { StockTracePoint } from "@/lib/stock-detail";
import { B20_DECIMALS, getStock, type Stock } from "@/lib/stocks";

type Detail = {
  stock: Stock;
  quote: DraftMarketStock | null;
  gameWeek: { label: string; status: "upcoming" | "active" | "complete"; startsAt: string; endsAt: string } | null;
  trace: { points: StockTracePoint[]; changePercent: number | null; low: number | null; high: number | null };
  proof: { chain: string; chainId: number; priceSource: string; tokenExplorerUrl: string; feedExplorerUrl: string };
};

function PriceTrace({ points, label }: { points: StockTracePoint[]; label: string }) {
  if (points.length < 2) return <div className="stock-trace-empty"><Activity size={19} /><span>TRACE STARTS WITH THE LIVE GAME WEEK</span></div>;
  const width = 720;
  const height = 220;
  const values = points.map((point) => point.price);
  const low = Math.min(...values);
  const range = Math.max(.000001, Math.max(...values) - low);
  const line = points.map((point, index) => `${((index / (points.length - 1)) * width).toFixed(2)},${(height - ((point.price - low) / range) * (height - 24) - 12).toFixed(2)}`).join(" ");
  const area = `0,${height} ${line} ${width},${height}`;
  return <svg className="stock-price-trace" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} preserveAspectRatio="none"><polygon points={area} /><polyline points={line} /></svg>;
}

function compactAddress(address: string) {
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

export function StockProofPanel({ ticker, savedCost, marketQuote, onClose }: { ticker: string | null; savedCost?: number; marketQuote?: DraftMarketStock; onClose: () => void }) {
  const stock = ticker ? getStock(ticker) : undefined;
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: base.id });
  const [detailState, setDetailState] = useState<{ ticker: string; detail: Detail | null; error: string }>({ ticker: "", detail: null, error: "" });
  const [balanceState, setBalanceState] = useState<{ key: string; balance: string | null }>({ key: "", balance: null });
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!ticker) return;
    let cancelled = false;
    fetch(`/api/stocks/${encodeURIComponent(ticker)}`, { cache: "no-store" }).then(async (response) => {
      const result = await response.json() as Detail & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not load this stock.");
      if (!cancelled) setDetailState({ ticker, detail: result, error: "" });
    }).catch((cause) => { if (!cancelled) setDetailState({ ticker, detail: null, error: cause instanceof Error ? cause.message : "Could not load this stock." }); });
    return () => { cancelled = true; };
  }, [ticker]);

  useEffect(() => {
    if (!stock || !address || !publicClient) return;
    let cancelled = false;
    const key = `${stock.ticker}:${address}`;
    publicClient.readContract({ address: stock.contractAddress, abi: erc20Abi, functionName: "balanceOf", args: [address] })
      .then((balance) => { if (!cancelled) setBalanceState({ key, balance: formatUnits(balance, B20_DECIMALS) }); })
      .catch(() => { if (!cancelled) setBalanceState({ key, balance: null }); });
    return () => { cancelled = true; };
  }, [address, publicClient, stock]);

  useEffect(() => {
    if (!ticker) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [ticker]);

  useEffect(() => {
    if (!ticker) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, ticker]);

  const detail = detailState.ticker === ticker ? detailState.detail : null;
  const error = detailState.ticker === ticker ? detailState.error : "";
  const balanceKey = address ? `${stock?.ticker}:${address}` : "";
  const walletBalance = balanceState.key === balanceKey ? balanceState.balance : null;
  const balanceLoading = Boolean(address && publicClient && balanceState.key !== balanceKey);
  const formattedBalance = useMemo(() => {
    if (!walletBalance) return walletBalance;
    return Number(walletBalance).toLocaleString("en-US", { maximumFractionDigits: 6 });
  }, [walletBalance]);

  if (!ticker || !stock) return null;
  const quote = detail?.quote ?? marketQuote ?? null;
  const move = detail?.trace.changePercent ?? null;
  const quoteIsCaptured = Boolean(quote && Date.parse(quote.updatedAt) > 0);
  const tokenExplorerUrl = detail?.proof.tokenExplorerUrl ?? `https://basescan.org/token/${stock.contractAddress}`;
  const feedExplorerUrl = detail?.proof.feedExplorerUrl ?? `https://basescan.org/address/${stock.priceFeedAddress}`;

  return <div className="stock-proof-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="stock-proof-panel" role="dialog" aria-modal="true" aria-labelledby="stock-proof-title" style={{ "--stock-tone": stock.logoColor } as React.CSSProperties}>
      <header className="stock-proof-header">
        <div className="stock-proof-identity"><span><StockLogo ticker={stock.ticker} /></span><div><small>{stock.sector} · B20</small><h2 id="stock-proof-title">{stock.company}</h2><strong>{stock.ticker}</strong></div></div>
        <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Close stock details"><X size={20} /></button>
      </header>

      {!detail && !error && <div className="stock-proof-sync"><GauntletLoader label="READING GAME WEEK TRACE" /></div>}
      {error && <div className="stock-proof-error"><strong>LIVE TRACE HELD</strong><span>{error}</span></div>}

      <>
        <div className="stock-proof-metrics">
          <article><small>LIVE PRICE</small><strong>{quote ? `$${quote.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : "HELD"}</strong><span>{!quoteIsCaptured ? "PREVIEW PRICE" : quote?.fresh ? "FRESH FEED" : "WAITING FOR FEED"}</span></article>
          <article><small>DRAFT COST</small><strong>{savedCost ?? quote?.draftCost ?? "—"}{savedCost || quote?.draftCost ? " CR" : ""}</strong><span>{savedCost ? "YOUR LOCKED COST" : "CURRENT MARKET"}</span></article>
          <article><small>GAME WEEK MOVE</small><strong className={move != null && move < 0 ? "down" : "up"}>{move == null ? "PENDING" : `${move >= 0 ? "+" : ""}${move.toFixed(2)}%`}</strong><span>{detail?.gameWeek?.label ?? (!detail ? "SYNCING WEEK" : "NO ACTIVE WEEK")}</span></article>
          <article><small>YOUR B20</small><strong>{!address ? "NOT CONNECTED" : balanceLoading ? "READING" : formattedBalance ?? "UNAVAILABLE"}</strong><span>{address ? compactAddress(address) : "CONNECT TO VERIFY"}</span></article>
        </div>

        <div className="stock-proof-chart">
          <div><div><small>REAL GAME WEEK TRACE</small><strong>{detail?.gameWeek ? `${detail.gameWeek.label} · ${detail.gameWeek.status}` : !detail ? "READING RECORD" : "NOT STARTED"}</strong></div>{detail?.trace.low != null && <span>LOW ${detail.trace.low.toFixed(2)} · HIGH {detail.trace.high?.toFixed(2)}</span>}</div>
          <PriceTrace points={detail?.trace.points ?? []} label={`${stock.company} real Game Week price trace`} />
        </div>

        <div className="stock-proof-ledger">
          <div><ShieldCheck size={17} /><span><small>VERIFIED TOKEN</small><strong>{compactAddress(stock.contractAddress)}</strong></span></div>
          <div><Activity size={17} /><span><small>TOTAL-RETURN FEED</small><strong>{quoteIsCaptured && quote?.updatedAt ? new Date(quote.updatedAt).toLocaleString() : "CAPTURE PENDING"}</strong></span></div>
          <div><WalletCards size={17} /><span><small>OWNERSHIP</small><strong>SELF-CUSTODIED ON BASE</strong></span></div>
        </div>

        <footer className="stock-proof-actions">
          <a href={tokenExplorerUrl} target="_blank" rel="noreferrer">VIEW TOKEN <ExternalLink size={14} /></a>
          <a href={feedExplorerUrl} target="_blank" rel="noreferrer">VERIFY FEED <ExternalLink size={14} /></a>
        </footer>
      </>
    </section>
  </div>;
}
