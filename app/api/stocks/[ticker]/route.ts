import { NextResponse } from "next/server";

import { readChainlinkPrices } from "@/lib/chainlink-market";
import { createDraftMarket } from "@/lib/fantasy-market";
import { readGameWeekTimeline } from "@/lib/game-week-snapshots";
import { buildStockTrace } from "@/lib/stock-detail";
import { getStock } from "@/lib/stocks";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type GameWeek = {
  id: string;
  label: string;
  status: "upcoming" | "active" | "complete";
  starts_at: string;
  ends_at: string;
};

export async function GET(_request: Request, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const stock = getStock(decodeURIComponent(ticker));
  if (!stock) return NextResponse.json({ error: "That stock is not supported." }, { status: 404 });

  const supabase = getSupabaseAdmin();
  const quotePromise = readChainlinkPrices()
    .then((prices) => createDraftMarket(prices).find((item) => item.ticker === stock.ticker) ?? null)
    .catch(() => null);
  const gameWeekPromise = (async () => {
    let week: GameWeek | null = null;
    let trace = buildStockTrace(stock.ticker, []);
    if (!supabase) return { week, trace };
    const weeks = await supabase.from("game_weeks")
      .select("id,label,status,starts_at,ends_at")
      .order("starts_at", { ascending: false })
      .limit(6)
      .returns<GameWeek[]>();
    week = weeks.data?.find((item) => item.status === "active")
      ?? weeks.data?.find((item) => item.status === "upcoming")
      ?? weeks.data?.[0]
      ?? null;
    if (week) trace = buildStockTrace(stock.ticker, await readGameWeekTimeline(supabase, week.id, 160));
    return { week, trace };
  })();
  const [quote, gameWeek] = await Promise.all([quotePromise, gameWeekPromise]);
  const { week, trace } = gameWeek;

  return NextResponse.json({
    stock,
    quote,
    gameWeek: week ? { label: week.label, status: week.status, startsAt: week.starts_at, endsAt: week.ends_at } : null,
    trace,
    proof: {
      chain: "Base",
      chainId: 8453,
      priceSource: "Chainlink B20 total-return feed",
      tokenExplorerUrl: `https://basescan.org/token/${stock.contractAddress}`,
      feedExplorerUrl: `https://basescan.org/address/${stock.priceFeedAddress}`,
    },
  }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30" } });
}
