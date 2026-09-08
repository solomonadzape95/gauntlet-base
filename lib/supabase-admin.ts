import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null | undefined;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (adminClient !== undefined) return adminClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    adminClient = null;
    return adminClient;
  }
  adminClient = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return adminClient;
}
