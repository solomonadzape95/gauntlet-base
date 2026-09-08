import { NextResponse } from "next/server";
import { isAddress, isHex } from "viem";

import { getStock } from "@/lib/stocks";
import { eligibilityMessage, getRequestEligibility } from "@/lib/eligibility";

const BASE_CHAIN_ID = 8453;
const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

type FirmQuoteRequest = {
  allocationCents?: unknown;
  taker?: unknown;
  ticker?: unknown;
};

export async function POST(request: Request) {
  let body: FirmQuoteRequest;

  try {
    body = (await request.json()) as FirmQuoteRequest;
  } catch {
    return NextResponse.json({ error: "The purchase request is not valid JSON." }, { status: 400 });
  }

  const stock = typeof body.ticker === "string" ? getStock(body.ticker) : undefined;
  const allocationCents = Number(body.allocationCents);
  const taker = body.taker;

  if (!stock) return NextResponse.json({ error: "That stock is not supported." }, { status: 400 });
  if (!Number.isInteger(allocationCents) || allocationCents < 1 || allocationCents > 2_500) {
    return NextResponse.json({ error: "The stock allocation is outside the allowed range." }, { status: 400 });
  }
  if (typeof taker !== "string" || !isAddress(taker)) {
    return NextResponse.json({ error: "Connect a valid wallet before preparing a purchase." }, { status: 400 });
  }

  const eligibility = getRequestEligibility(request);
  if (!eligibility.eligible) {
    return NextResponse.json(
      { error: eligibilityMessage(eligibility), code: eligibility.reason },
      { status: 403 },
    );
  }

  const apiKey = process.env.ZEROX_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Live purchasing is not configured yet." }, { status: 503 });
  }

  const query = new URLSearchParams({
    chainId: String(BASE_CHAIN_ID),
    sellToken: BASE_USDC,
    buyToken: stock.contractAddress,
    sellAmount: String(allocationCents * 10_000),
    taker,
    slippageBps: "100",
  });

  try {
    const response = await fetch(`https://api.0x.org/swap/allowance-holder/quote?${query}`, {
      headers: { "0x-api-key": apiKey, "0x-version": "v2" },
      cache: "no-store",
    });
    const result = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      const reason = typeof result.message === "string"
        ? result.message
        : typeof result.reason === "string"
          ? result.reason
          : `Could not prepare ${stock.ticker}.`;
      return NextResponse.json({ error: reason }, { status: response.status });
    }

    const issues = result.issues as { allowance?: unknown; balance?: unknown } | undefined;
    if (issues?.balance) {
      return NextResponse.json({ error: "This wallet does not have enough USDC for the purchase." }, { status: 409 });
    }
    if (issues?.allowance) {
      return NextResponse.json({ error: "The USDC approval has not reached Base yet. Wait a moment and try again." }, { status: 409 });
    }

    const transaction = result.transaction as Record<string, unknown> | undefined;
    const to = transaction?.to;
    const data = transaction?.data;
    const value = transaction?.value;

    if (typeof to !== "string" || !isAddress(to) || typeof data !== "string" || !isHex(data)) {
      return NextResponse.json({ error: "The pricing service returned an invalid transaction." }, { status: 502 });
    }

    return NextResponse.json({
      ticker: stock.ticker,
      buyAmount: String(result.buyAmount ?? "0"),
      sellAmount: String(result.sellAmount ?? allocationCents * 10_000),
      transaction: {
        to,
        data,
        value: typeof value === "string" ? value : "0",
        gas: typeof transaction?.gas === "string" ? transaction.gas : undefined,
      },
    });
  } catch {
    return NextResponse.json({ error: "Live purchasing is temporarily unavailable." }, { status: 502 });
  }
}
