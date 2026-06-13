import { createClient } from "@supabase/supabase-js";

export function getSupabase() {
  // SUPABASE_URL / SUPABASE_ANON_KEY（NEXT_PUBLIC_ なし）を優先し、
  // なければ NEXT_PUBLIC_ 版にフォールバック
  const url =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error("Supabase env vars missing:", { url: !!url, key: !!key });
  }

  return createClient(url!, key!);
}
