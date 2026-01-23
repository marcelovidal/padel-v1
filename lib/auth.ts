import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  console.log("[AUTH] requireAdmin getUser result user id:", user?.id ?? null, "error:", authError ?? null);

  if (authError || !user) {
    redirect("/player/login");
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

export async function requirePlayer() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  console.log("[AUTH] requirePlayer getUser user id:", user?.id ?? null, "authError:", authError ?? null);

  if (authError || !user) {
    // redirect to player login (admins use /login)
    redirect("/player/login");
  }

  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  console.log("[AUTH] requirePlayer players select result:", player ?? null, "playerError:", playerError ?? null);

  if (playerError || !player) {
    // If there's no linked player yet, redirect to the player login flow
    redirect("/player/login");
  }

  return { user, playerId: (player as any).id };
}

export async function getOptionalPlayer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("[AUTH] getOptionalPlayer getUser user id:", user?.id ?? null);

  if (!user) return { user: null, playerId: null };

  const { data: player } = await supabase
    .from("players")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  console.log("[AUTH] getOptionalPlayer players select result:", player ?? null);

  return { user, playerId: (player as any)?.id ?? null };
}


