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
    // redirect to player login (admins use /login)
    redirect("/player/login");
  }

  const { data: player, error: playerError } = await (supabase
    .from("players")
    .select("id, onboarding_completed, display_name, avatar_url, first_name, last_name")
    .eq("user_id", user.id)
    .maybeSingle() as any);

  // Si no hay player o no completó el onboarding, redirigir al flujo de bienvenida
  if (playerError || !player || !player.onboarding_completed) {
    redirect("/welcome/onboarding");
  }

  return { user, player };
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


