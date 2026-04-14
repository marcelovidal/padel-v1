"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePlayer } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { createNotificationInternal } from "@/lib/actions/notification.actions";

// ── Player: enviar solicitud ────────────────────────────────────────────────

export async function submitClubOwnerRequestAction(formData: FormData) {
  const { player } = await requirePlayer();
  const supabase = await createClient();
  const sb = supabase as any;

  const clubId = (formData.get("club_id") as string) || null;
  const clubNameRequested = (formData.get("club_name_requested") as string) || null;

  if (!clubId && !clubNameRequested?.trim()) {
    return { error: "Seleccioná un club o ingresá el nombre." };
  }

  // Verificar que no haya solicitud pendiente
  const { data: existing } = await sb
    .from("club_owner_requests")
    .select("id")
    .eq("player_id", player.id)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return { error: "Ya tenés una solicitud pendiente." };
  }

  const { error } = await sb.from("club_owner_requests").insert({
    player_id: player.id,
    club_id: clubId,
    club_name_requested: clubNameRequested?.trim() || null,
    status: "pending",
  });

  if (error) return { error: error.message };

  revalidatePath("/player/profile");
  return { ok: true };
}

// ── Admin: aprobar solicitud ────────────────────────────────────────────────

export async function approveClubOwnerRequestAction(formData: FormData) {
  const supabase = await createClient();
  const sb = supabase as any;

  const requestId = formData.get("request_id") as string;
  const playerId = formData.get("player_id") as string;
  const clubId = (formData.get("club_id") as string) || null;

  // 1. Activar rol en el player
  const { error: playerErr } = await sb
    .from("players")
    .update({ is_club_owner: true, club_owner_enabled_at: new Date().toISOString() })
    .eq("id", playerId);

  if (playerErr) return { error: playerErr.message };

  // 2. Vincular club
  if (clubId) {
    await sb
      .from("clubs")
      .update({ owner_player_id: playerId })
      .eq("id", clubId);
  }

  // 3. Resolver la solicitud
  await sb
    .from("club_owner_requests")
    .update({ status: "approved", resolved_at: new Date().toISOString() })
    .eq("id", requestId);

  // 4. Notificar al jugador
  const { data: playerData } = await sb
    .from("players")
    .select("user_id")
    .eq("id", playerId)
    .single();

  if (playerData?.user_id) {
    await createNotificationInternal({
      userId: playerData.user_id,
      type: "club_owner_request_approved",
      entityId: requestId,
    }).catch(console.error);
  }

  revalidatePath("/admin/club-owner-requests");
  revalidatePath("/player/profile");
  return { ok: true };
}

// ── Admin: rechazar solicitud ───────────────────────────────────────────────

export async function rejectClubOwnerRequestAction(formData: FormData) {
  const supabase = await createClient();
  const sb = supabase as any;

  const requestId = formData.get("request_id") as string;
  const playerId = formData.get("player_id") as string;

  await sb
    .from("club_owner_requests")
    .update({ status: "rejected", resolved_at: new Date().toISOString() })
    .eq("id", requestId);

  const { data: playerData } = await sb
    .from("players")
    .select("user_id")
    .eq("id", playerId)
    .single();

  if (playerData?.user_id) {
    await createNotificationInternal({
      userId: playerData.user_id,
      type: "club_owner_request_rejected",
      entityId: requestId,
    }).catch(console.error);
  }

  revalidatePath("/admin/club-owner-requests");
  return { ok: true };
}
