import { NextRequest, NextResponse } from "next/server";

import { settleExpiredBattles } from "@/lib/battle-lifecycle";
import { getCronSecret, isAuthorizedCronRequest } from "@/lib/cron-auth";
import { tickGameWeeks } from "@/lib/game-week-lifecycle";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

async function runTick(request: NextRequest) {
  const secret = getCronSecret(process.env);
  if (!isAuthorizedCronRequest(request.headers.get("authorization"), secret)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Game Week persistence is not configured." }, { status: 503 });
  try {
    const [gameWeeks, settledBattles] = await Promise.all([tickGameWeeks(supabase), settleExpiredBattles(supabase)]);
    return NextResponse.json({ ...gameWeeks, settledBattles });
  } catch (cause) {
    console.error("Could not advance Game Week lifecycle", cause);
    return NextResponse.json({ error: "Could not advance Game Week lifecycle." }, { status: 503 });
  }
}

export const GET = runTick;
export const POST = runTick;
