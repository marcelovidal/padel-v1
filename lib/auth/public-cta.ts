import { createClient } from "@/lib/supabase/server";
import {
  PublicCtaContext,
  PublicCtaState,
  resolvePublicCtaHref,
} from "@/lib/auth/public-cta.shared";

export async function getPublicCtaContext(): Promise<PublicCtaContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      state: "guest",
      isAuthenticated: false,
      displayName: null,
      email: null,
    };
  }

  const [{ data: player }, { data: club }] = await Promise.all([
    (supabase
      .from("players")
      .select("id,onboarding_completed,display_name")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle() as any),
    (supabase
      .from("clubs")
      .select("id,name")
      .eq("claimed_by", user.id)
      .eq("claim_status", "claimed")
      .is("deleted_at", null)
      .maybeSingle() as any),
  ]);

  const meta = (user.user_metadata || {}) as Record<string, unknown>;
  const fallbackName =
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    [meta.first_name, meta.last_name]
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .join(" ")
      .trim() ||
    user.email ||
    null;

  if (club?.id) {
    return {
      state: "club_ready",
      isAuthenticated: true,
      displayName: club.name || fallbackName,
      email: user.email || null,
    };
  }

  if (player?.id && player.onboarding_completed) {
    return {
      state: "player_ready",
      isAuthenticated: true,
      displayName: player.display_name || fallbackName,
      email: user.email || null,
    };
  }

  return {
    state: "needs_onboarding",
    isAuthenticated: true,
    displayName: fallbackName,
    email: user.email || null,
  };
}

export async function getPublicCtaState(): Promise<PublicCtaState> {
  const context = await getPublicCtaContext();
  return context.state;
}

export async function getPrimaryCtaHref(currentPath: string): Promise<string> {
  const context = await getPublicCtaContext();
  return resolvePublicCtaHref(context.state, currentPath);
}
