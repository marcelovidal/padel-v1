import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Lectura publica de torneos y ligas.
 *
 * Por que admin client
 * --------------------
 * Las policies de `club_tournaments` y `club_leagues` son `TO authenticated`.
 * Sin sesion no se lee nada. Como estas paginas tienen que abrirse desde un
 * link de WhatsApp sin cuenta, se sirven con service role y el filtro de
 * visibilidad va EXPLICITO en cada query. No hay RLS abajo que lo garantice:
 * si alguien saca el `.neq("status", "draft")`, expone borradores.
 *
 * Es la misma decision que ya tomo lib/clubs/publicClub.ts para el perfil del
 * club, y es deliberadamente mas controlada que aflojar las policies.
 *
 * Proyeccion
 * ----------
 * De `players` se leen SOLO `id`, `display_name` y `category`. Ni telefono, ni
 * email, ni ciudad. Estas paginas son publicas de verdad: cualquiera con el
 * link las ve, y un dato personal filtrado aca no se puede recoger.
 */

const PLAYER_PUBLIC_COLUMNS = "id,display_name,category";

export type PublicEventStatus = "active" | "finished";

/**
 * `registrations_open` es lo unico que decide si se muestra el formulario. Las
 * dos fechas de inscripcion son informativas: se muestran, no deciden. Y son
 * distintas de start_date/end_date, que son las del evento.
 */
type PublicRegistrationFields = {
  registrations_open: boolean | null;
  registration_start_date: string | null;
  registration_end_date: string | null;
};

export type PublicTournament = PublicRegistrationFields & {
  id: string;
  club_id: string;
  name: string;
  season_label: string | null;
  description: string | null;
  status: PublicEventStatus;
  target_category_int: number | null;
  allow_lower_category: boolean | null;
  start_date: string | null;
  end_date: string | null;
};

export type PublicLeague = PublicRegistrationFields & {
  id: string;
  club_id: string;
  name: string;
  season_label: string | null;
  description: string | null;
  status: PublicEventStatus;
  start_date: string | null;
  end_date: string | null;
};

export type PublicGroupTableRow = {
  team_id: string;
  played: number;
  wins: number;
  losses: number;
  points: number;
  sets_won: number;
  sets_lost: number;
};

export type PublicGroup = {
  id: string;
  name: string;
  table: PublicGroupTableRow[];
  matches: any[];
};

/** Resumen para listar torneos y ligas en el perfil del club. */
export type PublicEventSummary = {
  kind: "tournament" | "league";
  id: string;
  name: string;
  season_label: string | null;
  status: PublicEventStatus;
  registrations_open: boolean | null;
  start_date: string | null;
  end_date: string | null;
};

// Si un campo no esta aca, no llega a la pagina. Las tres columnas de
// inscripcion van explicitas por eso.
const REGISTRATION_COLUMNS = "registrations_open,registration_start_date,registration_end_date";
const TOURNAMENT_COLUMNS =
  `id,club_id,name,season_label,description,status,target_category_int,allow_lower_category,start_date,end_date,${REGISTRATION_COLUMNS}`;
const LEAGUE_COLUMNS =
  `id,club_id,name,season_label,description,status,start_date,end_date,${REGISTRATION_COLUMNS}`;

/**
 * Mapa id → nombre para las parejas. Se arma con una sola query en vez de un
 * join por tabla porque los ids salen de tres lados (equipos, fixture y
 * playoffs) y varios se repiten.
 */
async function buildPlayersMap(
  supabase: any,
  playerIds: string[]
): Promise<Map<string, string>> {
  const unique = Array.from(new Set(playerIds.filter(Boolean)));
  if (unique.length === 0) return new Map();

  const { data } = await supabase
    .from("players")
    .select(PLAYER_PUBLIC_COLUMNS)
    .in("id", unique);

  return new Map(
    ((data || []) as any[]).map((p) => [p.id as string, (p.display_name || "Jugador") as string])
  );
}

/** Un evento en `draft` no existe para el publico. */
function isPublicStatus(status: unknown): status is PublicEventStatus {
  return status === "active" || status === "finished";
}

// ─── Torneo ──────────────────────────────────────────────────────────────────

