import { createPublicClient, formatUnits, http } from "viem";
import { base } from "viem/chains";

import type { PricePoint } from "@/lib/battle-scoring";
import { STOCKS } from "@/lib/stocks";

const aggregatorAbi = [{
  inputs: [],
  name: "latestRoundData",
  outputs: [
    { name: "roundId", type: "uint80" },
    { name: "answer", type: "int256" },
    { name: "startedAt", type: "uint256" },
    { name: "updatedAt", type: "uint256" },
    { name: "answeredInRound", type: "uint80" },
  ],
  stateMutability: "view",
  type: "function",
}] as const;

export const MAX_PRICE_AGE_SECONDS = 36 * 60 * 60;

export async function readChainlinkPrices(now = new Date()): Promise<PricePoint[]> {
  const client = createPublicClient({
    chain: base,
    transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org"),
  });
  const nowSeconds = Math.floor(now.getTime() / 1000);

  const results = await client.multicall({
    allowFailure: true,
    contracts: STOCKS.map((stock) => ({
      address: stock.priceFeedAddress,
      abi: aggregatorAbi,
      functionName: "latestRoundData" as const,
    })),
  });

  return results.flatMap((result, index) => {
    if (result.status !== "success") return [];
    const [, answer, , updatedAt] = result.result;
    if (answer <= BigInt(0) || updatedAt <= BigInt(0)) return [];
    const updatedAtSeconds = Number(updatedAt);
    return [{
      ticker: STOCKS[index].ticker,
      price: Number(formatUnits(answer, 8)),
      updatedAt: new Date(updatedAtSeconds * 1000).toISOString(),
      fresh: nowSeconds - updatedAtSeconds <= MAX_PRICE_AGE_SECONDS,
    }];
  });
}
