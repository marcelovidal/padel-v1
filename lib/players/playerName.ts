/**
 * Resolución de nombre de jugador para la UI.
 *
 * Regla única de armado, en orden de prioridad:
 *   1. display_name si tiene valor
 *   2. first_name + last_name (last_name puede estar vacío)
 *   3. "Jugador"
 *
 * Nunca debe renderizarse la palabra "undefined".
 */

export type PlayerNameSource =
  | {
      first_name?: string | null;
      last_name?: string | null;
      display_name?: string | null;
    }
  | null
  | undefined;

/** Nombre real del jugador, o "" si no hay ninguno utilizable. */
function rawPlayerName(player: PlayerNameSource): string {
  if (!player || typeof player !== "object") return "";

  const display = String(player.display_name ?? "").trim();
  if (display) return display;

  return [player.first_name, player.last_name]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

export function resolvePlayerName(player: PlayerNameSource): string {
  return rawPlayerName(player) || "Jugador";
}

/**
 * Iniciales para el avatar: primera letra de cada palabra del nombre
 * resuelto, máximo 2. Sin nombre real, "?" (una sola).
 */
export function getPlayerInitials(player: PlayerNameSource): string {
  const name = rawPlayerName(player);
  if (!name) return "?";

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  return initials || "?";
}
