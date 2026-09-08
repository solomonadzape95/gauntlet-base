import { NextResponse } from "next/server";

import { EMPTY_IMPACT, type ImpactLedgerRow } from "@/lib/impact";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json(EMPTY_IMPACT, { headers: { "Cache-Control": "no-store" } });

  const [purchases, drafts, battles, wallets, ledger] = await Promise.all([
    supabase.from("purchase_attempts").select("id", { count: "exact", head: true }).eq("status", "confirmed").not("transaction_hash", "is", null),
    supabase.from("drafts").select("id", { count: "exact", head: true }).eq("status", "owned"),
    supabase.from("battles").select("id", { count: "exact", head: true }).eq("ownership_status", "owned"),
    supabase.from("drafts").select("wallet_address").eq("status", "owned").not("wallet_address", "is", null),
    supabase.from("purchase_attempts").select("ticker,transaction_hash,updated_at").eq("status", "confirmed").not("transaction_hash", "is", null).order("updated_at", { ascending: false }).limit(20),
  ]);
  const error = purchases.error ?? drafts.error ?? battles.error ?? wallets.error ?? ledger.error;
  if (error) {
    console.error("Impact aggregate read failed", error);
    return NextResponse.json({ ...EMPTY_IMPACT, configured: true }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const walletCount = new Set((wallets.data ?? []).map((row) => row.wallet_address?.toLowerCase()).filter(Boolean)).size;
  const rows: ImpactLedgerRow[] = (ledger.data ?? []).flatMap((row) => (
    typeof row.transaction_hash === "string" && typeof row.updated_at === "string"
      ? [{ ticker: row.ticker, transactionHash: row.transaction_hash, confirmedAt: row.updated_at }]
      : []
  ));
  return NextResponse.json({
    configured: true,
    healthy: true,
    lastIndexedAt: rows[0]?.confirmedAt ?? null,
    newB20Wallets: walletCount,
    confirmedPurchases: purchases.count ?? 0,
    ownedDrafts: drafts.count ?? 0,
    ownedBattles: battles.count ?? 0,
    ledger: rows,
  }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
}
