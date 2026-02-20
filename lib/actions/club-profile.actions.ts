"use server";

import { revalidatePath } from "next/cache";
import { ClubService } from "@/services/club.service";

export async function updateClubProfileAction(formData: FormData) {
  const clubService = new ClubService();

  const club_id = String(formData.get("club_id") || "");
  const name = String(formData.get("name") || "");
  const address = String(formData.get("address") || "");
  const description = String(formData.get("description") || "");
  const access_type = String(formData.get("access_type") || "");
  const courts_count_raw = String(formData.get("courts_count") || "");
  const has_glass = String(formData.get("has_glass") || "") === "on";
  const has_synthetic_grass = String(formData.get("has_synthetic_grass") || "") === "on";
  const contact_first_name = String(formData.get("contact_first_name") || "");
  const contact_last_name = String(formData.get("contact_last_name") || "");
  const contact_phone = String(formData.get("contact_phone") || "");
  const avatar_url = String(formData.get("avatar_url") || "");

  if (!club_id || !name.trim()) {
    return { success: false as const, error: "Nombre de club obligatorio." };
  }

  const courtsCount = courts_count_raw.trim().length > 0 ? Number(courts_count_raw) : null;
  if (courtsCount !== null && (Number.isNaN(courtsCount) || courtsCount < 0)) {
    return { success: false as const, error: "Cantidad de canchas invalida." };
  }

  try {
    await clubService.updateClubProfile({
      club_id,
      name: name.trim(),
      address: address.trim() || undefined,
      description: description.trim() || undefined,
      access_type: access_type ? (access_type as "abierta" | "cerrada") : undefined,
      courts_count: courtsCount === null ? undefined : courtsCount,
      has_glass,
      has_synthetic_grass,
      contact_first_name: contact_first_name.trim() || undefined,
      contact_last_name: contact_last_name.trim() || undefined,
      contact_phone: contact_phone.trim() || undefined,
      avatar_url: avatar_url.trim() || undefined,
    });

    revalidatePath("/club");
    revalidatePath("/club/profile");
    revalidatePath("/club/matches");
    revalidatePath("/player/matches/new");

    return { success: true as const };
  } catch (error: any) {
    const raw = String(error?.message || "");
    if (raw.includes("NOT_ALLOWED")) {
      return { success: false as const, error: "No tienes permisos para editar este club." };
    }
    if (raw.includes("INVALID_ACCESS_TYPE")) {
      return { success: false as const, error: "Tipo de acceso invalido." };
    }
    if (raw.includes("INVALID_COURTS_COUNT")) {
      return { success: false as const, error: "Cantidad de canchas invalida." };
    }
    return { success: false as const, error: "No pudimos guardar los cambios." };
  }
}
