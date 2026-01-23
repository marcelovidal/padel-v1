import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

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

  if (authError || !user) {
    redirect("/login");
  }

  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

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

  if (!user) return { user: null, playerId: null };

  const { data: player } = await supabase
    .from("players")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  return { user, playerId: (player as any)?.id ?? null };
}


