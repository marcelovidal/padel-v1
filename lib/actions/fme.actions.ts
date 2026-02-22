"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const fmeSchema = z
  .object({
    date: z.string().min(1, "La fecha es requerida"),
    club_name: z.string().optional().default(""),
    club_id: z.string().uuid().optional().nullable(),
    player_id: z.string().uuid(),
    partner_id: z.string().uuid("Selecciona un companero"),
    opponent1_id: z.string().uuid("Selecciona rival 1"),
    opponent2_id: z.string().uuid("Selecciona rival 2"),
    set1_a: z.coerce.number().int().min(0),
    set1_b: z.coerce.number().int().min(0),
    set2_a: z.coerce.number().int().min(0),
    set2_b: z.coerce.number().int().min(0),
    set3_a: z.coerce.number().int().min(0).optional(),
    set3_b: z.coerce.number().int().min(0).optional(),
    match_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  })
  .superRefine((value, ctx) => {
    const hasClubName = (value.club_name || "").trim().length > 0;
    const hasClubId = !!value.club_id;
    if (!hasClubName && !hasClubId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecciona un club publicado o ingresa su nombre",
        path: ["club_name"],
      });
    }
    const unique = new Set([value.player_id, value.partner_id, value.opponent1_id, value.opponent2_id]);
    if (unique.size !== 4) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "No puedes repetir jugadores en el partido",
        path: ["partner_id"],
      });
    }
  });

export async function createFirstMatchWithResultAsPlayer(prevState: any, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No estas autenticado" };

  const raw = {
    date: String(formData.get("date") || ""),
    club_name: String(formData.get("club_name") || ""),
    club_id: formData.get("club_id") ? String(formData.get("club_id")) : null,
    player_id: String(formData.get("player_id") || ""),
    partner_id: String(formData.get("partner_id") || ""),
    opponent1_id: String(formData.get("opponent1_id") || ""),
    opponent2_id: String(formData.get("opponent2_id") || ""),
    set1_a: formData.get("set1_a"),
    set1_b: formData.get("set1_b"),
    set2_a: formData.get("set2_a"),
    set2_b: formData.get("set2_b"),
    set3_a: formData.get("set3_a") ? String(formData.get("set3_a")) : undefined,
    set3_b: formData.get("set3_b") ? String(formData.get("set3_b")) : undefined,
    match_time: String(formData.get("match_time") || ""),
  };

  const validated = fmeSchema.safeParse(raw);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  const data = validated.data;
  const matchTimestamp = `${data.date}T${data.match_time || "00:00"}:00`;

  try {
    const sb = supabase as any;

    const { data: matchId, error: createError } = await sb.rpc("player_create_match_with_players", {
      p_match_at: matchTimestamp,
      p_club_name: (data.club_name || "").trim(),
      p_partner_id: data.partner_id,
      p_opp1_id: data.opponent1_id,
      p_opp2_id: data.opponent2_id,
      p_notes: null,
      p_max_players: 4,
      p_club_id: data.club_id || null,
    });

    if (createError || !matchId) throw createError || new Error("MATCH_CREATE_FAILED");

    const { error: resultError } = await sb.rpc("player_submit_match_result", {
      p_match_id: matchId,
      p_set1_a: data.set1_a,
      p_set1_b: data.set1_b,
      p_set2_a: data.set2_a,
      p_set2_b: data.set2_b,
      p_set3_a: data.set3_a ?? null,
      p_set3_b: data.set3_b ?? null,
    });

    if (resultError) throw resultError;

    revalidatePath("/player");
    revalidatePath("/player/matches");
    revalidatePath(`/player/matches/${matchId}`);
    revalidatePath(`/player/matches/${matchId}/confirmed`);

    redirect(`/player/matches/${matchId}/confirmed?fme=1`);
  } catch (err: any) {
    const msg = String(err?.message || "");
    if (msg.includes("PLAYER_PROFILE_NOT_FOUND")) return { error: "Tu usuario no tiene un perfil de jugador vinculado." };
    if (msg.includes("DUPLICATE_PLAYERS")) return { error: "No puedes repetir jugadores en el partido." };
    if (msg.includes("CLUB_NOT_FOUND")) return { error: "El club seleccionado no existe o no esta disponible." };
    if (msg.includes("MATCH_NOT_COMPLETED")) return { error: "La fecha del partido debe ser hoy o anterior para cargar resultado." };
    if (msg.includes("INVALID_SCORES")) return { error: "Los marcadores ingresados no son validos." };
    return { error: msg || "No se pudo guardar tu primer partido." };
  }
}
