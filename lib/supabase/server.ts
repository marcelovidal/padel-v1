import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type DatabaseSupabaseClient = SupabaseClient<Database, "public">;

export function createClient(): DatabaseSupabaseClient {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll can be called from a Server Component; ignore if middleware handles session refresh.
          }
        },
      },
    }
  ) as unknown as DatabaseSupabaseClient;
}

// Alias para compatibilidad con imports existentes
export function createTypedClient(): DatabaseSupabaseClient {
  return createClient();
}