export async function findPublicTournament(clubId: string, tournamentId: string) {
  const supabase = createAdminClient();

  const { data: tournament } = await (supabase as any)
    .from("club_tournaments")
    .select(TOURNAMENT_COLUMNS)
    .eq("id", tournamentId)
    .eq("club_id", clubId)
    .neq("status", "draft")
    .maybeSingle();

  if (!tournament || !isPublicStatus(tournament.status)) return null;

  const [{ data: groups }, { data: teams }, { data: playoffMatches }] = await Promise.all([
    (supabase as any)
      .from("tournament_groups")
      .select("id,name,sort_order")
      .eq("tournament_id", tournamentId)
      .order("sort_order", { ascending: true }),
    (supabase as any)
      .from("tournament_teams")
      .select("id,player_id_a,player_id_b,entry_category_int")
      .eq("tournament_id", tournamentId)
      .order("created_at", { ascending: true }),
    (supabase as any)
      .from("tournament_playoff_matches")
      .select(
        "id,stage,stage_order,match_order,team_a_id,team_b_id,winner_team_id,match_id,scheduled_at,matches(id,match_at,status,match_results(match_id,sets,winner_team))"
      )
      .eq("tournament_id", tournamentId)
      .order("stage_order", { ascending: true })
      .order("match_order", { ascending: true }),
  ]);

  const groupIds = ((groups || []) as any[]).map((g) => g.id);

  const { data: matches } = groupIds.length
    ? await (supabase as any)
        .from("tournament_matches")
        .select(
          "id,group_id,round_index,team_a_id,team_b_id,scheduled_at,matches(id,match_at,status,match_results(match_id,sets,winner_team)),court:club_courts(id,name,slot_interval_minutes)"
        )
        .in("group_id", groupIds)
        .order("round_index", { ascending: true })
        .order("created_at", { ascending: true })
    : { data: [] };

  // El RPC ya devuelve las filas ordenadas por posicion — el orden es el
  // ranking, no un detalle de presentacion.
  const tables = await Promise.all(
    groupIds.map(async (groupId: string) => {
      const { data } = await (supabase as any).rpc("club_get_tournament_group_table", {
        p_group_id: groupId,
      });
      return { groupId, rows: (data || []) as PublicGroupTableRow[] };
    })
  );
  const tableByGroup = new Map(tables.map((t) => [t.groupId, t.rows]));

  const teamRows = (teams || []) as any[];
  const playersMap = await buildPlayersMap(
    supabase,
    teamRows.flatMap((t) => [t.player_id_a, t.player_id_b])
  );

  const publicGroups: PublicGroup[] = ((groups || []) as any[]).map((g) => ({
    id: g.id,
    name: g.name,
    table: tableByGroup.get(g.id) || [],
    matches: ((matches || []) as any[]).filter((m) => m.group_id === g.id),
  }));

  return {
    tournament: tournament as PublicTournament,
    groups: publicGroups,
    teams: teamRows,
    playoffMatches: (playoffMatches || []) as any[],
    playersMap,
  };
}

// ─── Liga ────────────────────────────────────────────────────────────────────

