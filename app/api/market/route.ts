import { NextResponse } from "next/server";

import { readChainlinkPrices } from "@/lib/chainlink-market";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const prices = await readChainlinkPrices();
    if (!prices.length) throw new Error("No feeds returned a valid round.");
    return NextResponse.json(
      { prices, source: "Chainlink total-return feeds on Base", fetchedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30" } },
    );
  } catch (cause) {
    console.error("Chainlink market read failed", cause);
    return NextResponse.json({ error: "Live Base market data is temporarily unavailable." }, { status: 503 });
  }
}
