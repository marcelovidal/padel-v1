import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/types/database";

export function createBrowserSupabase() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// backward-compatible alias used across the repo
export const createClient = createBrowserSupabase;