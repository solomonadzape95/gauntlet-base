"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, CheckCircle2, LoaderCircle, LockKeyhole, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";

import { StockCard } from "@/components/stock-card";
import { WalletStatus } from "@/components/wallet-status";
import { B20_DECIMALS, DEFAULT_DRAFT, getStock, STOCKS } from "@/lib/stocks";

type Step = "select" | "review" | "own";

type PricePreview = {
  ticker: string;
  company: string;
  allocationUsd: number;
  buyAmount: string;
  liquidityAvailable: boolean;
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function DraftBuilder() {
  const { address, isConnected } = useAccount();
  const [selected, setSelected] = useState<string[]>([]);
  const [step, setStep] = useState<Step>("select");
  const [realAmount, setRealAmount] = useState(5);
  const [eligible, setEligible] = useState(false);
  const [quoteState, setQuoteState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [quoteError, setQuoteError] = useState("");
  const [quotes, setQuotes] = useState<PricePreview[]>([]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const picks = useMemo(
    () => selected.map((ticker) => getStock(ticker)).filter((stock) => stock !== undefined),
    [selected],
  );
  const realSplit = useMemo(() => {
    const totalCents = realAmount * 100;
    const equalCents = Math.floor(totalCents / 3);
    const remainder = totalCents - equalCents * 3;
    return [0, 1, 2].map((index) => (equalCents + (index < remainder ? 1 : 0)) / 100);
  }, [realAmount]);

  const resetQuote = () => {
    setQuoteState("idle");
    setQuoteError("");
    setQuotes([]);
  };

  const toggle = (ticker: string) => {
    resetQuote();
    setSelected((current) =>
      current.includes(ticker)
        ? current.filter((item) => item !== ticker)
        : current.length < 3
          ? [...current, ticker]
          : current,
    );
  };

  const previewPrices = async () => {
    if (!address || !eligible) return;
    setQuoteState("loading");
    setQuoteError("");

    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amount: realAmount, taker: address, tickers: selected }),
      });
      const result = (await response.json()) as { error?: string; quotes?: PricePreview[] };

      if (!response.ok || !result.quotes) throw new Error(result.error ?? "Could not load live prices.");
      setQuotes(result.quotes);
      setQuoteState("ready");
    } catch (error) {
      setQuoteError(error instanceof Error ? error.message : "Could not load live prices.");
      setQuoteState("error");
    }
  };

  return (
    <div className="draft-app">
      <div className="step-rail" aria-label="Draft progress">
        {[
          ["select", "01", "PICK"],
          ["review", "02", "LOCK"],
          ["own", "03", "OWN"],
        ].map(([id, number, label]) => (
          <div key={id} className={`step ${step === id ? "active" : ""}`}>
            <span>{number}</span>
            <strong>{label}</strong>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === "select" && (
          <motion.section
            key="select"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <div className="page-heading split-heading">
              <div>
                <p className="eyebrow hazard">ROUND 01 · FREE TO PLAY</p>
                <h1>BUILD YOUR<br /><em>THREE.</em></h1>
              </div>
              <div className="heading-aside">
                <p>Choose exactly three companies. Your virtual $100,000 is divided equally between them.</p>
                <div className="selection-count"><span>{selected.length}</span> / 3 SELECTED</div>
              </div>
            </div>

            <div className="stock-grid">
              {STOCKS.map((stock, index) => (
                <StockCard
                  key={stock.ticker}
                  stock={stock}
                  index={index + 1}
                  selected={selected.includes(stock.ticker)}
                  disabled={selected.length === 3 && !selected.includes(stock.ticker)}
                  onSelect={() => toggle(stock.ticker)}
                />
              ))}
            </div>

            <div className="sticky-action">
              <div>
                <p className="eyebrow">YOUR DRAFT</p>
                <strong>{selected.length ? selected.join(" · ") : "NO PICKS YET"}</strong>
              </div>
              <button className="primary-action" disabled={selected.length !== 3} onClick={() => setStep("review")}>
                LOCK MY DRAFT <ArrowRight size={18} />
              </button>
            </div>
          </motion.section>
        )}

        {step === "review" && (
          <motion.section key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
            <div className="page-heading">
              <p className="eyebrow hazard">ROUND 02 · VIRTUAL PORTFOLIO</p>
              <h1>YOUR DRAFT<br />IS <em>LOCKED.</em></h1>
              <p className="lede">No money has moved. This is your risk-free practice portfolio.</p>
            </div>

            <div className="portfolio-panel">
              <div className="portfolio-total">
                <span className="eyebrow">VIRTUAL FUNDS</span>
                <strong>{money.format(100000)}</strong>
                <span className="status-chip"><span /> VIRTUAL</span>
              </div>
              <div className="allocation-list">
                {picks.map((stock, index) => (
                  <div key={stock.ticker} className="allocation-row">
                    <span className="allocation-rank">0{index + 1}</span>
                    <span className="allocation-company">{stock.company}<small>{stock.ticker}</small></span>
                    <span className="allocation-bar"><i style={{ width: index === 2 ? "33.34%" : "33.33%", background: stock.tone }} /></span>
                    <strong>{money.format(index === 2 ? 33334 : 33333)}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="action-pair">
              <button className="secondary-action" onClick={() => setStep("select")}>EDIT PICKS</button>
              <button className="primary-action" onClick={() => setStep("own")}>MAKE THIS DRAFT REAL <ArrowRight size={18} /></button>
            </div>
          </motion.section>
        )}

        {step === "own" && (
          <motion.section key="own" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="own-layout">
              <div>
                <div className="page-heading compact">
                  <p className="eyebrow hazard">ROUND 03 · OWN YOUR PICKS</p>
                  <h1>MAKE IT<br /><em>REAL.</em></h1>
                  <p className="lede">Buy a miniature version of your fantasy portfolio. The stocks go directly to your wallet.</p>
                </div>
                <div className="trust-list">
                  <p><ShieldCheck size={18} /> You control the stocks</p>
                  <p><LockKeyhole size={18} /> Gauntlet never holds your funds</p>
                  <p><CheckCircle2 size={18} /> Spending never changes your score</p>
                </div>
              </div>

              <div className="transaction-card">
                <div className="transaction-tabs"><span className="active">OWN DRAFT</span><span>DETAILS</span></div>
                <div className="transaction-body">
                  <label className="eyebrow">TOTAL PURCHASE</label>
                  <div className="amount-options">
                    {[5, 10, 25].map((amount) => (
                      <button key={amount} onClick={() => { resetQuote(); setRealAmount(amount); }} className={realAmount === amount ? "active" : ""}>${amount}</button>
                    ))}
                  </div>

                  <div className="receive-list">
                    <p className="eyebrow">{quoteState === "ready" ? "LIVE PRICE PREVIEW" : "DOLLAR SPLIT"}</p>
                    {picks.map((stock, index) => (
                      <div key={stock.ticker}>
                        <span><i style={{ background: stock.tone }} /> {stock.ticker}</span>
                        <strong>
                          {quotes[index]
                            ? `≈ ${Number(formatUnits(BigInt(quotes[index].buyAmount), B20_DECIMALS)).toLocaleString("en-US", { maximumSignificantDigits: 5 })} ${stock.ticker}`
                            : `$${realSplit[index].toFixed(2)}`}
                        </strong>
                      </div>
                    ))}
                  </div>

                  <div className={`integration-notice ${quoteState === "error" ? "error" : ""}`}>
                    <span className="status-dot" />
                    <p>
                      <strong>{quoteState === "ready" ? "PRICES FOUND · PREVIEW ONLY" : quoteState === "error" ? "PRICE PREVIEW UNAVAILABLE" : "NO PURCHASE YET"}</strong>
                      {quoteState === "ready"
                        ? "These estimates can change before you approve a purchase in your wallet."
                        : quoteError || "Connect a wallet and pass the eligibility check to preview live B20 prices."}
                    </p>
                  </div>

                  <WalletStatus />
                  <label className="eligibility-check">
                    <input type="checkbox" checked={eligible} onChange={(event) => setEligible(event.target.checked)} />
                    <span>I confirm I am 18 or older, outside the United States, and permitted to access these tokenized stocks [blockchain tokens that track stock value] where I live.</span>
                  </label>
                  <button
                    className="primary-action full"
                    disabled={!isConnected || !eligible || quoteState === "loading"}
                    onClick={previewPrices}
                  >
                    {quoteState === "loading" ? <><LoaderCircle className="spin" size={17} /> CHECKING LIVE PRICES</> : quoteState === "ready" ? "REFRESH PRICE PREVIEW" : "PREVIEW LIVE PRICES"}
                  </button>
                  {quoteState === "ready" && (
                    <button className="purchase-next" disabled>WALLET PURCHASE COMING NEXT</button>
                  )}
                  <p className="legal-copy">Real purchases are for eligible adults outside the United States. This is not investment advice.</p>
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {selected.length === 0 && step === "select" && (
        <button className="demo-picks" onClick={() => setSelected(DEFAULT_DRAFT)}>USE DEMO PICKS</button>
      )}
    </div>
  );
}
