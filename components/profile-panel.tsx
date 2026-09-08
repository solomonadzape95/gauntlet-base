"use client";

import { Check, Copy, LockKeyhole, ShieldCheck, Swords, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAccount } from "wagmi";

import { DitherAvatar } from "@/components/dither-avatar";
import { AVATAR_TONES, type AvatarTone, useGauntletAuth } from "@/components/gauntlet-auth";
import { WalletButton } from "@/components/wallet-button";
import { useActiveTeam } from "@/lib/use-active-team";

const shortAddress = (address: string) => `${address.slice(0, 8)}…${address.slice(-6)}`;

export function ProfilePanel({ embedded = false }: { embedded?: boolean }) {
  const { address, connector, isConnected } = useAccount();
  const auth = useGauntletAuth();
  const { team } = useActiveTeam();
  const profileKey = auth.profile?.updated_at || address || "new";
  const [form, setForm] = useState<{ key: string; username: string; tone: AvatarTone }>({ key: "", username: "", tone: "hazard" });
  const username = form.key === profileKey ? form.username : auth.profile?.username || "";
  const tone = form.key === profileKey ? form.tone : auth.profile?.avatar_tone || "hazard";
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isConnected || !address) {
    return (
      <div className="profile-page shell page-shell">
        <section className="dashboard-gate dashboard-panel">
          <span className="gate-icon"><LockKeyhole size={30} /></span>
          <p className="eyebrow hazard">PLAYER PROFILE · WALLET ACCESS</p>
          <h1>Connect to meet your player.</h1>
          <p>Your wallet is your account. There is no password, email, or deposit required.</p>
          <div className="gate-actions"><WalletButton /><Link className="secondary-action" href="/draft">PLAY FIRST</Link></div>
        </section>
      </div>
    );
  }

  if (!auth.verified) {
    return (
      <div className="profile-page shell page-shell">
        <section className="dashboard-gate dashboard-panel">
          <span className="gate-icon"><ShieldCheck size={30} /></span>
          <p className="eyebrow hazard">PLAYER NAME</p>
          <h1>Sign once to save your name.</h1>
          <p>This free signature proves the connected wallet is yours. It cannot move money.</p>
          <div className="gate-actions">
            <button className="primary-action" disabled={!connector || auth.status === "signing"} onClick={() => connector && void auth.authenticate(connector)}>
              <Wallet size={16} /> {auth.status === "signing" ? "CHECK YOUR WALLET…" : "VERIFY WALLET"}
            </button>
            {!embedded && <Link className="secondary-action" href="/me">BACK TO PLAYER</Link>}
          </div>
          {auth.error && <p className="profile-auth-error">{auth.error}</p>}
        </section>
      </div>
    );
  }

  const playerName = username.trim() || "Unnamed player";
  const save = async () => {
    setSaving(true);
    setMessage(null);
    const result = await auth.saveProfile(username, tone);
    setSaving(false);
    setMessage(result.ok ? { kind: "ok", text: "Profile saved." } : { kind: "error", text: result.error || "Could not save profile." });
  };

  const copy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className={embedded ? "profile-page embedded-profile" : "profile-page shell page-shell"} id="profile">
      <header className="profile-heading">
        <div><p className="eyebrow hazard">PLAYER IDENTITY · VERIFIED WALLET</p><h1>Your profile</h1></div>
        <p>Choose the name and dither mark other players will see. Your wallet address stays the proof behind it.</p>
      </header>

      <div className="profile-grid">
        <section className="profile-card identity-card">
          <p className="eyebrow">IDENTITY</p>
          <div className="profile-preview">
            <DitherAvatar seed={playerName} tone={tone} size={96} />
            <div><strong>{playerName}</strong><span>{shortAddress(address)}</span></div>
          </div>

          <label className="profile-field">
            <span className="eyebrow">USERNAME</span>
            <input value={username} onChange={(event) => { setForm({ key: profileKey, username: event.target.value, tone }); setMessage(null); }} maxLength={20} placeholder="market_maker" />
            <small>3–20 letters, numbers, or underscores. Must be unique.</small>
          </label>

          <div className="profile-tones">
            <span className="eyebrow">DITHER COLOUR</span>
            <div>
              {AVATAR_TONES.map((item) => (
                <button key={item.id} onClick={() => setForm({ key: profileKey, username, tone: item.id })} aria-label={item.label} aria-pressed={tone === item.id} className={tone === item.id ? "active" : ""}>
                  <DitherAvatar seed={playerName} tone={item.id} size={34} />
                </button>
              ))}
            </div>
          </div>

          <button className="primary-action full profile-save" onClick={() => void save()} disabled={saving || !username.trim()}>
            {saving ? "SAVING…" : auth.profile ? "UPDATE PROFILE" : "CREATE PROFILE"}
          </button>
          {message && <p className={`profile-message ${message.kind}`}>{message.kind === "ok" && <Check size={15} />}{message.text}</p>}
        </section>

        <div className="profile-side">
          <section className="profile-card player-stats">
            <p className="eyebrow">PLAYER RECORD</p>
            <div><span><small>TEAM</small><strong>{team ? `${team.picks.length} PICKS` : "—"}</strong></span><span><small>BATTLES</small><strong>{team ? "READY" : "—"}</strong></span></div>
            <Link className="secondary-action full" href="/draft"><Swords size={16} /> BUILD A NEW LINEUP</Link>
          </section>

          <section className="profile-card wallet-record">
            <p className="eyebrow">CONNECTED WALLET</p>
            <strong>{address}</strong>
            <button className="secondary-action" onClick={() => void copy()}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? "COPIED" : "COPY ADDRESS"}</button>
            <p>Gauntlet never receives your private keys. A profile signature cannot move funds.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
