"use server";

import { revalidatePath } from "next/cache";
import { RegistrationsService } from "@/services/registrations.service";
import type {
  PhoneCandidate,
  PublicRegistrationResult,
} from "@/services/registrations.service";
import { normalizePhone } from "@/lib/utils/phone";

/**
 * Inscripcion publica a un torneo o liga, sin cuenta.
 *
 * La ambiguedad de telefono no es un error del usuario: es informacion. Cuando
 * dos jugadores comparten numero, la accion devuelve los candidatos para que la
 * UI haga elegir, en vez de fallar con un mensaje.
 */

export type PublicRegistrationSide = "a" | "b";

export type PublicRegistrationActionResult =
  | { ok: true; result: PublicRegistrationResult }
  | {
      ok: false;
      /** Cual de los dos jugadores necesita desambiguarse. */
      side: PublicRegistrationSide;
      candidates: PhoneCandidate[];
      error: string;
    }
  | { ok: false; error: string; field?: string };

const ERROR_MESSAGES: Record<string, string> = {
  TOURNAMENT_NOT_FOUND: "No encontramos el torneo.",
  LEAGUE_NOT_FOUND: "No encontramos la liga.",
  TOURNAMENT_NOT_OPEN: "Las inscripciones a este torneo estan cerradas.",
  LEAGUE_NOT_OPEN: "Las inscripciones a esta liga estan cerradas.",
  SAME_PLAYER_TWICE: "Los dos jugadores son la misma persona. Revisa los datos.",
  PLAYER_A_ALREADY_REGISTERED: "Ya hay una inscripcion con esos datos.",
  PLAYER_B_ALREADY_REGISTERED: "Tu companero ya figura en otra inscripcion.",
  INVALID_NAME_A: "Completa tu nombre y apellido.",
  INVALID_NAME_B: "Completa el nombre y apellido de tu companero.",
  INVALID_PHONE_A: "Revisa tu numero de celular.",
  INVALID_PHONE_B: "Revisa el numero de tu companero.",
  INVALID_SELECTION_A: "El perfil elegido no corresponde a ese numero.",
  INVALID_SELECTION_B: "El perfil elegido no corresponde a ese numero.",
};

function codeFrom(error: any): string | null {
  const raw = [error?.message, error?.details, error?.hint].filter(Boolean).join(" ");
  const known = Object.keys(ERROR_MESSAGES).find((key) => raw.includes(key));
  if (known) return known;
  if (raw.includes("AMBIGUOUS_PHONE_A")) return "AMBIGUOUS_PHONE_A";
  if (raw.includes("AMBIGUOUS_PHONE_B")) return "AMBIGUOUS_PHONE_B";
  return null;
}

function readSide(formData: FormData, side: PublicRegistrationSide) {
  return {
    first_name: String(formData.get(`${side}_first_name`) || "").trim(),
    last_name: String(formData.get(`${side}_last_name`) || "").trim(),
    phone: String(formData.get(`${side}_phone`) || "").trim(),
    player_id: (String(formData.get(`${side}_player_id`) || "").trim() || null) as string | null,
  };
}

export async function requestPublicRegistrationAction(
  formData: FormData
): Promise<PublicRegistrationActionResult> {
  const kind = String(formData.get("kind") || "") as "tournament" | "league";
  const eventId = String(formData.get("event_id") || "");

  if (kind !== "tournament" && kind !== "league") {
    return { ok: false, error: "Evento invalido." };
  }
  if (!eventId) {
    return { ok: false, error: "Falta el evento." };
  }

  const a = readSide(formData, "a");
  const b = readSide(formData, "b");

  // Se valida antes de llegar a la base para dar el mensaje en el campo
  // correcto. La base vuelve a validar igual: esto es comodidad, no seguridad.
  for (const [side, person, label] of [
    ["a", a, "tuyo"],
    ["b", b, "de tu companero"],
  ] as const) {
    if (!person.first_name || !person.last_name) {
      return {
        ok: false,
        error: `Completa el nombre y apellido ${label}.`,
        field: `${side}_first_name`,
      };
    }
    if (!normalizePhone(person.phone).valid) {
      return {
        ok: false,
        error: `Revisa el celular ${label}. Puede ir con o sin 0, 15 y +54.`,
        field: `${side}_phone`,
      };
    }
  }

  const service = new RegistrationsService();

  try {
    const result = await service.requestPublicRegistration(kind, eventId, {
      a_first_name: a.first_name,
      a_last_name: a.last_name,
      a_phone: a.phone,
      a_player_id: a.player_id,
      b_first_name: b.first_name,
      b_last_name: b.last_name,
      b_phone: b.phone,
      b_player_id: b.player_id,
    });

    // La inscripcion nueva tiene que verse en el panel del club sin esperar.
    revalidatePath(
      kind === "tournament"
        ? `/player/mi-club/dashboard/tournaments/${eventId}`
        : `/player/mi-club/dashboard/leagues/${eventId}`
    );

    return { ok: true, result };
  } catch (error: any) {
    const code = codeFrom(error);

    // Dos jugadores comparten ese numero. No se adivina: se devuelven los
    // candidatos y elige la persona.
    if (code === "AMBIGUOUS_PHONE_A" || code === "AMBIGUOUS_PHONE_B") {
      const side: PublicRegistrationSide = code === "AMBIGUOUS_PHONE_A" ? "a" : "b";
      const phone = side === "a" ? a.phone : b.phone;

      let candidates: PhoneCandidate[] = [];
      try {
        candidates = await service.findPlayersByPhone(phone);
      } catch {
        // Si ni los candidatos se pueden leer, cae al mensaje generico de abajo.
      }

      if (candidates.length > 0) {
        return {
          ok: false,
          side,
          candidates,
          error:
            side === "a"
              ? "Encontramos mas de un jugador con tu numero. Deci cual sos."
              : "Encontramos mas de un jugador con ese numero. Eligi cual es tu companero.",
        };
      }
    }

    if (code) return { ok: false, error: ERROR_MESSAGES[code] ?? code };

    console.error("[public-registration] error inesperado:", error?.message || error);
    return { ok: false, error: "No pudimos registrar la inscripcion. Intenta de nuevo." };
  }
}
