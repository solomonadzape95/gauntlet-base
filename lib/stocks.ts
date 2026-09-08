export type Stock = {
  ticker: string;
  company: string;
  sector: string;
  tone: string;
  logoColor: string;
  contractAddress: `0x${string}`;
  priceFeedAddress: `0x${string}`;
};

/**
 * Token addresses are copied from the official Base stock directory. A quote
 * route must still validate against this closed list before creating a trade.
 */
export const STOCKS: Stock[] = [
  { ticker: "NVDAc", company: "NVIDIA", sector: "AI COMPUTE", tone: "#76b900", logoColor: "#76b900", contractAddress: "0xb20000000000000000000078ee7ce2fE4908108C", priceFeedAddress: "0x04689a41629776563E6822F76f2e57D148d28513" },
  { ticker: "AAPLc", company: "Apple", sector: "CONSUMER TECH", tone: "#a2aaad", logoColor: "#f5f5f7", contractAddress: "0xb200000000000000000000C2e324d24d7eEcd1fb", priceFeedAddress: "0x787f13dEa48Db0897CbCDD985de77809D837F988" },
  { ticker: "TSLAc", company: "Tesla", sector: "MOBILITY", tone: "#e82127", logoColor: "#e82127", contractAddress: "0xb2000000000000000000001e800a7f5189430cD0", priceFeedAddress: "0xFaf869185383a24F8cb00e27BdA6b63B9905DCb4" },
  { ticker: "MSFTc", company: "Microsoft", sector: "CLOUD", tone: "#00a4ef", logoColor: "#00a4ef", contractAddress: "0xB200000000000000000000Ab99cFa739E253872B", priceFeedAddress: "0xeB10A6c9aa7E537aEd766C08c35Dae35B321b18c" },
  { ticker: "GOOGLc", company: "Alphabet", sector: "INTERNET", tone: "#4285f4", logoColor: "#4285f4", contractAddress: "0xb2000000000000000000002D0BA3164cc74f58B7", priceFeedAddress: "0x5bF49E0ffA937CE2FfF033c739aD7C634c4D34F2" },
  { ticker: "AMZNc", company: "Amazon", sector: "COMMERCE", tone: "#ff9900", logoColor: "#ff9900", contractAddress: "0xb200000000000000000000d9192b6B456483C2E8", priceFeedAddress: "0x06A8E4b3aBB3B7543d8396FB2B763d22820cB295" },
  { ticker: "METAc", company: "Meta", sector: "SOCIAL", tone: "#0866ff", logoColor: "#0866ff", contractAddress: "0xb2000000000000000000008bC8786B856E61707C", priceFeedAddress: "0x6526aE6797A76123638b863AeE4dD27Ba4E4b27D" },
  { ticker: "MSTRc", company: "Strategy", sector: "TREASURY", tone: "#e21b2d", logoColor: "#e21b2d", contractAddress: "0xb2000000000000000000004884b426556b92883d", priceFeedAddress: "0xB3cE282CD188b35DA0E38D8Bc7d58e33173D202a" },
  { ticker: "SNDKc", company: "SanDisk", sector: "STORAGE", tone: "#ed1c24", logoColor: "#ed1c24", contractAddress: "0xb200000000000000000000397293Cb8cda9a10c5", priceFeedAddress: "0x388b0dC46C0Fb05A74BeE0994fa5b02c6Fcca2eA" },
  { ticker: "SPCXc", company: "SpaceX", sector: "SPACE", tone: "#a7b0bc", logoColor: "#ffffff", contractAddress: "0xb2000000000000000000007b9fcbd005511aCBd5", priceFeedAddress: "0x6A634B235903C4ad6376892180d6fF8612e3Fa68" },
];

export const DEFAULT_DRAFT = ["NVDAc", "AAPLc", "TSLAc"];

// Verified against each token's decimals() function on Base mainnet.
export const B20_DECIMALS = 8;

export function getStock(ticker: string) {
  return STOCKS.find((stock) => stock.ticker === ticker);
}
