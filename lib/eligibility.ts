export type EligibilityReason = "eligible" | "us_blocked" | "location_unknown";

export type PurchaseEligibility = {
  country: string | null;
  eligible: boolean;
  reason: EligibilityReason;
};

type EligibilityInput = {
  country?: string | null;
  developmentCountry?: string | null;
  production: boolean;
};

export function evaluatePurchaseEligibility(input: EligibilityInput): PurchaseEligibility {
  const headerCountry = normalizeCountry(input.country);
  const developmentCountry = input.production ? null : normalizeCountry(input.developmentCountry);
  const country = headerCountry ?? developmentCountry;

  if (!country) return { country: null, eligible: false, reason: "location_unknown" };
  if (country === "US") return { country, eligible: false, reason: "us_blocked" };
  return { country, eligible: true, reason: "eligible" };
}

export function getRequestEligibility(request: Request): PurchaseEligibility {
  return evaluatePurchaseEligibility({
    country: request.headers.get("x-vercel-ip-country"),
    developmentCountry: process.env.GAUNTLET_DEV_COUNTRY,
    production: process.env.NODE_ENV === "production",
  });
}

export function getPurchaseEligibilityFailure(request: Request) {
  const eligibility = getRequestEligibility(request);
  return eligibility.eligible ? null : {
    error: eligibilityMessage(eligibility),
    code: eligibility.reason,
  };
}

export function eligibilityMessage(eligibility: PurchaseEligibility): string {
  if (eligibility.reason === "us_blocked") {
    return "Tokenized stock purchases are not available to US residents yet. Practice mode remains open.";
  }
  if (eligibility.reason === "location_unknown") {
    return "We could not verify an eligible location for this purchase. Practice mode remains open.";
  }
  return `Location check passed${eligibility.country ? ` for ${eligibility.country}` : ""}.`;
}

function normalizeCountry(value?: string | null): string | null {
  const normalized = value?.trim().toUpperCase();
  return normalized && /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}
