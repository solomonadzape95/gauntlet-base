"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, CheckCircle2, LoaderCircle, LockKeyhole, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { erc20Abi, formatUnits, parseUnits, type Address, type Hex } from "viem";
import { useAccount, usePublicClient, useSendTransaction, useSwitchChain, useWriteContract } from "wagmi";
import { base } from "wagmi/chains";

import { StockCard } from "@/components/stock-card";
import { WalletStatus } from "@/components/wallet-status";
import { useGauntletAuth } from "@/components/gauntlet-auth";
import { allocateByWeight, VIRTUAL_BUDGET } from "@/lib/allocations";
import { markPracticeDraftOwned, readPracticeDrafts, savePracticeDraft } from "@/lib/practice-game";
import { createDraftMarket, type DraftMarketStock } from "@/lib/fantasy-market";
import {
  attachPurchaseWallet,
  clearPurchaseSession,
  confirmedPurchaseCount,
  createPurchaseSession,
  isPurchaseSessionComplete,
  isPurchaseSessionEditable,
  readPurchaseSession,
  savePurchaseSession,
  updatePurchaseRow,
  type PurchaseSession,
} from "@/lib/purchase-session";
import { B20_DECIMALS, DEFAULT_DRAFT, getStock, STOCKS } from "@/lib/stocks";
import { saveActiveTeam } from "@/lib/team-client";

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

type LocationCheck = {
  country: string | null;
  eligible: boolean;
  message: string;
  status: "idle" | "loading" | "ready" | "error";
};

const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;