export async function findPublicLeague(clubId: string, leagueId: string) {
  const supabase = createAdminClient();

  const { data: league } = await (supabase as any)
    .from("club_leagues")
    .select(LEAGUE_COLUMNS)
    .eq("id", leagueId)
    .eq("club_id", clubId)
    .neq("status", "draft")
    .maybeSingle();

  if (!league || !isPublicStatus(league.status)) return null;

  const { data: divisions } = await (supabase as any)
    .from("league_divisions")
    .select("id,name,category_mode,category_value_int")
    .eq("league_id", leagueId)
    .order("created_at", { ascending: true });

  const divisionIds = ((divisions || []) as any[]).map((d) => d.id);
  if (divisionIds.length === 0) {
    return {
      league: league as PublicLeague,
      divisions: [],
      teams: [],
      playersMap: new Map<string, string>(),
    };
  }

  const [{ data: groups }, { data: teams }, { data: playoffMatches }] = await Promise.all([
    (supabase as any)
      .from("league_groups")
      .select("id,name,division_id,sort_order")
      .in("division_id", divisionIds)
      .order("sort_order", { ascending: true }),
    (supabase as any)
      .from("league_teams")
      .select("id,division_id,player_id_a,player_id_b,entry_category_int")
      .in("division_id", divisionIds)
      .order("created_at", { ascending: true }),
    (supabase as any)
      .from("league_playoff_matches")
      .select(
        "id,division_id,stage,stage_order,match_order,team_a_id,team_b_id,winner_team_id,match_id,scheduled_at,matches(id,match_at,status,match_results(match_id,sets,winner_team))"
      )
      .in("division_id", divisionIds)
      .order("stage_order", { ascending: true })
      .order("match_order", { ascending: true }),
  ]);

  const groupIds = ((groups || []) as any[]).map((g) => g.id);

  const { data: matches } = groupIds.length
    ? await (supabase as any)
        .from("league_matches")
        .select(
          "id,group_id,round_index,team_a_id,team_b_id,scheduled_at,matches(id,match_at,status,match_results(match_id,sets,winner_team)),court:club_courts(id,name,slot_interval_minutes)"
        )
        .in("group_id", groupIds)
        .order("round_index", { ascending: true })
        .order("created_at", { ascending: true })
    : { data: [] };

  const tables = await Promise.all(
    groupIds.map(async (groupId: string) => {
      const { data } = await (supabase as any).rpc("club_get_group_table", {
        p_group_id: groupId,
      });
      return { groupId, rows: (data || []) as PublicGroupTableRow[] };
    })
  );
  const tableByGroup = new Map(tables.map((t) => [t.groupId, t.rows]));

  const teamRows = (teams || []) as any[];
  const playersMap = await buildPlayersMap(
    supabase,
    teamRows.flatMap((t) => [t.player_id_a, t.player_id_b])
  );

  const publicDivisions = ((divisions || []) as any[]).map((d) => ({
    id: d.id,
    name: d.name,
    category_mode: d.category_mode,
    category_value_int: d.category_value_int,
    groups: ((groups || []) as any[])
      .filter((g) => g.division_id === d.id)
      .map((g) => ({
        id: g.id,
        name: g.name,
        table: tableByGroup.get(g.id) || [],
        matches: ((matches || []) as any[]).filter((m) => m.group_id === g.id),
      })) as PublicGroup[],
    playoffMatches: ((playoffMatches || []) as any[]).filter((pm) => pm.division_id === d.id),
  }));

  return {
    league: league as PublicLeague,
    divisions: publicDivisions,
    teams: teamRows,
    playersMap,
  };
}

// ─── Listado para el perfil del club ─────────────────────────────────────────

/**
 * Torneos y ligas visibles del club, separados en los tres grupos que muestra
 * el perfil: abiertos a inscripcion, en juego y ediciones anteriores.
 *
 * El status manda: un evento finished va a `past` aunque el club haya dejado
 * `registrations_open` en true — la UI no contradice lo que ya cerro. Entre
 * activos decide el flag, con el mismo fallback `?? true` del resto de las
 * paginas publicas: sin la columna —migracion 20260819 sin aplicar— todo
 * activo cuenta como recibiendo inscripciones.
 *
 * Un evento puede estar abierto Y jugando a la vez; en ese caso aparece solo
 * en `open` porque la inscripcion es lo accionable para el jugador.
 */
export async function listPublicClubEvents(clubId: string) {
  const supabase = createAdminClient();

  const [{ data: tournaments }, { data: leagues }] = await Promise.all([
    (supabase as any)
      .from("club_tournaments")
      .select("id,name,season_label,status,registrations_open,start_date,end_date")
      .eq("club_id", clubId)
      .neq("status", "draft")
      .order("start_date", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false }),
    (supabase as any)
      .from("club_leagues")
      .select("id,name,season_label,status,registrations_open,start_date,end_date")
      .eq("club_id", clubId)
      .neq("status", "draft")
      .order("start_date", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false }),
  ]);

  const all: PublicEventSummary[] = [
    ...((tournaments || []) as any[]).map((t) => ({ ...t, kind: "tournament" as const })),
    ...((leagues || []) as any[]).map((l) => ({ ...l, kind: "league" as const })),
  ].filter((e) => isPublicStatus(e.status));

  return {
    open: all.filter((e) => e.status === "active" && (e.registrations_open ?? true)),
    inPlay: all.filter((e) => e.status === "active" && !(e.registrations_open ?? true)),
    past: all.filter((e) => e.status === "finished"),
  };
}

// ─── Rutas ───────────────────────────────────────────────────────────────────

export function publicTournamentHref(clubSlugOrId: string, tournamentId: string) {
  return `/clubs/${clubSlugOrId}/torneos/${tournamentId}`;
}

export function publicLeagueHref(clubSlugOrId: string, leagueId: string) {
  return `/clubs/${clubSlugOrId}/ligas/${leagueId}`;
}

export function publicEventHref(clubSlugOrId: string, event: PublicEventSummary) {
  return event.kind === "tournament"
    ? publicTournamentHref(clubSlugOrId, event.id)
    : publicLeagueHref(clubSlugOrId, event.id);
}
