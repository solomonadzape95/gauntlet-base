import { NextRequest, NextResponse } from "next/server";

import { settleExpiredBattles } from "@/lib/battle-lifecycle";
import { tickGameWeeks } from "@/lib/game-week-lifecycle";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const secret = process.env.GAME_WEEK_CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Game Week persistence is not configured." }, { status: 503 });
  try {
    const [gameWeeks, settledBattles] = await Promise.all([tickGameWeeks(supabase), settleExpiredBattles(supabase)]);
    return NextResponse.json({ ...gameWeeks, settledBattles });
  } catch (cause) {
    console.error("Could not advance Game Week lifecycle", cause);
    return NextResponse.json({ error: cause instanceof Error ? cause.message : "Could not advance Game Week lifecycle." }, { status: 503 });
  }
}
