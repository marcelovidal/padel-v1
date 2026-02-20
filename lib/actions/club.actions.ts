"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ClubService } from "@/services/club.service";

type ClubActionErrorCode =
  | "NOT_AUTHENTICATED"
  | "NOT_ALLOWED"
  | "CLUB_NAME_REQUIRED"
  | "CLUB_NOT_FOUND"
  | "CLUB_ALREADY_CLAIMED"
  | "CLUB_CLAIM_IN_REVIEW"
  | "INVALID_REQUESTER_DATA"
  | "REQUEST_NOT_FOUND"
  | "INVALID_DECISION"
  | "UNKNOWN";

function inferClubErrorCode(error: any): ClubActionErrorCode {
  const raw = [error?.message, error?.details, error?.hint, error?.code]
    .filter(Boolean)
    .join(" ");

  if (raw.includes("NOT_AUTHENTICATED")) return "NOT_AUTHENTICATED";
  if (raw.includes("NOT_ALLOWED")) return "NOT_ALLOWED";
  if (raw.includes("CLUB_NAME_REQUIRED")) return "CLUB_NAME_REQUIRED";
  if (raw.includes("CLUB_NOT_FOUND")) return "CLUB_NOT_FOUND";
  if (raw.includes("CLUB_ALREADY_CLAIMED")) return "CLUB_ALREADY_CLAIMED";
  if (raw.includes("CLUB_CLAIM_IN_REVIEW")) return "CLUB_CLAIM_IN_REVIEW";
  if (raw.includes("INVALID_REQUESTER_DATA")) return "INVALID_REQUESTER_DATA";
  if (raw.includes("REQUEST_NOT_FOUND")) return "REQUEST_NOT_FOUND";
  if (raw.includes("INVALID_DECISION")) return "INVALID_DECISION";
  return "UNKNOWN";
}

function errorMessageFor(code: ClubActionErrorCode) {
  switch (code) {
    case "NOT_AUTHENTICATED":
      return "Necesitas iniciar sesion para continuar.";
    case "NOT_ALLOWED":
      return "No tienes permisos para realizar esta accion.";
    case "CLUB_NAME_REQUIRED":
      return "Ingresa el nombre del club.";
    case "CLUB_NOT_FOUND":
      return "No encontramos ese club.";
    case "CLUB_ALREADY_CLAIMED":
      return "Este club ya fue reclamado.";
    case "CLUB_CLAIM_IN_REVIEW":
      return "Este club ya tiene un reclamo en revision.";
    case "INVALID_REQUESTER_DATA":
      return "Completa nombre, apellido, celular y email validos.";
    case "REQUEST_NOT_FOUND":
      return "No encontramos la solicitud o ya fue resuelta.";
    case "INVALID_DECISION":
      return "La accion seleccionada no es valida.";
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
  requesterFirstName: string;
  requesterLastName: string;
  requesterPhone: string;
  requesterEmail: string;
  message?: string;
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
      requester_first_name: input.requesterFirstName,
      requester_last_name: input.requesterLastName,
      requester_phone: input.requesterPhone,
      requester_email: input.requesterEmail,
      message: input.message,
    });

    revalidatePath("/player/matches/new");
    revalidatePath(`/welcome/claim/club?club_id=${input.clubId}`);
    revalidatePath("/admin/club-claims");

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

export async function resolveClubClaimAction(input: {
  requestId: string;
  action: "approved" | "rejected";
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false as const,
        code: "NOT_AUTHENTICATED" as const,
        error: errorMessageFor("NOT_AUTHENTICATED"),
      };
    }

    const { data: profile, error: profileError } = await (supabase as any)
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile || profile.role !== "admin") {
      return {
        success: false as const,
        code: "NOT_ALLOWED" as const,
        error: errorMessageFor("NOT_ALLOWED"),
      };
    }

    const clubService = new ClubService();
    await clubService.resolveClaimRequest(input.requestId, input.action);

    revalidatePath("/admin/club-claims");
    revalidatePath("/player/matches/new");

    return { success: true as const };
  } catch (error: any) {
    const code = inferClubErrorCode(error);
    return { success: false as const, code, error: errorMessageFor(code) };
  }
}
