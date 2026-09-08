import { allocateByWeight, makeEvenAllocations, VIRTUAL_BUDGET } from "./allocations.ts";
import { DEFAULT_DRAFT } from "./stocks.ts";

export type DraftPick = { ticker: string; virtualAmount: number };

export type PracticeDraft = {
  id: string;
  createdAt: string;
  status: "virtual" | "owned";
  picks: DraftPick[];
};

export type MarketQuote = {
  ticker: string;
  price: number;
  change: number;
};

export const MARKET_QUOTES: MarketQuote[] = [
  { ticker: "NVDAc", price: 172.14, change: 1.82 },
  { ticker: "AAPLc", price: 234.41, change: -0.34 },
  { ticker: "TSLAc", price: 418.62, change: 2.14 },
  { ticker: "MSFTc", price: 507.09, change: 0.71 },
  { ticker: "GOOGLc", price: 212.18, change: 0.42 },
  { ticker: "AMZNc", price: 225.73, change: -0.18 },
  { ticker: "METAc", price: 738.86, change: 1.04 },
  { ticker: "MSTRc", price: 338.20, change: -1.28 },
  { ticker: "SNDKc", price: 91.44, change: 0.63 },
  { ticker: "SPCXc", price: 312.70, change: 0.28 },
];

const STORAGE_KEY = "gauntlet.practice-drafts.v1";

export function defaultPracticeDraft(): PracticeDraft {
  const allocations = makeEvenAllocations(DEFAULT_DRAFT);
  return {
    id: "demo-draft",
    createdAt: new Date(0).toISOString(),
    status: "virtual",
    picks: DEFAULT_DRAFT.map((ticker) => ({ ticker, virtualAmount: allocations[ticker] })),
  };
}

export function readPracticeDrafts(): PracticeDraft[] {
  return parsePracticeDraftSnapshot(getPracticeDraftSnapshot());
}

export function getPracticeDraftSnapshot() {
  if (typeof window === "undefined") return "[]";
  return window.localStorage.getItem(STORAGE_KEY) ?? "[]";
}

export function parsePracticeDraftSnapshot(snapshot: string): PracticeDraft[] {
  try {
    const parsed = JSON.parse(snapshot) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPracticeDraft).map(normalizeLegacyDraft);
  } catch {
    return [];
  }
}

function normalizeLegacyDraft(draft: PracticeDraft): PracticeDraft {
  const total = draft.picks.reduce((sum, pick) => sum + pick.virtualAmount, 0);
  if (total !== 100_000) return draft;
  const allocations = allocateByWeight(draft.picks.map((pick) => pick.virtualAmount), VIRTUAL_BUDGET);
  return { ...draft, picks: draft.picks.map((pick, index) => ({ ...pick, virtualAmount: allocations[index] })) };
}

export function savePracticeDraft(picks: DraftPick[]) {
  const draft: PracticeDraft = {
    id: `draft-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    status: "virtual",
    picks,
  };
  const drafts = [draft, ...readPracticeDrafts()].slice(0, 12);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  window.dispatchEvent(new Event("gauntlet:drafts-changed"));
  return draft;
}

export function markPracticeDraftOwned(draftId: string) {
  const drafts = readPracticeDrafts();
  const next = drafts.map((draft) => draft.id === draftId ? { ...draft, status: "owned" as const } : draft);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("gauntlet:drafts-changed"));
  }
}

export function scoreDraft(draft: PracticeDraft) {
  return draft.picks.reduce((score, pick) => {
    const quote = MARKET_QUOTES.find((item) => item.ticker === pick.ticker);
    return score + (quote?.change ?? 0) * (pick.virtualAmount / VIRTUAL_BUDGET);
  }, 0);
}

function isPracticeDraft(value: unknown): value is PracticeDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<PracticeDraft>;
  return typeof draft.id === "string"
    && typeof draft.createdAt === "string"
    && (draft.status === "virtual" || draft.status === "owned")
    && Array.isArray(draft.picks)
    && draft.picks.every((pick) => typeof pick?.ticker === "string" && Number.isFinite(pick.virtualAmount));
}
