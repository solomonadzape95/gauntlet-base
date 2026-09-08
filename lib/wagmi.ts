import { Attribution } from "ox/erc8021";
import { createConfig, http } from "wagmi";
import { base } from "wagmi/chains";

export const GAUNTLET_BUILDER_CODE = "bc_0jw62dh4";

export const GAUNTLET_DATA_SUFFIX = Attribution.toDataSuffix({
  codes: [GAUNTLET_BUILDER_CODE],
});

export const wagmiConfig = createConfig({
  chains: [base],
  dataSuffix: GAUNTLET_DATA_SUFFIX,
  transports: {
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org"),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
