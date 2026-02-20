"use server";

import { createClient } from "@/lib/supabase/server";
import { PlayerService } from "@/services/player.service";
import { ClubService } from "@/services/club.service";
import { ClubAccessType } from "@/types/database";
import { revalidatePath } from "next/cache";

function mapErrorMessage(error: any) {
  const raw = String(error?.message || error || "UNKNOWN_ERROR");
  if (raw.includes("PHONE_REQUIRED")) return "El celular es obligatorio.";
  if (raw.includes("POSITION_REQUIRED")) return "La posicion es obligatoria.";
  if (raw.includes("INVALID_CATEGORY")) return "La categoria debe estar entre 1 y 7.";
  if (raw.includes("ONBOARDING_ALREADY_COMPLETED")) return "Tu perfil de jugador ya esta completo.";
  if (raw.includes("CLUB_NAME_REQUIRED")) return "El nombre del club es obligatorio.";
  if (raw.includes("INVALID_ACCESS_TYPE")) return "El tipo de club no es valido.";
  if (raw.includes("INVALID_COURTS_COUNT")) return "La cantidad de canchas no es valida.";
  return raw;
}

export async function completePlayerSignupOnboardingAction(input: {
  display_name: string;
  first_name: string;
  last_name: string;
  phone: string;
  position: "drive" | "reves" | "cualquiera";
  category: number;
  country_code?: string;
  region_code?: string;
  region_name?: string;
  city?: string;
  city_id?: string;
  birth_year?: number | null;
  avatar_url?: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false as const,
      error: "Necesitas iniciar sesion para continuar.",
      code: "NOT_AUTHENTICATED" as const,
    };
  }

  const playerService = new PlayerService();
  try {
    await playerService.completeOnboarding({
      ...input,
      country_code: input.country_code || "AR",
      birth_year: input.birth_year ?? undefined,
      avatar_url: input.avatar_url || undefined,
    });

    const claimCandidates = await playerService.findClaimCandidates({
      first_name: input.first_name,
      last_name: input.last_name,
      city: input.city,
      limit: 5,
    });

    revalidatePath("/player");
    revalidatePath("/player/profile");

    return {
      success: true as const,
      claimCandidates,
    };
  } catch (error) {
    return {
      success: false as const,
      error: mapErrorMessage(error),
      code: "PLAYER_ONBOARDING_ERROR" as const,
    };
  }
}

export async function completeClubSignupOnboardingAction(input: {
  name: string;
  country_code?: string;
  region_code?: string;
  region_name?: string;
  city?: string;
  city_id?: string;
  address?: string;
  description?: string;
  access_type: ClubAccessType;
  courts_count: number;
  has_glass: boolean;
  has_synthetic_grass: boolean;
  contact_first_name: string;
  contact_last_name: string;
  contact_phone: string;
  avatar_url?: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false as const,
      error: "Necesitas iniciar sesion para continuar.",
      code: "NOT_AUTHENTICATED" as const,
    };
  }

  const clubService = new ClubService();
  try {
    const createdClub = await clubService.completeClubOnboarding({
      ...input,
      country_code: input.country_code || "AR",
      avatar_url: input.avatar_url || undefined,
    });

    await clubService.requestClubClaim({
      clubId: createdClub.id,
      requester_first_name: input.contact_first_name,
      requester_last_name: input.contact_last_name,
      requester_phone: input.contact_phone,
      requester_email: user.email || "unknown@pasala.local",
      message: "Alta de club desde onboarding. Pendiente de validacion administrativa.",
    });

    const claimCandidates = await clubService.findClubClaimCandidates({
      name: input.name,
      city_id: input.city_id,
      region_code: input.region_code,
      exclude_club_id: createdClub.id,
      limit: 5,
    });

    revalidatePath("/welcome/claim/club");
    revalidatePath("/admin/club-claims");

    return {
      success: true as const,
      clubId: createdClub.id,
      claimCandidates,
    };
  } catch (error) {
    return {
      success: false as const,
      error: mapErrorMessage(error),
      code: "CLUB_ONBOARDING_ERROR" as const,
    };
  }
}
