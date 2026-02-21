import { createClient } from "@/lib/supabase/server";
import { PublicCtaState, resolvePublicCtaHref } from "@/lib/auth/public-cta.shared";

export async function getPublicCtaState(): Promise<PublicCtaState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return "guest";
  }

  const [{ data: player }, { data: club }] = await Promise.all([
    (supabase
      .from("players")
      .select("id,onboarding_completed")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle() as any),
    (supabase
      .from("clubs")
      .select("id")
      .eq("claimed_by", user.id)
      .eq("claim_status", "claimed")
      .is("deleted_at", null)
      .maybeSingle() as any),
  ]);

  if (club?.id) {
    return "club_ready";
  }

  if (player?.id && player.onboarding_completed) {
    return "player_ready";
  }

  return "needs_onboarding";
}

export async function getPrimaryCtaHref(currentPath: string): Promise<string> {
  const state = await getPublicCtaState();
  return resolvePublicCtaHref(state, currentPath);
}

