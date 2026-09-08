"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, LayoutDashboard, LogOut, User, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useAccount, useConnect, useDisconnect } from "wagmi";

import { DitherAvatar } from "@/components/dither-avatar";
import { useGauntletAuth } from "@/components/gauntlet-auth";

const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

export function WalletButton({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { address, connector, isConnected } = useAccount();
  const { connectors, connect, error: connectError, isPending, reset } = useConnect();
  const { disconnect } = useDisconnect();
  const auth = useGauntletAuth();
  const controlClass = `wallet-control ${compact ? "compact" : "full"}`;
  const buttonClass = compact ? "wallet-stub" : "primary-action full";

  const close = () => {
    reset();
    setOpen(false);
  };

  const disconnectAll = async () => {
    setOpen(false);
    await auth.signOut();
    disconnect();
  };

  const copy = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  if (isConnected && address) {
    const name = auth.profile?.username || shortAddress(address);
    return (
      <div className={controlClass}>
        <button className={`${buttonClass} connected-trigger`} onClick={() => setOpen((value) => !value)} aria-expanded={open}>
          <DitherAvatar seed={name} tone={auth.profile?.avatar_tone} size={26} />
          <span>{auth.status === "signing" ? "VERIFYING…" : name}</span>
        </button>

        {typeof document !== "undefined" && createPortal(
          <AnimatePresence>
            {open && (
              <>
                <motion.button className="wallet-scrim" aria-label="Close wallet menu" onClick={close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
                <motion.aside className="account-panel" initial={{ opacity: 0, scale: .94, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .96, y: 8 }} transition={{ duration: .18 }}>
                  <div className="account-identity">
                    <DitherAvatar seed={name} tone={auth.profile?.avatar_tone} size={52} />
                    <div><strong>{auth.profile?.username || "Unnamed player"}</strong><span>{shortAddress(address)}</span></div>
                  </div>
                  <div className="account-status">
                    <span><small>NETWORK</small><strong>BASE</strong></span>
                    <span><small>PROFILE</small><strong className={auth.verified ? "up" : "down"}>{auth.verified ? "VERIFIED" : "UNVERIFIED"}</strong></span>
                  </div>
                  {auth.error && <p className="wallet-error account-error">{auth.error}</p>}
                  {!auth.verified && connector && (
                    <button className="account-verify" onClick={() => void auth.authenticate(connector)} disabled={auth.status === "signing"}>
                      <Wallet size={15} /> {auth.status === "signing" ? "CHECK YOUR WALLET…" : "VERIFY WALLET"}
                    </button>
                  )}
                  <div className="account-links">
                    <Link href="/me#profile" onClick={close}><User size={16} /> EDIT PROFILE</Link>
                    <Link href="/me" onClick={close}><LayoutDashboard size={16} /> PLAYER HUB</Link>
                    <button onClick={() => void copy()}>{copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "COPIED" : "COPY ADDRESS"}</button>
                    <button className="danger" onClick={() => void disconnectAll()}><LogOut size={16} /> DISCONNECT</button>
                  </div>
                </motion.aside>
              </>
            )}
          </AnimatePresence>,
          document.body,
        )}
      </div>
    );
  }

  return (
    <div className={controlClass}>
      <button className={buttonClass} onClick={() => { reset(); setOpen((value) => !value); }} aria-expanded={open} aria-haspopup="dialog">
        <Wallet size={15} /> CONNECT
      </button>

      {open && (
        <div className={`wallet-options ${compact ? "compact" : ""}`} role="dialog" aria-label="Choose a wallet">
          <div className="wallet-options-heading"><strong>CHOOSE A WALLET</strong><span>Your wallet is your Gauntlet account.</span></div>
          {connectors.map((walletConnector) => (
            <button
              key={walletConnector.uid}
              className="wallet-choice"
              onClick={() => connect({ connector: walletConnector }, {
                onSuccess: () => {
                  setOpen(false);
                  void auth.authenticate(walletConnector);
                },
              })}
              disabled={isPending}
            >
              <span><Wallet size={17} /></span>
              <span><strong>{walletConnector.name === "Injected" ? "METAMASK / PHANTOM" : walletConnector.name}</strong><small>{walletConnector.name === "Coinbase Wallet" ? "SMART WALLET OR MOBILE APP" : "INSTALLED BROWSER WALLET"}</small></span>
            </button>
          ))}
          {connectError && <p className="wallet-error">{connectError.message}</p>}
          <button className="wallet-cancel" onClick={close}>CANCEL</button>
        </div>
      )}
    </div>
  );
}
