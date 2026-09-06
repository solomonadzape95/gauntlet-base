import { NextResponse } from "next/server";
import { isAddress } from "viem";

import { getStock } from "@/lib/stocks";

const BASE_CHAIN_ID = 8453;
const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const ALLOWED_TOTALS = new Set([5, 10, 25]);

type QuoteRequest = {
  amount?: unknown;
  taker?: unknown;
  tickers?: unknown;
};

function splitIntoCents(amount: number, count: number) {
  const totalCents = amount * 100;
  const equalCents = Math.floor(totalCents / count);
  const remainder = totalCents - equalCents * count;

  return Array.from({ length: count }, (_, index) => equalCents + (index < remainder ? 1 : 0));
}

export async function POST(request: Request) {
  let body: QuoteRequest;

  try {
    body = (await request.json()) as QuoteRequest;
  } catch {
    return NextResponse.json({ error: "The quote request is not valid JSON." }, { status: 400 });
  }

  const { amount, taker, tickers } = body;
  const uniqueTickers = Array.isArray(tickers) ? [...new Set(tickers)] : [];

  if (!ALLOWED_TOTALS.has(Number(amount))) {
    return NextResponse.json({ error: "Choose a $5, $10, or $25 draft." }, { status: 400 });
  }

  if (typeof taker !== "string" || !isAddress(taker)) {
    return NextResponse.json({ error: "Connect a valid wallet before requesting prices." }, { status: 400 });
  }

  if (uniqueTickers.length !== 3 || uniqueTickers.some((ticker) => typeof ticker !== "string" || !getStock(ticker))) {
    return NextResponse.json({ error: "A quote requires exactly three supported stocks." }, { status: 400 });
  }

  const apiKey = process.env.ZEROX_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Live pricing is not configured yet. Add ZEROX_API_KEY to the server environment." },
      { status: 503 },
    );
  }

  const allocations = splitIntoCents(Number(amount), uniqueTickers.length);

  try {
    const quotes = await Promise.all(
      uniqueTickers.map(async (ticker, index) => {
        const stock = getStock(String(ticker));
        if (!stock) throw new Error("Unsupported stock");

        const query = new URLSearchParams({
          chainId: String(BASE_CHAIN_ID),
          sellToken: BASE_USDC,
          buyToken: stock.contractAddress,
          sellAmount: String(allocations[index] * 10_000),
          taker,
        });
        const response = await fetch(`https://api.0x.org/swap/allowance-holder/price?${query}`, {
          headers: { "0x-api-key": apiKey, "0x-version": "v2" },
          cache: "no-store",
        });
        const result = (await response.json()) as Record<string, unknown>;

        if (!response.ok) {
          const reason = typeof result.reason === "string" ? result.reason : `Pricing failed for ${ticker}.`;
          throw new Error(reason);
        }

        return {
          ticker,
          company: stock.company,
          allocationUsd: allocations[index] / 100,
          buyAmount: String(result.buyAmount ?? "0"),
          buyToken: stock.contractAddress,
          liquidityAvailable: result.liquidityAvailable !== false,
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
