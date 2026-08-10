"use server";

import { revalidatePath } from "next/cache";
import { requireClubOwner } from "@/lib/auth";
import { ClubAdminsService } from "@/services/club-admins.service";

type ClubAdminErrorCode =
  | "NOT_AUTHENTICATED"
  | "NOT_ALLOWED"
  | "CLUB_NOT_FOUND"
  | "PLAYER_NOT_FOUND"
  | "ALREADY_ADMIN"
  | "NOT_AN_ADMIN"
  | "CANNOT_REMOVE_SELF"
  | "LAST_ADMIN"
  | "RPC_NOT_FOUND"
  | "UNKNOWN";

function inferClubAdminErrorCode(error: any): ClubAdminErrorCode {
  const raw = [error?.message, error?.details, error?.hint, error?.code]
    .filter(Boolean)
    .join(" ");

  if (raw.includes("NOT_AUTHENTICATED")) return "NOT_AUTHENTICATED";
  if (raw.includes("NOT_ALLOWED")) return "NOT_ALLOWED";
  if (raw.includes("CLUB_NOT_FOUND")) return "CLUB_NOT_FOUND";
  if (raw.includes("PLAYER_NOT_FOUND")) return "PLAYER_NOT_FOUND";
  if (raw.includes("ALREADY_ADMIN")) return "ALREADY_ADMIN";
  if (raw.includes("CANNOT_REMOVE_SELF")) return "CANNOT_REMOVE_SELF";
  if (raw.includes("LAST_ADMIN")) return "LAST_ADMIN";
  if (raw.includes("NOT_AN_ADMIN")) return "NOT_AN_ADMIN";
  if (raw.includes("PGRST202") || raw.includes("Could not find the function")) return "RPC_NOT_FOUND";
  return "UNKNOWN";
}

function errorMessageFor(code: ClubAdminErrorCode) {
  switch (code) {
    case "NOT_AUTHENTICATED":
      return "Necesitas iniciar sesion para continuar.";
    case "NOT_ALLOWED":
      return "No tienes permisos para esta accion.";
    case "CLUB_NOT_FOUND":
      return "El club no existe o ya no esta disponible.";
    case "PLAYER_NOT_FOUND":
      return "El jugador seleccionado no es valido o no esta activo.";
    case "ALREADY_ADMIN":
      return "Ese jugador ya es administrador del club.";
    case "NOT_AN_ADMIN":
      return "Ese jugador no es administrador del club.";
    case "CANNOT_REMOVE_SELF":
      return "No podes quitarte a vos mismo. Pedile a otro administrador que lo haga.";
    case "LAST_ADMIN":
      return "El club no puede quedarse sin administradores.";
    case "RPC_NOT_FOUND":
      return "Falta una funcion de base de datos requerida. Ejecuta las migraciones pendientes y recarga el esquema.";
    default:
      return "No pudimos completar la accion. Intenta nuevamente.";
  }
}

export async function addClubAdminAction(formData: FormData) {
  const { club } = await requireClubOwner();
  const playerId = String(formData.get("player_id") || "").trim();

  if (!playerId) {
    return { success: false as const, error: "Elegi un jugador para agregar." };
  }

  const service = new ClubAdminsService();
  try {
    await service.addAdmin(club.id, playerId);
  } catch (error: any) {
    return { success: false as const, error: errorMessageFor(inferClubAdminErrorCode(error)) };
  }

  revalidatePath("/player/mi-club/ajustes");
  revalidatePath("/player/mi-club");
  return { success: true as const };
}

export async function removeClubAdminAction(formData: FormData) {
  const { club } = await requireClubOwner();
  const playerId = String(formData.get("player_id") || "").trim();

  if (!playerId) {
    return { success: false as const, error: "No pudimos identificar al administrador." };
  }

  const service = new ClubAdminsService();
  try {
    await service.removeAdmin(club.id, playerId);
  } catch (error: any) {
    return { success: false as const, error: errorMessageFor(inferClubAdminErrorCode(error)) };
  }

  revalidatePath("/player/mi-club/ajustes");
  revalidatePath("/player/mi-club");
  return { success: true as const };
}
