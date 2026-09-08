"use client";

import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

export function WalletButton({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const { address, isConnected } = useAccount();
  const { connectors, connect, error, isPending, reset } = useConnect();
  const { disconnect } = useDisconnect();
  const controlClass = `wallet-control ${compact ? "compact" : "full"}`;
  const buttonClass = compact ? "wallet-stub" : "primary-action full";

  if (isConnected && address) {
    return (
      <div className={controlClass}>
        <button className={buttonClass} onClick={() => disconnect()} title="Disconnect wallet">
          {address.slice(0, 6)}…{address.slice(-4)}
        </button>
      </div>
    );
  }

  return (
    <div className={controlClass}>
      <button
        className={buttonClass}
        onClick={() => {
          reset();
          setOpen((value) => !value);
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        CONNECT WALLET
      </button>

      {open && (
        <div className={`wallet-options ${compact ? "compact" : ""}`} role="dialog" aria-label="Choose a wallet">
          {connectors.map((connector) => (
            <button
              key={connector.uid}
              onClick={() => connect({ connector }, { onSuccess: () => setOpen(false) })}
              disabled={isPending}
            >
              {isPending ? "CHECK WALLET…" : connector.name === "Injected" ? "BROWSER WALLET · METAMASK / PHANTOM" : connector.name}
            </button>
          ))}
          {error && <p className="wallet-error">{error.message}</p>}
          <button onClick={() => { reset(); setOpen(false); }}>CANCEL</button>
        </div>
      )}
    </div>
  );
}
