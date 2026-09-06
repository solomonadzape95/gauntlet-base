"use client";

import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

export function WalletButton({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <button className={compact ? "wallet-stub" : "primary-action full"} onClick={() => disconnect()} title="Disconnect wallet">
        {address.slice(0, 6)}…{address.slice(-4)}
      </button>
    );
  }

  if (!open) {
    return (
      <button className={compact ? "wallet-stub" : "primary-action full"} onClick={() => setOpen(true)}>
        CONNECT WALLET
      </button>
    );
  }

  return (
    <div className={`wallet-options ${compact ? "compact" : ""}`}>
      {connectors.length ? (
        connectors.map((connector) => (
          <button
            key={connector.uid}
            onClick={() => connect({ connector }, { onSuccess: () => setOpen(false) })}
            disabled={isPending}
          >
            {connector.name}
          </button>
        ))
      ) : (
        <p className="wallet-empty">No browser wallet detected.</p>
      )}
      <button onClick={() => setOpen(false)}>CANCEL</button>
    </div>
  );
}
