/**
 * Helpers de presentacion compartidos entre la pagina publica de torneo y la de
 * liga. Van juntos porque las dos paginas muestran lo mismo con otra etiqueta, y
 * tener dos copias de `formatDateRange` es como empiezan las divergencias.
 */

/** Arma el resolvedor de nombre de pareja para un set de equipos dado. */
export function makeTeamLabeller(teams: any[], playersMap: Map<string, string>) {
  const byId = new Map(teams.map((t) => [t.id as string, t]));

  return (teamId: string | null): string => {
    if (!teamId) return "Por definir";
    const team = byId.get(teamId);
    if (!team) return "Por definir";
    const a = playersMap.get(team.player_id_a) || "Jugador";
    const b = playersMap.get(team.player_id_b) || "Jugador";
    return `${a} / ${b}`;
  };
}

/** `12/08 – 30/08/2026`, o un solo extremo si falta el otro. */
export function formatDateRange(start?: string | null, end?: string | null): string | null {
  const startDate = parseDate(start);
  const endDate = parseDate(end);

  if (!startDate && !endDate) return null;
  if (startDate && !endDate) return `Desde el ${formatLong(startDate)}`;
  if (!startDate && endDate) return `Hasta el ${formatLong(endDate)}`;

  return `${formatShort(startDate!)} – ${formatLong(endDate!)}`;
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  // Las columnas son `date`, sin hora. Interpretarlas como UTC y despues
  // formatear en local corre la fecha un dia hacia atras en Argentina, asi que
  // se fuerza mediodia.
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatShort(date: Date) {
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}

function formatLong(date: Date) {
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function categoryLabel(value?: number | null): string | null {
  if (value === null || value === undefined) return null;
  return `Categoría ${value}`;
}

export function divisionModeLabel(mode?: string | null, value?: number | null): string | null {
  if (mode === "OPEN") return "Abierta";
  if (mode === "SINGLE") return value ? `Categoría ${value}` : "Categoría única";
  if (mode === "SUM") return value ? `Suma ${value}` : "Suma de categorías";
  return null;
}

/** Iniciales del club para el placeholder del logo. */
export function clubInitials(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "CL";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
