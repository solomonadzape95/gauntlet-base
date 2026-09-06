export type Stock = {
  ticker: string;
  company: string;
  sector: string;
  tone: string;
};

/**
 * Display data only. Contract addresses will be added from the official Base
 * stock directory after the mainnet integration spike. No transaction code
 * may resolve a token from this presentation list.
 */
export const STOCKS: Stock[] = [
  { ticker: "NVDAc", company: "NVIDIA", sector: "AI COMPUTE", tone: "#b8ff62" },
  { ticker: "AAPLc", company: "Apple", sector: "CONSUMER TECH", tone: "#f0f0e8" },
  { ticker: "TSLAc", company: "Tesla", sector: "MOBILITY", tone: "#ff6b4a" },
  { ticker: "MSFTc", company: "Microsoft", sector: "CLOUD", tone: "#55c7ff" },
  { ticker: "GOOGLc", company: "Alphabet", sector: "INTERNET", tone: "#ffd84d" },
  { ticker: "AMZNc", company: "Amazon", sector: "COMMERCE", tone: "#ffad43" },
  { ticker: "METAc", company: "Meta", sector: "SOCIAL", tone: "#638cff" },
  { ticker: "MSTRc", company: "Strategy", sector: "TREASURY", tone: "#d59bff" },
  { ticker: "SNDKc", company: "SanDisk", sector: "STORAGE", tone: "#f27bb2" },
  { ticker: "SPCXc", company: "SpaceX", sector: "SPACE", tone: "#b8bec8" },
];

export const DEFAULT_DRAFT = ["NVDAc", "AAPLc", "TSLAc"];

export function getStock(ticker: string) {
  return STOCKS.find((stock) => stock.ticker === ticker);
}
