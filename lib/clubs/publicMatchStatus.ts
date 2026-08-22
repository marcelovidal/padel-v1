/**
 * Estado publico de un partido de torneo o liga, para fixture y bracket.
 *
 * Cinco estados pensados para el jugador que mira como viene el torneo — no
 * para el club que tiene tareas pendientes. Por eso el vocabulario del panel
 * es otro: ahi "sin cargar" es una tarea; aca es informacion de contexto.
 *
 * Criterio de tiempo
 * ------------------
 * - scheduled_at manda, match_at es fallback. Las dos las escribe el mismo
 *   RPC de programacion y valen lo mismo, pero scheduled_at es la que edita
 *   el club y la que ya se muestra en el fixture: derivar de match_at
 *   mientras se muestra scheduled_at hacia que el chip y la fecha contaran
 *   cosas distintas.
 * - El turno dura slot_interval_minutes de la cancha con fallback a 90, la
 *   misma convencion de club_get_occupied_slots y club_get_agenda_slots.
 *   Sin cancha asignada, 90.
 * - "En curso" es estar entre el inicio y el fin del turno. NO se usa el
 *   margen de 5 minutos de getEffectiveStatus: un partido de 90 minutos no
 *   termino a los 5 de empezar.
 * - Las comparaciones son entre instantes absolutos (Date#getTime), asi que
 *   no dependen de la timezone del servidor. La zona solo entra al mostrar,
 *   y ahi va explicita: America/Argentina/Buenos_Aires.
 */

export type PublicMatchState =
  | "with_result"
  | "live"
  | "pending_result"
  | "upcoming"
  | "unscheduled";

/** Duracion por defecto del turno — la misma convencion que los RPCs. */
export const DEFAULT_MATCH_SLOT_MINUTES = 90;

const CLUB_TIME_ZONE = "America/Argentina/Buenos_Aires";

interface MatchLike {
  scheduled_at?: string | null;
  match_at?: string | null;
  match_results?: any;
}

export function resolvePublicMatchState(
  match: MatchLike | null | undefined,
  options: { slotIntervalMinutes?: number | null; now?: Date } = {}
): PublicMatchState {
  const result = Array.isArray(match?.match_results)
    ? ((match!.match_results[0] ?? null) as any)
    : ((match?.match_results ?? null) as any);
  if (result?.winner_team) return "with_result";

  const raw = match?.scheduled_at || match?.match_at;
  if (!raw) return "unscheduled";

  const start = new Date(raw);
  if (Number.isNaN(start.getTime())) return "unscheduled";

  const rawMinutes = Number(options.slotIntervalMinutes);
  const minutes =
    Number.isFinite(rawMinutes) && rawMinutes > 0
      ? rawMinutes
      : DEFAULT_MATCH_SLOT_MINUTES;
  const end = start.getTime() + minutes * 60 * 1000;
  const now = (options.now ?? new Date()).getTime();

  if (now >= end) return "pending_result";
  if (now >= start.getTime()) return "live";
  return "upcoming";
}

/** `Vie 14/8 · 19:30` — el turno en horario del club. */
export function formatMatchSlot(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  // Zona explicita: el servidor puede renderizar en UTC, y sin este campo la
  // hora sale corrida tres horas. Bug preexistente del formatWhen anterior.
  const day = date
    .toLocaleDateString("es-AR", {
      weekday: "short",
      day: "numeric",
      month: "numeric",
      timeZone: CLUB_TIME_ZONE,
    })
    .replace(/[.,]/g, "");
  const time = date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: CLUB_TIME_ZONE,
  });

  return `${day.charAt(0).toUpperCase()}${day.slice(1)} · ${time}`;
}
