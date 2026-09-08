"use client";

import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAccount, type Connector } from "wagmi";

import { getSupabase } from "@/lib/supabase";

export const AVATAR_TONES = [
  { id: "hazard", label: "Voltage", color: "#f5ff00" },
  { id: "base", label: "Base", color: "#2f6bff" },
  { id: "ember", label: "Ember", color: "#f0a868" },
  { id: "ink", label: "Silver", color: "#f4f2ee" },
] as const;

export type AvatarTone = (typeof AVATAR_TONES)[number]["id"];

export type GauntletProfile = {
  user_id: string;
  wallet_address: string;
  username: string;
  avatar_tone: AvatarTone;
  created_at: string;
  updated_at: string;
};

type AuthStatus = "loading" | "idle" | "signing" | "authenticated" | "error";

type AuthContextValue = {
  session: Session | null;
  profile: GauntletProfile | null;
  verified: boolean;
  status: AuthStatus;
  error: string | null;
  authenticate: (connector: Connector) => Promise<boolean>;
  saveProfile: (username: string, avatarTone: AvatarTone) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function GauntletAuthProvider({ children }: { children: React.ReactNode }) {
  const { address, status: walletStatus } = useAccount();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<GauntletProfile | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() => getSupabase() ? "loading" : "idle");
  const [error, setError] = useState<string | null>(null);

  const loadWalletProfile = useCallback(async () => {
    try {
      const response = await fetch("/api/profile", { cache: "no-store" });
      const result = await response.json() as { profile?: GauntletProfile | null; verified?: boolean };
      if (response.ok && result.profile) {
        setProfile(result.profile);
        setStatus("authenticated");
        return true;
      }
    } catch { /* A wallet can still connect while profile persistence is unavailable. */ }
    return false;
  }, []);

  const loadProfile = useCallback(async (activeSession: Session | null) => {
    const supabase = getSupabase();
    if (!supabase || !activeSession) {
      setProfile(null);
      return;
    }

    const result = await supabase
      .from("profiles")
      .select("user_id,wallet_address,username,avatar_tone,created_at,updated_at")
      .eq("user_id", activeSession.user.id)
      .maybeSingle<GauntletProfile>();

    if (!result.error) setProfile(result.data);
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setStatus(data.session ? "authenticated" : "idle");
      if (data.session) void loadProfile(data.session);
      else void loadWalletProfile();
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setStatus(nextSession ? "authenticated" : "idle");
      if (nextSession) void loadProfile(nextSession);
      else void loadWalletProfile();
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile, loadWalletProfile]);

  useEffect(() => {
    if (walletStatus === "reconnecting" || address || !session) return;
    const supabase = getSupabase();
    void supabase?.auth.signOut();
  }, [address, session, walletStatus]);

  const authenticate = useCallback(async (connector: Connector) => {
    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase is not configured for this build.");
      setStatus("error");
      return false;
    }

    setStatus("signing");
    setError(null);

    try {
      const provider = await connector.getProvider();
      if (!provider) throw new Error("The selected wallet did not expose a signing provider.");
      const connectorAccounts = await connector.getAccounts();
      const signingAddress = address || connectorAccounts[0];
      if (!signingAddress) throw new Error("Connect the wallet before verifying it.");
      const walletProvider = provider as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
      const nonceResponse = await fetch(`/api/profile/nonce?address=${encodeURIComponent(signingAddress)}`, { cache: "no-store" });
      const nonceResult = await nonceResponse.json() as { message?: string; error?: string };
      if (!nonceResponse.ok || !nonceResult.message) throw new Error(nonceResult.error ?? "Could not start wallet verification.");
      const signature = await walletProvider.request({ method: "personal_sign", params: [nonceResult.message, signingAddress] });
      if (typeof signature !== "string") throw new Error("The wallet did not return a signature.");
      const verifyResponse = await fetch("/api/profile/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address: signingAddress, signature }) });
      const verifyResult = await verifyResponse.json() as { profile?: GauntletProfile; error?: string };
      if (!verifyResponse.ok || !verifyResult.profile) throw new Error(verifyResult.error ?? "Could not verify this wallet.");

      setProfile(verifyResult.profile);
      setStatus("authenticated");
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not verify this wallet.");
      setStatus("error");
      return false;
    }
  }, [address]);

  const saveProfile = useCallback(async (username: string, avatarTone: AvatarTone) => {
    const supabase = getSupabase();
    if (!supabase || !address) return { ok: false, error: "Verify your wallet first." };

    const cleanName = username.trim();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanName)) {
      return { ok: false, error: "Use 3–20 letters, numbers, or underscores." };
    }

    if (!session) {
      const response = await fetch("/api/profile", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: cleanName, avatarTone }) });
      const result = await response.json() as { profile?: GauntletProfile; error?: string };
      if (!response.ok || !result.profile) return { ok: false, error: result.error ?? "Could not save profile." };
      setProfile(result.profile);
      return { ok: true };
    }

    const result = await supabase.from("profiles").upsert({ user_id: session.user.id, wallet_address: address.toLowerCase(), username: cleanName, avatar_tone: avatarTone, updated_at: new Date().toISOString() }, { onConflict: "user_id" }).select().single<GauntletProfile>();

    if (result.error) {
      const message = result.error.code === "23505" ? "That username is already taken." : result.error.message;
      return { ok: false, error: message };
    }

    setProfile(result.data);
    return { ok: true };
  }, [address, session]);

  const signOut = useCallback(async () => {
    if (!session) await fetch("/api/profile", { method: "DELETE" }).catch(() => undefined);
    setProfile(null);
    setSession(null);
    setError(null);
    setStatus("idle");
    await getSupabase()?.auth.signOut();
  }, [session]);

  const walletProfileMatches = Boolean(profile && address && profile.wallet_address.toLowerCase() === address.toLowerCase());
  const activeProfile = session || walletProfileMatches ? profile : null;
  const verified = Boolean(session || activeProfile);
  const activeStatus = !session && profile && !walletProfileMatches ? "idle" : status;
  const value = useMemo(() => ({ session, profile: activeProfile, verified, status: activeStatus, error, authenticate, saveProfile, signOut }), [activeProfile, activeStatus, authenticate, error, saveProfile, session, signOut, verified]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useGauntletAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useGauntletAuth must be used inside GauntletAuthProvider");
  return value;
}
