"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type FormState = { error?: string } | null;

export async function createMatchAsClubAction(
  _prevState: FormState,
  formData: FormData
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Necesitas iniciar sesion." };
  }

  const { data: club, error: clubError } = await (supabase as any)
    .from("clubs")
    .select("id,name")
    .eq("claimed_by", user.id)
    .eq("claim_status", "claimed")
    .is("deleted_at", null)
    .order("claimed_at", { ascending: false })
    .maybeSingle();

  if (clubError || !club) {
    return { error: "No encontramos un club reclamado para tu usuario." };
  }

  const date = String(formData.get("date") || "");
  const time = String(formData.get("time") || "");
  const maxPlayersRaw = String(formData.get("max_players") || "4");
  const notesRaw = String(formData.get("notes") || "").trim();

  if (!date || !time) {
    return { error: "Fecha y hora son obligatorias." };
  }

  const maxPlayers = Number(maxPlayersRaw);
  if (!Number.isInteger(maxPlayers) || maxPlayers < 2 || maxPlayers > 4) {
    return { error: "El maximo de jugadores debe estar entre 2 y 4." };
  }

  const matchAtISO = new Date(`${date}T${time}:00`).toISOString();
  if (Number.isNaN(new Date(matchAtISO).getTime())) {
    return { error: "Fecha y hora invalidas." };
  }

  const { data: created, error: insertError } = await (supabase as any)
    .rpc("club_create_match", {
      p_match_at: matchAtISO,
      p_max_players: maxPlayers,
      p_notes: notesRaw || null,
    });

  if (insertError || !created) {
    const raw = String(insertError?.message || "");
    if (raw.includes("CLUB_NOT_FOUND")) {
      return { error: "No encontramos un club reclamado para tu usuario." };
    }
    if (raw.includes("INVALID_MAX_PLAYERS")) {
      return { error: "El maximo de jugadores debe estar entre 2 y 4." };
    }
    if (raw.includes("INVALID_MATCH_AT")) {
      return { error: "Fecha y hora invalidas." };
    }
    return { error: insertError?.message || "No pudimos crear el partido." };
  }

  redirect(`/club/matches`);
}

export async function createMatchWithPlayersAsClubAction(
  _prevState: FormState,
  formData: FormData
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Necesitas iniciar sesion." };
  }

  const date = String(formData.get("date") || "");
  const time = String(formData.get("time") || "");
  const playerA1 = String(formData.get("player_a1_id") || "");
  const playerA2 = String(formData.get("player_a2_id") || "");
  const playerB1 = String(formData.get("player_b1_id") || "");
  const playerB2 = String(formData.get("player_b2_id") || "");
  const notesRaw = String(formData.get("notes") || "").trim();

  if (!date || !time) {
    return { error: "Fecha y hora son obligatorias." };
  }

  if (!playerA1 || !playerA2 || !playerB1 || !playerB2) {
    return { error: "Debes seleccionar los 4 jugadores." };
  }

  const uniquePlayers = new Set([playerA1, playerA2, playerB1, playerB2]);
  if (uniquePlayers.size !== 4) {
    return { error: "No puedes repetir jugadores." };
  }

  const matchAtISO = new Date(`${date}T${time}:00`).toISOString();
  if (Number.isNaN(new Date(matchAtISO).getTime())) {
    return { error: "Fecha y hora invalidas." };
  }

  const { data, error } = await (supabase as any).rpc("club_create_match_with_players", {
    p_match_at: matchAtISO,
    p_player_a1_id: playerA1,
    p_player_a2_id: playerA2,
    p_player_b1_id: playerB1,
    p_player_b2_id: playerB2,
    p_notes: notesRaw || null,
    p_max_players: 4,
  });

  if (error || !data) {
    const raw = String(error?.message || "");
    if (raw.includes("CLUB_NOT_FOUND")) return { error: "No encontramos un club reclamado para tu usuario." };
    if (raw.includes("PLAYER_NOT_FOUND")) return { error: "Uno o mas jugadores no existen o no estan activos." };
    if (raw.includes("DUPLICATE_PLAYERS")) return { error: "No puedes repetir jugadores." };
    if (raw.includes("INVALID_MATCH_AT")) return { error: "Fecha y hora invalidas." };
    return { error: error?.message || "No pudimos crear el partido." };
  }

  redirect(`/club/matches`);
}
