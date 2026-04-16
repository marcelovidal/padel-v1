"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const REVALIDATE = "/player/mi-club/dashboard/bookings";

// court_fixed_slots no está en el tipo Database generado (aplicado manualmente)
// → usamos `as any` para omitir validación de tipos en estas queries

export async function assignFixedSlotAction(
  _prev: any,
  formData: FormData,
): Promise<{ success: boolean; error?: string; isGuest?: boolean }> {
  const supabase = await createClient();

  const club_id = formData.get("club_id") as string;
  const court_id = formData.get("court_id") as string;
  const player_id = formData.get("player_id") as string;
  const day_of_week = Number(formData.get("day_of_week"));
  const start_time = formData.get("start_time") as string;
  const end_time = formData.get("end_time") as string;
  const note = (formData.get("note") as string) || null;

  if (!club_id || !court_id || !player_id || isNaN(day_of_week) || !start_time || !end_time) {
    return { success: false, error: "Completá todos los campos obligatorios." };
  }

  const { data: slotData, error } = await (supabase as any)
    .from("court_fixed_slots")
    .insert({ club_id, court_id, player_id, day_of_week, start_time, end_time, note, status: "active" })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ya existe un turno fijo para esa cancha, día y horario." };
    }
    return { success: false, error: "No se pudo crear el turno fijo." };
  }

  // Notificación al jugador (best-effort — requiere SQL de notification_create actualizado)
  const { data: playerRow } = await supabase
    .from("players")
    .select("user_id, is_guest")
    .eq("id", player_id)
    .single();

  if ((playerRow as any)?.user_id) {
    try {
      await (supabase as any).rpc("notification_create", {
        p_user_id: (playerRow as any).user_id,
        p_club_id: null,
        p_type: "fixed_slot_assigned",
        p_entity_id: slotData.id,
        p_payload: {},
        p_priority: 0,
        p_dedupe_key: null,
      });
    } catch {
      // silencio — tipo puede no estar aplicado aún
    }
  }

  revalidatePath(REVALIDATE);
  return { success: true, isGuest: (playerRow as any)?.is_guest ?? false };
}

export async function releaseFixedSlotAction(
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const fixed_slot_id = formData.get("fixed_slot_id") as string;
  if (!fixed_slot_id) return { success: false, error: "ID de turno fijo no válido." };

  const { data: slot, error: fetchError } = await (supabase as any)
    .from("court_fixed_slots")
    .select("id, player_id, club_id")
    .eq("id", fixed_slot_id)
    .single();

  if (fetchError || !slot) return { success: false, error: "Turno fijo no encontrado." };

  const { error } = await (supabase as any)
    .from("court_fixed_slots")
    .update({ status: "released", released_at: new Date().toISOString() })
    .eq("id", fixed_slot_id);

  if (error) return { success: false, error: "No se pudo liberar el turno fijo." };

  // Notificación (best-effort)
  if (slot.player_id) {
    const { data: playerRow } = await supabase
      .from("players")
      .select("user_id")
      .eq("id", slot.player_id)
      .single();

    if ((playerRow as any)?.user_id) {
      try {
        await (supabase as any).rpc("notification_create", {
          p_user_id: (playerRow as any).user_id,
          p_club_id: null,
          p_type: "fixed_slot_released",
          p_entity_id: slot.id,
          p_payload: {},
          p_priority: 0,
          p_dedupe_key: null,
        });
      } catch {
        // silencio
      }
    }
  }

  revalidatePath(REVALIDATE);
  return { success: true };
}
