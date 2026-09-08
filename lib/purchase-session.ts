export type PurchasePick = {
  ticker: string;
  virtualAmount: number;
  allocationCents: number;
};

export type PurchaseRowStatus = "ready" | "submitted" | "confirmed" | "failed";

export type PurchaseRow = {
  ticker: string;
  allocationCents: number;
  status: PurchaseRowStatus;
  balanceBefore?: string;
  balanceAfter?: string;
  txHash?: string;
  error?: string;
};

export type PurchaseSession = {
  version: 1;
  draftId: string;
  walletAddress: string | null;
  realAmount: number;
  picks: PurchasePick[];
  rows: PurchaseRow[];
  updatedAt: string;
};

export const PURCHASE_SESSION_KEY = "gauntlet.purchase-session.v1";

type CreatePurchaseSessionInput = {
  draftId: string;
  walletAddress?: string;
  realAmount: number;
  picks: PurchasePick[];
};

export function createPurchaseSession(input: CreatePurchaseSessionInput): PurchaseSession {
  return {
    version: 1,
    draftId: input.draftId,
    walletAddress: input.walletAddress?.toLowerCase() ?? null,
    realAmount: input.realAmount,
    picks: input.picks.map((pick) => ({ ...pick })),
    rows: input.picks.map(({ ticker, allocationCents }) => ({
      ticker,
      allocationCents,
      status: "ready",
    })),
    updatedAt: new Date().toISOString(),
  };
}

export function parsePurchaseSessionSnapshot(snapshot: string | null): PurchaseSession | null {
  if (!snapshot) return null;

  try {
    const value = JSON.parse(snapshot) as unknown;
    if (!isPurchaseSession(value)) return null;
    return value;
  } catch {
    return null;
  }
}

export function readPurchaseSession(): PurchaseSession | null {
  if (typeof window === "undefined") return null;
  return parsePurchaseSessionSnapshot(window.localStorage.getItem(PURCHASE_SESSION_KEY));
}

export function savePurchaseSession(session: PurchaseSession): PurchaseSession {
  const next = { ...session, updatedAt: new Date().toISOString() };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(PURCHASE_SESSION_KEY, JSON.stringify(next));
  }
  return next;
}

export function clearPurchaseSession() {
  if (typeof window !== "undefined") window.localStorage.removeItem(PURCHASE_SESSION_KEY);
}

export function updatePurchaseRow(
  session: PurchaseSession,
  ticker: string,
  patch: Partial<Omit<PurchaseRow, "ticker" | "allocationCents">>,
): PurchaseSession {
  return {
    ...session,
    rows: session.rows.map((row) => row.ticker === ticker ? { ...row, ...patch } : row),
  };
}

export function attachPurchaseWallet(session: PurchaseSession, walletAddress: string): PurchaseSession {
  const nextAddress = walletAddress.toLowerCase();
  const walletLocked = session.rows.some((row) => row.txHash || row.status === "confirmed");

  if (session.walletAddress && session.walletAddress !== nextAddress && walletLocked) {
    throw new Error("Reconnect the wallet that started this purchase before continuing.");
  }

  return { ...session, walletAddress: nextAddress };
}

export function isPurchaseSessionComplete(session: PurchaseSession | null): boolean {
  return Boolean(session?.rows.length && session.rows.every((row) => (
    row.status === "confirmed"
      && Boolean(row.txHash)
      && row.balanceBefore !== undefined
      && row.balanceAfter !== undefined
      && BigInt(row.balanceAfter) > BigInt(row.balanceBefore)
  )));
}

export function confirmedPurchaseCount(session: PurchaseSession | null): number {
  return session?.rows.filter((row) => row.status === "confirmed").length ?? 0;
}

export function isPurchaseSessionEditable(session: PurchaseSession | null): boolean {
  return Boolean(session && session.rows.every((row) => row.status === "ready" && !row.txHash));
}

function isPurchaseSession(value: unknown): value is PurchaseSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<PurchaseSession>;

  if (
    session.version !== 1
    || typeof session.draftId !== "string"
    || (session.walletAddress !== null && typeof session.walletAddress !== "string")
    || ![5, 10, 25].includes(Number(session.realAmount))
    || !Array.isArray(session.picks)
    || !Array.isArray(session.rows)
    || typeof session.updatedAt !== "string"
    || session.picks.length < 3
    || session.picks.length > 5
    || session.rows.length !== session.picks.length
  ) return false;

  const tickers = new Set<string>();
  const validPicks = session.picks.every((pick) => {
    if (!pick || typeof pick !== "object") return false;
    if (
      typeof pick.ticker !== "string"
      || !Number.isInteger(pick.virtualAmount)
      || pick.virtualAmount <= 0
      || !Number.isInteger(pick.allocationCents)
      || pick.allocationCents <= 0
    ) return false;
    tickers.add(pick.ticker);
    return true;
  });

  if (!validPicks || tickers.size !== session.picks.length) return false;

  return session.rows.every((row) => {
    if (!row || typeof row !== "object") return false;
    if (
      typeof row.ticker !== "string"
      || !tickers.has(row.ticker)
      || !Number.isInteger(row.allocationCents)
      || row.allocationCents <= 0
      || !["ready", "submitted", "confirmed", "failed"].includes(row.status)
    ) return false;

    for (const balance of [row.balanceBefore, row.balanceAfter]) {
      if (balance !== undefined && !/^\d+$/.test(balance)) return false;
    }

    return row.txHash === undefined || /^0x[0-9a-fA-F]{64}$/.test(row.txHash);
  });
}
