import { Attribution } from "ox/erc8021";
import { createConfig, http, injected } from "wagmi";
import { base } from "wagmi/chains";
import { coinbaseWallet } from "wagmi/connectors";

export const GAUNTLET_BUILDER_CODE = "bc_0jw62dh4";

export const GAUNTLET_DATA_SUFFIX = Attribution.toDataSuffix({
  codes: [GAUNTLET_BUILDER_CODE],
});

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    coinbaseWallet({ appName: "Gauntlet", preference: "all" }),
    injected(),
  ],
  dataSuffix: GAUNTLET_DATA_SUFFIX,
  multiInjectedProviderDiscovery: true,
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
