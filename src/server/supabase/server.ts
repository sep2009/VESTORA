import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env, isSupabaseConfigured } from "../env";

/** Read-only public client (anon key, subject to row-level security). */
export function getPublicSupabase() {
  if (!isSupabaseConfigured) return null;
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
}
