"use client";

import { formatUnits } from "viem";
import { useAccount, useBalance } from "wagmi";

import { WalletButton } from "@/components/wallet-button";

const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;

export function WalletStatus() {
  const { address, isConnected } = useAccount();
  const { data: usdc, isLoading } = useBalance({ address, token: BASE_USDC, query: { enabled: Boolean(address) } });

  if (!isConnected) return <WalletButton />;

  const balance = usdc ? Number(formatUnits(usdc.value, usdc.decimals)).toFixed(2) : "—";

  return (
    <div className="connected-wallet">
      <div>
        <span className="eyebrow">BASE WALLET</span>
        <strong>{address?.slice(0, 8)}…{address?.slice(-6)}</strong>
      </div>
      <div>
        <span className="eyebrow">AVAILABLE USDC</span>
        <strong>{isLoading ? "CHECKING" : `$${balance}`}</strong>
      </div>
      <WalletButton />
    </div>
  );
}
