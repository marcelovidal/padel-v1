import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Verificar que el usuario tenga rol admin
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // TODO: narrow `profile` type instead of using `as any` once Database types are aligned
  if (profileError || !profile || (profile as any).role !== "admin") {
    redirect("/login");
  }

  return { user, profile };
}


