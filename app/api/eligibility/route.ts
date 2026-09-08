import { NextResponse } from "next/server";

import { eligibilityMessage, getRequestEligibility } from "@/lib/eligibility";

export async function GET(request: Request) {
  const eligibility = getRequestEligibility(request);
  return NextResponse.json({
    ...eligibility,
    message: eligibilityMessage(eligibility),
  }, {
    headers: { "cache-control": "private, no-store" },
  });
}
