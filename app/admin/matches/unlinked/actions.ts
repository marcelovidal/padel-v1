"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type SetMatchClubState =
  | { success: true; message: string }
  | { success: false; error: string }
  | { success: null };

export async function setUnlinkedMatchClubAction(
  _prevState: SetMatchClubState | null,
  formData: FormData
): Promise<SetMatchClubState> {
  await requireAdmin();

  const matchId = String(formData.get("match_id") || "").trim();
  const clubId = String(formData.get("club_id") || "").trim();
  const clubNameRaw = String(formData.get("club_name_raw") || "").trim();

  if (!matchId || !clubId) {
    return { success: false, error: "Faltan datos para asignar el club." };
  }

  const supabase = await createClient();
  const { error } = await (supabase as any).rpc("admin_set_match_club", {
    p_match_id: matchId,
    p_club_id: clubId,
    p_club_name_raw: clubNameRaw || null,
  });

  if (error) {
    return {
      success: false,
      error: "No se pudo asignar el club al partido.",
    };
  }

  revalidatePath("/admin/matches");
  revalidatePath("/admin/matches/unlinked");
  return { success: true, message: "Club asignado al partido." };
}
