export type Stock = {
  ticker: string;
  company: string;
  sector: string;
  tone: string;
  contractAddress: `0x${string}`;
};

/**
 * Token addresses are copied from the official Base stock directory. A quote
 * route must still validate against this closed list before creating a trade.
 */
export const STOCKS: Stock[] = [
  { ticker: "NVDAc", company: "NVIDIA", sector: "AI COMPUTE", tone: "#b8ff62", contractAddress: "0xb20000000000000000000078ee7ce2fE4908108C" },
  { ticker: "AAPLc", company: "Apple", sector: "CONSUMER TECH", tone: "#f0f0e8", contractAddress: "0xb200000000000000000000C2e324d24d7eEcd1fb" },
  { ticker: "TSLAc", company: "Tesla", sector: "MOBILITY", tone: "#ff6b4a", contractAddress: "0xb2000000000000000000001e800a7f5189430cD0" },
  { ticker: "MSFTc", company: "Microsoft", sector: "CLOUD", tone: "#55c7ff", contractAddress: "0xB200000000000000000000Ab99cFa739E253872B" },
  { ticker: "GOOGLc", company: "Alphabet", sector: "INTERNET", tone: "#ffd84d", contractAddress: "0xb2000000000000000000002D0BA3164cc74f58B7" },
  { ticker: "AMZNc", company: "Amazon", sector: "COMMERCE", tone: "#ffad43", contractAddress: "0xb200000000000000000000d9192b6B456483C2E8" },
  { ticker: "METAc", company: "Meta", sector: "SOCIAL", tone: "#638cff", contractAddress: "0xb2000000000000000000008bC8786B856E61707C" },
  { ticker: "MSTRc", company: "Strategy", sector: "TREASURY", tone: "#d59bff", contractAddress: "0xb2000000000000000000004884b426556b92883d" },
  { ticker: "SNDKc", company: "SanDisk", sector: "STORAGE", tone: "#f27bb2", contractAddress: "0xb200000000000000000000397293Cb8cda9a10c5" },
  { ticker: "SPCXc", company: "SpaceX", sector: "SPACE", tone: "#b8bec8", contractAddress: "0xb2000000000000000000007b9fcbd005511aCBd5" },
];

export const DEFAULT_DRAFT = ["NVDAc", "AAPLc", "TSLAc"];

// Verified against each token's decimals() function on Base mainnet.
export const B20_DECIMALS = 8;

export function getStock(ticker: string) {
  return STOCKS.find((stock) => stock.ticker === ticker);
}
