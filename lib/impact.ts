export type ImpactLedgerRow = {
  ticker: string;
  transactionHash: string;
  confirmedAt: string;
};

export type ImpactSnapshot = {
  configured: boolean;
  healthy: boolean;
  lastIndexedAt: string | null;
  newB20Wallets: number;
  confirmedPurchases: number;
  ownedDrafts: number;
  ownedBattles: number;
  ledger: ImpactLedgerRow[];
};

export const EMPTY_IMPACT: ImpactSnapshot = {
  configured: false,
  healthy: false,
  lastIndexedAt: null,
  newB20Wallets: 0,
  confirmedPurchases: 0,
  ownedDrafts: 0,
  ownedBattles: 0,
  ledger: [],
};