export function DraftBuilder({ ownDraftId, returnTo }: { ownDraftId?: string; returnTo?: string }) {
  const router = useRouter();
  const { session } = useGauntletAuth();
  const { address, chainId, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: base.id });
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();
  const [selected, setSelected] = useState<string[]>([]);
  const [virtualAllocations, setVirtualAllocations] = useState<Record<string, number>>({});
  const [step, setStep] = useState<Step>("select");
  const [realAmount, setRealAmount] = useState(5);
  const [eligible, setEligible] = useState(false);
  const [locationCheck, setLocationCheck] = useState<LocationCheck>({
    country: null,
    eligible: false,
    message: "Location has not been checked yet.",
    status: "idle",
  });
  const [quoteState, setQuoteState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [quoteError, setQuoteError] = useState("");
  const [quotes, setQuotes] = useState<PricePreview[]>([]);
  const [approved, setApproved] = useState(false);
  const [purchaseState, setPurchaseState] = useState<"idle" | "approving" | "buying" | "complete" | "error">("idle");
  const [purchaseError, setPurchaseError] = useState("");
  const [teamError, setTeamError] = useState("");
  const [purchaseSession, setPurchaseSession] = useState<PurchaseSession | null>(null);
  const [rehearsalState, setRehearsalState] = useState<"idle" | "running" | "complete">("idle");
  const [rehearsalIndex, setRehearsalIndex] = useState(-1);
  const [draftMarket, setDraftMarket] = useState<DraftMarketStock[]>([]);
  const [marketState, setMarketState] = useState<"loading" | "live" | "held">("loading");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/market", { cache: "no-store" }).then(async (response) => {
      const result = await response.json() as { prices?: Parameters<typeof createDraftMarket>[0] };
      if (!response.ok || !result.prices) throw new Error();
      if (!cancelled) {
        setDraftMarket(createDraftMarket(result.prices));
        setMarketState("live");
      }
    }).catch(() => { if (!cancelled) setMarketState("held"); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!ownDraftId) return;
    let saved = readPurchaseSession();
    const target = readPracticeDrafts().find((draft) => draft.id === ownDraftId);
    const existingTransaction = saved?.rows.some((row) => row.txHash || row.status !== "ready");
    if (target && (!saved || (saved.draftId !== target.id && !existingTransaction))) {
      const allocationCents = allocateByWeight(target.picks.map((pick) => pick.virtualAmount), 500);
      saved = savePurchaseSession(createPurchaseSession({
        draftId: target.id,
        realAmount: 5,
        picks: target.picks.map((pick, index) => ({ ...pick, allocationCents: allocationCents[index] })),
      }));
    }
    if (!saved) return;

    const timer = window.setTimeout(() => {
      setSelected(saved.picks.map((pick) => pick.ticker));
      setVirtualAllocations(Object.fromEntries(saved.picks.map((pick) => [pick.ticker, pick.virtualAmount])));
      setRealAmount(saved.realAmount);
      setPurchaseSession(saved);
      setPurchaseState(isPurchaseSessionComplete(saved) ? "complete" : "idle");
      setStep("own");
    }, 0);

    return () => window.clearTimeout(timer);
  }, [ownDraftId]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [step]);

  useEffect(() => {
    if (step !== "own") return;
    let cancelled = false;

    fetch("/api/eligibility", { cache: "no-store" })
      .then(async (response) => {
        const result = (await response.json()) as Omit<LocationCheck, "status">;
        if (!cancelled) setLocationCheck({ ...result, status: "ready" });
      })
      .catch(() => {
        if (!cancelled) {
          setLocationCheck({
            country: null,
            eligible: false,
            message: "The location check is unavailable. Practice mode remains open.",
            status: "error",
          });
        }
      });

    return () => { cancelled = true; };
  }, [step]);

  const picks = useMemo(
    () => selected.map((ticker) => getStock(ticker)).filter((stock) => stock !== undefined),
    [selected],
  );
  const realSplit = useMemo(() => {
    if (selected.length === 0) return [];
    return allocateByWeight(
      selected.map((ticker) => virtualAllocations[ticker] ?? 0),
      realAmount * 100,
    ).map((cents) => cents / 100);
  }, [realAmount, selected, virtualAllocations]);
  const allocationTotal = useMemo(
    () => selected.reduce((total, ticker) => total + (virtualAllocations[ticker] ?? 0), 0),
    [selected, virtualAllocations],
  );
  const allocationRemaining = VIRTUAL_BUDGET - allocationTotal;
  const allocationsValid = selected.length >= MIN_PICKS && selected.length <= MAX_PICKS && allocationRemaining >= 0
    && selected.every((ticker) => (virtualAllocations[ticker] ?? 0) > 0);
  const confirmedCount = confirmedPurchaseCount(purchaseSession);
  const purchaseStarted = Boolean(purchaseSession?.rows.some((row) => row.status !== "ready" || row.txHash));
  const purchaseRehearsalEnabled = process.env.NODE_ENV !== "production"
    || process.env.NEXT_PUBLIC_ENABLE_PURCHASE_REHEARSAL === "true";

  const persistPurchaseSession = (session: PurchaseSession) => {
    const saved = savePurchaseSession(session);
    setPurchaseSession(saved);
    return saved;
  };

  const resetQuote = () => {
    setQuoteState("idle");
    setQuoteError("");
    setQuotes([]);
    setApproved(false);
    setPurchaseState("idle");
    setPurchaseError("");
    setRehearsalState("idle");
    setRehearsalIndex(-1);
  };

  const rehearsePurchase = async () => {
    if (!purchaseRehearsalEnabled || purchaseStarted || rehearsalState === "running") return;
    setRehearsalState("running");
    setRehearsalIndex(0);

    for (let index = 0; index < picks.length; index += 1) {
      setRehearsalIndex(index);
      await new Promise((resolve) => window.setTimeout(resolve, 360));
    }

    setRehearsalIndex(picks.length);
    setRehearsalState("complete");
  };

  const toggle = (ticker: string) => {
    resetQuote();
    setSelected((current) => {
      if (current.includes(ticker)) return current.filter((item) => item !== ticker);
      const cost = draftMarket.find((item) => item.ticker === ticker)?.draftCost ?? 0;
      return current.length < MAX_PICKS && cost > 0 ? [...current, ticker] : current;
    });
  };

  const lockDraft = () => {
    setVirtualAllocations(Object.fromEntries(selected.map((ticker) => [ticker, draftMarket.find((item) => item.ticker === ticker)?.draftCost ?? 0])));
    setStep("review");
  };

  const playForFree = async () => {
    if (!allocationsValid) return;
    setTeamError("");
    const picks = selected.map((ticker) => ({ ticker, virtualAmount: virtualAllocations[ticker] }));
    try {
      const saved = await saveActiveTeam(picks, session);
      savePracticeDraft(saved.picks);
      if (returnTo) router.push(returnTo);
      else window.location.reload();
    } catch (cause) {
      setTeamError(cause instanceof Error ? cause.message : "Could not save this team.");
    }
  };

  const enterOwnership = async () => {
    if (!allocationsValid) return;
    setTeamError("");
    const picks = selected.map((ticker) => ({
      ticker,
      virtualAmount: virtualAllocations[ticker],
    }));
    let saved;
    try { saved = await saveActiveTeam(picks, session); } catch (cause) {
      setTeamError(cause instanceof Error ? cause.message : "Could not save this team.");
      return;
    }
    const draft = savePracticeDraft(saved.picks);
    const allocationCents = allocateByWeight(
      selected.map((ticker) => virtualAllocations[ticker]),
      realAmount * 100,
    );
    persistPurchaseSession(createPurchaseSession({
      draftId: draft.id,
      walletAddress: address,
      realAmount,
      picks: saved.picks.map((pick, index) => ({
        ticker: pick.ticker,
        virtualAmount: pick.virtualAmount,
        allocationCents: allocationCents[index],
      })),
    }));
    router.push(`/draft?own=${encodeURIComponent(draft.id)}`);
    setStep("own");
  };

  const editDraft = () => {
    if (!isPurchaseSessionEditable(purchaseSession)) return;
    clearPurchaseSession();
    setPurchaseSession(null);
    resetQuote();
    setStep("review");
    router.replace("/draft");
  };

  const changeRealAmount = (amount: number) => {
    if (purchaseStarted || !purchaseSession) return;
    resetQuote();
    const allocationCents = allocateByWeight(
      purchaseSession.picks.map((pick) => pick.virtualAmount),
      amount * 100,
    );
    persistPurchaseSession(createPurchaseSession({
      draftId: purchaseSession.draftId,
      walletAddress: purchaseSession.walletAddress ?? address,
      realAmount: amount,
      picks: purchaseSession.picks.map((pick, index) => ({
        ...pick,
        allocationCents: allocationCents[index],
      })),
    }));
    setRealAmount(amount);
  };

  const previewPrices = async () => {
    if (!address || !eligible || !locationCheck.eligible || !purchaseSession) return;
    setRehearsalState("idle");
    setRehearsalIndex(-1);
    setQuoteState("loading");
    setQuoteError("");

    try {
      persistPurchaseSession(attachPurchaseWallet(purchaseSession, address));
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          amount: realAmount,
          taker: address,
          allocations: selected.map((ticker) => ({ ticker, virtualAmount: virtualAllocations[ticker] })),
        }),
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
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("The USDC approval reverted on Base.");
      setApproved(true);
      setPurchaseState("idle");
    } catch (error) {
      setPurchaseError(error instanceof Error ? error.message : "USDC approval failed.");
      setPurchaseState("error");
    }
  };

  const buyDraft = async () => {
    if (!address || !publicClient || !approved || !purchaseSession) return;
    setPurchaseState("buying");
    setPurchaseError("");
    let active = purchaseSession;
    let activeTicker: string | null = null;

    try {
      await ensureBase();
      active = persistPurchaseSession(attachPurchaseWallet(active, address));

      for (let index = 0; index < active.rows.length; index += 1) {
        const row = active.rows[index];
        if (row.status === "confirmed") continue;
        activeTicker = row.ticker;
        const stock = getStock(row.ticker);
        if (!stock) throw new Error(`${row.ticker} is no longer supported.`);

        let balanceBefore = row.balanceBefore;
        if (balanceBefore === undefined) {
          const balance = await publicClient.readContract({
            address: stock.contractAddress,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [address],
          });
          balanceBefore = balance.toString();
          active = persistPurchaseSession(updatePurchaseRow(active, row.ticker, {
            balanceBefore,
            error: undefined,
          }));
        }

        if (row.txHash) {
          const receipt = await publicClient.waitForTransactionReceipt({ hash: row.txHash as Hex });
          if (receipt.status !== "success") throw new Error(`${row.ticker} reverted on Base.`);
        } else {
        const response = await fetch("/api/firm-quote", {
          method: "POST",
          headers: { "content-type": "application/json" },
            body: JSON.stringify({ ticker: row.ticker, allocationCents: row.allocationCents, taker: address }),
        });
        const result = (await response.json()) as FirmQuote & { error?: string };
          if (!response.ok || !result.transaction) throw new Error(result.error ?? `Could not prepare ${row.ticker}.`);

        const hash = await sendTransactionAsync({
          chainId: base.id,
          to: result.transaction.to,
          data: result.transaction.data,
          value: BigInt(result.transaction.value),
          gas: result.transaction.gas ? BigInt(result.transaction.gas) : undefined,
        });
          active = persistPurchaseSession(updatePurchaseRow(active, row.ticker, {
            status: "submitted",
            txHash: hash,
            error: undefined,
          }));
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          if (receipt.status !== "success") throw new Error(`${row.ticker} reverted on Base.`);
        }

        const balanceAfter = await publicClient.readContract({
          address: stock.contractAddress,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address],
        });
        if (balanceAfter <= BigInt(balanceBefore)) {
          throw new Error(`${row.ticker} confirmed, but its wallet balance did not increase yet. Retry verification before buying anything again.`);
        }

        active = persistPurchaseSession(updatePurchaseRow(active, row.ticker, {
          status: "confirmed",
          balanceAfter: balanceAfter.toString(),
          error: undefined,
        }));
      }
      if (!isPurchaseSessionComplete(active)) throw new Error("Every stock must be balance-verified before this draft can be owned.");
      markPracticeDraftOwned(active.draftId);
      setPurchaseState("complete");
    } catch (error) {
      const message = error instanceof Error ? error.message : "The purchase stopped before completion.";
      if (activeTicker) {
        active = persistPurchaseSession(updatePurchaseRow(active, activeTicker, {
          status: "failed",
          error: message,
        }));
      }
      setPurchaseError(message);
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
                <h1>DRAFT A <em>PORTFOLIO.</em></h1>
              </div>
              <div className="heading-aside">
                <p>Choose three to five companies within your 1,000-credit Squad Budget. Draft costs follow current onchain reference prices.</p>
                <div className="selection-count"><span>{selected.length}</span> PICKED <small>3 MIN · 5 MAX</small></div>
              </div>
            </div>

            <div className="stock-grid">
              {STOCKS.map((stock) => (
                <StockCard
                  key={stock.ticker}
                  stock={stock}
                  selected={selected.includes(stock.ticker)}
                  draftCost={draftMarket.find((item) => item.ticker === stock.ticker)?.draftCost}
                  disabled={marketState !== "live" || (!selected.includes(stock.ticker) && selected.length === MAX_PICKS)}
                  onSelect={() => toggle(stock.ticker)}
                />
              ))}
            </div>
            {marketState !== "live" && <p className="data-notice">{marketState === "loading" ? "LOADING ONCHAIN DRAFT COSTS…" : "TRANSFER MARKET HELD · Fresh Chainlink prices are required to build a team."}</p>}

          </motion.section>
        )}

        {step === "review" && (
          <motion.section key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
            <div className="page-heading">
              <p className="eyebrow hazard">ROUND 02 · VIRTUAL PORTFOLIO</p>
              <h1>CHECK YOUR <em>SQUAD.</em></h1>
              <p className="lede">Each stock costs its current draft price. Your unused credits stay in the Bank and earn no return.</p>
            </div>

            <div className="portfolio-panel">
              <div className="portfolio-total">
                <span className="eyebrow">BANK AFTER DRAFT</span>
                <strong>{allocationRemaining} CR</strong>
                <span className="status-chip"><span /> VIRTUAL</span>
                <p className={`allocation-balance ${allocationRemaining < 0 ? "over" : ""}`}>
                  {allocationRemaining >= 0 ? `${allocationTotal} OF ${VIRTUAL_BUDGET} CREDITS SPENT` : `${Math.abs(allocationRemaining)} CREDITS OVER BUDGET`}
                </p>
              </div>
              <div className="allocation-list">
                {picks.map((stock, index) => (
                  <div key={stock.ticker} className="allocation-row">
                    <span className="allocation-rank">0{index + 1}</span>
                    <span className="allocation-company">{stock.company}<small>{stock.ticker}</small></span>
                    <span className="allocation-bar"><i style={{ width: `${Math.min(100, (virtualAllocations[stock.ticker] ?? 0) / 10)}%`, background: stock.logoColor }} /></span>
                    <strong className="allocation-cost">{virtualAllocations[stock.ticker] ?? 0} CR</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="action-pair review-actions">
              <button className="secondary-action" onClick={() => setStep("select")}>EDIT PICKS</button>
              <button className="secondary-action" disabled={!allocationsValid} onClick={() => void enterOwnership()}>OWN THIS TEAM</button>
              <button className="primary-action" disabled={!allocationsValid} onClick={() => void playForFree()}>{returnTo ? "SAVE TEAM & RETURN" : "SAVE TEAM & PLAY"} <ArrowRight size={18} /></button>
            </div>
            {teamError && <p className="battle-data-error">{teamError}</p>}
          </motion.section>
        )}

        {step === "own" && (
          <motion.section key="own" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="own-layout">
              <div>
                <div className="page-heading compact">
                  <p className="eyebrow hazard">ROUND 03 · OWN YOUR PICKS</p>
                  <h1>OWN YOUR <em>LINEUP.</em></h1>
                  <p className="lede">Buy a miniature version of your fantasy portfolio. The stocks go directly to your wallet.</p>
                  <button className="ownership-edit" disabled={!isPurchaseSessionEditable(purchaseSession)} onClick={editDraft}>
                    {purchaseStarted ? "PURCHASE STARTED · DRAFT LOCKED" : "← EDIT DRAFT"}
                  </button>
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
                      <button
                        key={amount}
                        disabled={purchaseStarted || rehearsalState === "running"}
                        onClick={() => changeRealAmount(amount)}
                        className={realAmount === amount ? "active" : ""}
                      >
                        ${amount}
                      </button>
                    ))}
                  </div>

                  <div className="receive-list">
                    <p className="eyebrow">{quoteState === "ready" ? "LIVE PRICE PREVIEW" : "DOLLAR SPLIT"}</p>
                    {picks.map((stock, index) => (
                      <div key={stock.ticker}>
                        <span><i style={{ background: stock.logoColor }} /> {stock.ticker}</span>
                        <span className="receive-value">
                          <strong>
                            {quotes[index]
                              ? `≈ ${Number(formatUnits(BigInt(quotes[index].buyAmount), B20_DECIMALS)).toLocaleString("en-US", { maximumSignificantDigits: 5 })} ${stock.ticker}`
                              : `$${realSplit[index].toFixed(2)}`}
                          </strong>
                          {purchaseSession?.rows[index] && (
                            <small className={`purchase-row-status ${rehearsalState !== "idle" ? "rehearsed" : purchaseSession.rows[index].status}`}>
                              {rehearsalState === "complete" || (rehearsalState === "running" && index < rehearsalIndex)
                                ? "REHEARSAL CHECKED"
                                : rehearsalState === "running" && index === rehearsalIndex
                                  ? "REHEARSING"
                                  : purchaseSession.rows[index].status === "confirmed"
                                ? "BALANCE VERIFIED"
                                : purchaseSession.rows[index].status === "submitted"
                                  ? "SUBMITTED"
                                  : purchaseSession.rows[index].status === "failed"
                                    ? "RETRY REQUIRED"
                                    : "READY"}
                            </small>
                          )}
                        </span>
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
                  <div className={`location-check ${locationCheck.eligible ? "allowed" : ["idle", "loading"].includes(locationCheck.status) ? "" : "blocked"}`}>
                    <span className="status-dot" />
                    <p>
                      <strong>{["idle", "loading"].includes(locationCheck.status) ? "CHECKING LOCATION" : locationCheck.eligible ? "LOCATION CHECK PASSED" : "PRACTICE ONLY"}</strong>
                      {locationCheck.message}
                    </p>
                  </div>
                  <label className="eligibility-check">
                    <input
                      type="checkbox"
                      checked={eligible}
                      disabled={!locationCheck.eligible}
                      onChange={(event) => setEligible(event.target.checked)}
                    />
                    <span>I confirm I am 18 or older, outside the United States, and permitted to access these tokenized stocks [blockchain tokens that track stock value] where I live.</span>
                  </label>
                  <button
                    className="primary-action full"
                    disabled={!isConnected || !eligible || !locationCheck.eligible || quoteState === "loading" || rehearsalState === "running"}
                    onClick={previewPrices}
                  >
                    {quoteState === "loading" ? <><LoaderCircle className="spin" size={17} /> CHECKING LIVE PRICES</> : quoteState === "ready" ? "REFRESH PRICE PREVIEW" : "PREVIEW LIVE PRICES"}
                  </button>
                  {quoteState === "ready" && quotes.some((quote) => quote.balanceIssue) && (
                    <p className="purchase-message error">This wallet needs at least ${realAmount.toFixed(2)} in USDC on Base.</p>
                  )}
                  {quoteState === "ready" && !quotes.some((quote) => quote.balanceIssue) && !approved && (
                    <button className="purchase-next active" disabled={purchaseState === "approving" || rehearsalState === "running"} onClick={approveDraft}>
                      {purchaseState === "approving" ? "WAITING FOR BASE CONFIRMATION…" : `APPROVE EXACTLY $${realAmount} USDC`}
                    </button>
                  )}
                  {quoteState === "ready" && !quotes.some((quote) => quote.balanceIssue) && approved && purchaseState !== "complete" && (
                    <button className="purchase-next active" disabled={!isConnected || purchaseState === "buying" || rehearsalState === "running"} onClick={buyDraft}>
                      {purchaseState === "buying"
                        ? `VERIFYING STOCK ${Math.min(confirmedCount + 1, picks.length)} OF ${picks.length}…`
                        : purchaseStarted
                          ? `RESUME · ${confirmedCount} OF ${picks.length} VERIFIED`
                          : `BUY MY ${picks.length} STOCKS`}
                    </button>
                  )}
                  {purchaseState === "error" && <p className="purchase-message error">{purchaseError}</p>}
                  {purchaseRehearsalEnabled && purchaseState !== "complete" && (
                    <button
                      className="purchase-rehearsal"
                      disabled={purchaseStarted || rehearsalState === "running"}
                      onClick={() => void rehearsePurchase()}
                    >
                      {rehearsalState === "running"
                        ? `REHEARSING ${Math.min(rehearsalIndex + 1, picks.length)} OF ${picks.length}…`
                        : rehearsalState === "complete"
                          ? "RUN REHEARSAL AGAIN"
                          : "REHEARSE PURCHASE · NO TRANSACTION"}
                    </button>
                  )}
                  {rehearsalState === "complete" && purchaseState !== "complete" && (
                    <div className="purchase-complete purchase-rehearsal-result">
                      <CheckCircle2 size={19} />
                      <div><strong>REHEARSAL COMPLETE · NOT OWNED</strong><span>No funds moved, no wallet transaction was requested, and no ownership was recorded.</span></div>
                    </div>
                  )}
                  {purchaseState === "complete" && (
                    <div className="purchase-complete ownership-reveal">
                      <CheckCircle2 size={19} />
                      <div><strong>YOUR DRAFT IS NOW REAL</strong><span>{picks.length} stock balances verified in your wallet on Base.</span></div>
                    </div>
                  )}
                  {purchaseSession?.rows.some((row) => row.txHash) && (
                    <div className="receipt-list">
                      {purchaseSession.rows.map((row) => row.txHash && (
                        <a key={row.txHash} href={`https://basescan.org/tx/${row.txHash}`} target="_blank" rel="noreferrer">
                          {row.ticker} · {row.status === "confirmed" ? "VERIFIED" : "RECEIPT"} ↗
                        </a>
                      ))}
                    </div>
                  )}
                  <p className="legal-copy">Real purchases are for eligible adults outside the United States. This is not investment advice.</p>
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {step === "select" && (
        <div className="sticky-action">
          <div>
            <p className="eyebrow">YOUR DRAFT</p>
            <strong>{selected.length ? selected.join(" · ") : "NO PICKS YET"}</strong>
          </div>
          <button className="primary-action" disabled={selected.length < MIN_PICKS} onClick={lockDraft}>
            REVIEW SQUAD <ArrowRight size={18} />
          </button>
        </div>
      )}

      {selected.length === 0 && step === "select" && (
        <button className="demo-picks" onClick={() => setSelected(DEFAULT_DRAFT)}>USE DEMO PICKS</button>
      )}
    </div>
  );
}
