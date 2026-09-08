import { NextResponse } from "next/server";
import { isAddress } from "viem";

import { getStock } from "@/lib/stocks";
import { allocateByWeight, VIRTUAL_BUDGET } from "@/lib/allocations";
import { getPurchaseEligibilityFailure } from "@/lib/eligibility";

const BASE_CHAIN_ID = 8453;
const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const ALLOWED_TOTALS = new Set([5, 10, 25]);

type QuoteRequest = {
  amount?: unknown;
  taker?: unknown;
  allocations?: unknown;
};

type RequestedAllocation = { ticker: string; virtualAmount: number };

export async function POST(request: Request) {
  let body: QuoteRequest;

  try {
    body = (await request.json()) as QuoteRequest;
  } catch {
    return NextResponse.json({ error: "The quote request is not valid JSON." }, { status: 400 });
  }

  const { amount, taker, allocations: requestedAllocations } = body;
  const allocations = Array.isArray(requestedAllocations) ? requestedAllocations : [];

  if (!ALLOWED_TOTALS.has(Number(amount))) {
    return NextResponse.json({ error: "Choose a $5, $10, or $25 draft." }, { status: 400 });
  }

  if (typeof taker !== "string" || !isAddress(taker)) {
    return NextResponse.json({ error: "Connect a valid wallet before requesting prices." }, { status: 400 });
  }

  const eligibilityFailure = getPurchaseEligibilityFailure(request);
  if (eligibilityFailure) return NextResponse.json(eligibilityFailure, { status: 403 });

  const validAllocations = allocations.every((allocation): allocation is RequestedAllocation => {
    if (!allocation || typeof allocation !== "object") return false;
    const entry = allocation as Record<string, unknown>;
    return typeof entry.ticker === "string"
      && Boolean(getStock(entry.ticker))
      && Number.isInteger(entry.virtualAmount)
      && Number(entry.virtualAmount) > 0;
  });
  const tickers = validAllocations ? allocations.map((allocation) => allocation.ticker) : [];
  const uniqueTickers = new Set(tickers);
  const virtualTotal = validAllocations
    ? allocations.reduce((total, allocation) => total + allocation.virtualAmount, 0)
    : 0;

  if (!validAllocations || allocations.length < 3 || allocations.length > 5 || uniqueTickers.size !== allocations.length) {
    return NextResponse.json({ error: "A quote requires three to five unique supported stocks." }, { status: 400 });
  }

  if (virtualTotal !== VIRTUAL_BUDGET) {
    return NextResponse.json({ error: "Allocate the full virtual $100,000 before requesting prices." }, { status: 400 });
  }

  const apiKey = process.env.ZEROX_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Live pricing is not configured yet. Add ZEROX_API_KEY to the server environment." },
      { status: 503 },
    );
  }

  const purchaseCents = allocateByWeight(
    allocations.map((allocation) => allocation.virtualAmount),
    Number(amount) * 100,
  );

  try {
    const quotes = await Promise.all(
      allocations.map(async ({ ticker }, index) => {
        const stock = getStock(ticker);
        if (!stock) throw new Error("Unsupported stock");

        const query = new URLSearchParams({
          chainId: String(BASE_CHAIN_ID),
          sellToken: BASE_USDC,
          buyToken: stock.contractAddress,
          sellAmount: String(purchaseCents[index] * 10_000),
          taker,
        });
        const response = await fetch(`https://api.0x.org/swap/allowance-holder/price?${query}`, {
          headers: { "0x-api-key": apiKey, "0x-version": "v2" },
          cache: "no-store",
        });
        const result = (await response.json()) as Record<string, unknown>;

        if (!response.ok) {
          const reason = typeof result.message === "string"
            ? result.message
            : typeof result.reason === "string"
              ? result.reason
              : `Pricing failed for ${ticker}.`;
          throw new Error(reason);
        }

        const issues = result.issues as {
          allowance?: { spender?: unknown } | null;
          balance?: unknown;
        } | undefined;

        return {
          ticker,
          company: stock.company,
          allocationUsd: purchaseCents[index] / 100,
          buyAmount: String(result.buyAmount ?? "0"),
          buyToken: stock.contractAddress,
          liquidityAvailable: result.liquidityAvailable !== false,
          allowanceSpender: typeof issues?.allowance?.spender === "string" ? issues.allowance.spender : null,
          balanceIssue: Boolean(issues?.balance),
        };
      }),
    );

    return NextResponse.json({
      kind: "indicative",
      expiresInSeconds: 30,
      chainId: BASE_CHAIN_ID,
      sellToken: BASE_USDC,
      quotes,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Live pricing is temporarily unavailable.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
