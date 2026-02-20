"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ClubService } from "@/services/club.service";

type ClubActionErrorCode =
  | "NOT_AUTHENTICATED"
  | "CLUB_NAME_REQUIRED"
  | "CLUB_NOT_FOUND"
  | "CLUB_ALREADY_CLAIMED"
  | "UNKNOWN";

function inferClubErrorCode(error: any): ClubActionErrorCode {
  const raw = [error?.message, error?.details, error?.hint, error?.code]
    .filter(Boolean)
    .join(" ");

  if (raw.includes("NOT_AUTHENTICATED")) return "NOT_AUTHENTICATED";
  if (raw.includes("CLUB_NAME_REQUIRED")) return "CLUB_NAME_REQUIRED";
  if (raw.includes("CLUB_NOT_FOUND")) return "CLUB_NOT_FOUND";
  if (raw.includes("CLUB_ALREADY_CLAIMED")) return "CLUB_ALREADY_CLAIMED";
  return "UNKNOWN";
}

function errorMessageFor(code: ClubActionErrorCode) {
  switch (code) {
    case "NOT_AUTHENTICATED":
      return "Necesitas iniciar sesion para continuar.";
    case "CLUB_NAME_REQUIRED":
      return "Ingresa el nombre del club.";
    case "CLUB_NOT_FOUND":
      return "No encontramos ese club.";
    case "CLUB_ALREADY_CLAIMED":
      return "Este club ya fue reclamado.";
    default:
      return "No pudimos completar la accion. Intenta nuevamente.";
  }
}

export async function searchClubsAction(input: { query: string; limit?: number }) {
  const clubService = new ClubService();

  try {
    const clubs = await clubService.searchClubs(input.query || "", input.limit || 20);
    return { success: true as const, data: clubs };
  } catch (error: any) {
    const code = inferClubErrorCode(error);
    return { success: false as const, code, error: errorMessageFor(code), data: [] };
  }
}

export async function createClubAction(input: {
  name: string;
  country_code?: string;
  region_code?: string;
  region_name?: string;
  city?: string;
  city_id?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false as const,
      code: "NOT_AUTHENTICATED" as const,
      error: errorMessageFor("NOT_AUTHENTICATED"),
    };
  }

  const clubService = new ClubService();

  try {
    const club = await clubService.createClub(input);
    revalidatePath("/player/matches/new");
    return { success: true as const, data: club };
  } catch (error: any) {
    const code = inferClubErrorCode(error);
    return { success: false as const, code, error: errorMessageFor(code) };
  }
}

export async function requestClubClaimAction(input: {
  clubId: string;
  message?: string;
  contactPhone?: string;
  next?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false as const,
      code: "NOT_AUTHENTICATED" as const,
      error: errorMessageFor("NOT_AUTHENTICATED"),
    };
  }

  const clubService = new ClubService();

  try {
    const requestId = await clubService.requestClubClaim({
      clubId: input.clubId,
      message: input.message,
      contactPhone: input.contactPhone,
    });

    revalidatePath("/player/matches/new");
    revalidatePath(`/welcome/claim/club?club_id=${input.clubId}`);

    return {
      success: true as const,
      requestId,
      redirectTo: input.next || "/player",
      message: "Solicitud enviada. Te vamos a contactar cuando se revise.",
    };
  } catch (error: any) {
    const code = inferClubErrorCode(error);
    return { success: false as const, code, error: errorMessageFor(code) };
  }
}
