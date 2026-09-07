"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, CheckCircle2, LoaderCircle, LockKeyhole, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { erc20Abi, formatUnits, parseUnits, type Address, type Hex } from "viem";
import { useAccount, usePublicClient, useSendTransaction, useSwitchChain, useWriteContract } from "wagmi";
import { base } from "wagmi/chains";

import { StockCard } from "@/components/stock-card";
import { WalletStatus } from "@/components/wallet-status";
import { B20_DECIMALS, DEFAULT_DRAFT, getStock, STOCKS } from "@/lib/stocks";

type Step = "select" | "review" | "own";
const MIN_PICKS = 3;
const MAX_PICKS = 5;

type PricePreview = {
  ticker: string;
  company: string;
  allocationUsd: number;
  buyAmount: string;
  liquidityAvailable: boolean;
  allowanceSpender: string | null;
  balanceIssue: boolean;
};

type FirmQuote = {
  ticker: string;
  transaction: { to: Address; data: Hex; value: string; gas?: string };
};

const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function DraftBuilder() {
  const { address, chainId, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: base.id });
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();
  const [selected, setSelected] = useState<string[]>([]);
  const [step, setStep] = useState<Step>("select");
  const [realAmount, setRealAmount] = useState(5);
  const [eligible, setEligible] = useState(false);
  const [quoteState, setQuoteState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [quoteError, setQuoteError] = useState("");
  const [quotes, setQuotes] = useState<PricePreview[]>([]);
  const [approved, setApproved] = useState(false);
  const [purchaseState, setPurchaseState] = useState<"idle" | "approving" | "buying" | "complete" | "error">("idle");
  const [purchaseProgress, setPurchaseProgress] = useState(0);
  const [purchaseError, setPurchaseError] = useState("");
  const [receipts, setReceipts] = useState<string[]>([]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const picks = useMemo(
    () => selected.map((ticker) => getStock(ticker)).filter((stock) => stock !== undefined),
    [selected],
  );
  const realSplit = useMemo(() => {
    if (selected.length === 0) return [];
    const totalCents = realAmount * 100;
    const equalCents = Math.floor(totalCents / selected.length);
    const remainder = totalCents - equalCents * selected.length;
    return selected.map((_, index) => (equalCents + (index < remainder ? 1 : 0)) / 100);
  }, [realAmount, selected]);
  const virtualSplit = useMemo(() => {
    if (selected.length === 0) return [];
    const equalDollars = Math.floor(100_000 / selected.length);
    const remainder = 100_000 - equalDollars * selected.length;
    return selected.map((_, index) => equalDollars + (index < remainder ? 1 : 0));
  }, [selected]);

  const resetQuote = () => {
    setQuoteState("idle");
    setQuoteError("");
    setQuotes([]);
    setApproved(false);
    setPurchaseState("idle");
    setPurchaseProgress(0);
    setPurchaseError("");
    setReceipts([]);
  };

  const toggle = (ticker: string) => {
    resetQuote();
    setSelected((current) =>
      current.includes(ticker)
        ? current.filter((item) => item !== ticker)
        : current.length < MAX_PICKS
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
      setApproved(result.quotes.every((quote) => !quote.allowanceSpender));
      setQuoteState("ready");
    } catch (error) {
      setQuoteError(error instanceof Error ? error.message : "Could not load live prices.");
      setQuoteState("error");
    }
  };

  const ensureBase = async () => {
    if (chainId !== base.id) await switchChainAsync({ chainId: base.id });
  };

  const approveDraft = async () => {
    const spender = quotes.find((quote) => quote.allowanceSpender)?.allowanceSpender;
    if (!spender || !publicClient) return;
    setPurchaseState("approving");
    setPurchaseError("");

    try {
      await ensureBase();
      const hash = await writeContractAsync({
        address: BASE_USDC,
        abi: erc20Abi,
        functionName: "approve",
        args: [spender as Address, parseUnits(String(realAmount), 6)],
        chainId: base.id,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setApproved(true);
      setPurchaseState("idle");
    } catch (error) {
      setPurchaseError(error instanceof Error ? error.message : "USDC approval failed.");
      setPurchaseState("error");
    }
  };

  const buyDraft = async () => {
    if (!address || !publicClient || !approved) return;
    setPurchaseState("buying");
    setPurchaseProgress(receipts.length);
    setPurchaseError("");
    const confirmed = [...receipts];

    try {
      await ensureBase();
      for (let index = confirmed.length; index < picks.length; index += 1) {
        const response = await fetch("/api/firm-quote", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ticker: picks[index].ticker, allocationCents: Math.round(realSplit[index] * 100), taker: address }),
        });
        const result = (await response.json()) as FirmQuote & { error?: string };
        if (!response.ok || !result.transaction) throw new Error(result.error ?? `Could not prepare ${picks[index].ticker}.`);

        const hash = await sendTransactionAsync({
          chainId: base.id,
          to: result.transaction.to,
          data: result.transaction.data,
          value: BigInt(result.transaction.value),
          gas: result.transaction.gas ? BigInt(result.transaction.gas) : undefined,
        });
        await publicClient.waitForTransactionReceipt({ hash });
        confirmed.push(hash);
        setReceipts([...confirmed]);
        setPurchaseProgress(index + 1);
      }
      setPurchaseState("complete");
    } catch (error) {
      setPurchaseError(error instanceof Error ? error.message : "The purchase stopped before completion.");
      setPurchaseState("error");
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
                <h1>BUILD YOUR<br /><em>LINEUP.</em></h1>
              </div>
              <div className="heading-aside">
                <p>Choose three to five companies. Your virtual $100,000 is divided equally across your lineup.</p>
                <div className="selection-count"><span>{selected.length}</span> PICKED <small>3 MIN · 5 MAX</small></div>
              </div>
            </div>

            <div className="stock-grid">
              {STOCKS.map((stock, index) => (
                <StockCard
                  key={stock.ticker}
                  stock={stock}
                  index={index + 1}
                  selected={selected.includes(stock.ticker)}
                  disabled={selected.length === MAX_PICKS && !selected.includes(stock.ticker)}
                  onSelect={() => toggle(stock.ticker)}
                />
              ))}
            </div>

            <div className="sticky-action">
              <div>
                <p className="eyebrow">YOUR DRAFT</p>
                <strong>{selected.length ? selected.join(" · ") : "NO PICKS YET"}</strong>
              </div>
              <button className="primary-action" disabled={selected.length < MIN_PICKS} onClick={() => setStep("review")}>
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
                    <span className="allocation-bar"><i style={{ width: `${100 / picks.length}%`, background: stock.tone }} /></span>
                    <strong>{money.format(virtualSplit[index])}</strong>
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
                  {quoteState === "ready" && quotes.some((quote) => quote.balanceIssue) && (
                    <p className="purchase-message error">This wallet needs at least ${realAmount.toFixed(2)} in USDC on Base.</p>
                  )}
                  {quoteState === "ready" && !quotes.some((quote) => quote.balanceIssue) && !approved && (
                    <button className="purchase-next active" disabled={purchaseState === "approving"} onClick={approveDraft}>
                      {purchaseState === "approving" ? "WAITING FOR BASE CONFIRMATION…" : `APPROVE EXACTLY $${realAmount} USDC`}
                    </button>
                  )}
                  {quoteState === "ready" && !quotes.some((quote) => quote.balanceIssue) && approved && purchaseState !== "complete" && (
                    <button className="purchase-next active" disabled={!isConnected || purchaseState === "buying"} onClick={buyDraft}>
                      {purchaseState === "buying"
                        ? `CONFIRMING STOCK ${purchaseProgress + 1} OF ${picks.length}…`
                        : receipts.length > 0
                          ? `RESUME WITH STOCK ${receipts.length + 1} OF ${picks.length}`
                          : `BUY MY ${picks.length} STOCKS`}
                    </button>
                  )}
                  {purchaseState === "error" && <p className="purchase-message error">{purchaseError}</p>}
                  {purchaseState === "complete" && (
                    <div className="purchase-complete">
                      <CheckCircle2 size={19} />
                      <div><strong>DRAFT OWNED</strong><span>{picks.length} purchases confirmed on Base.</span></div>
                    </div>
                  )}
                  {receipts.length > 0 && (
                    <div className="receipt-list">
                      {receipts.map((hash, index) => <a key={hash} href={`https://basescan.org/tx/${hash}`} target="_blank" rel="noreferrer">STOCK {index + 1} RECEIPT ↗</a>)}
                    </div>
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
