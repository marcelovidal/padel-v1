import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClub } from "@/lib/auth";
import { LeaguesService } from "@/services/leagues.service";
import { PlayerService } from "@/services/player.service";
import { BookingService } from "@/services/booking.service";
import { LeagueMatchScheduleForm } from "@/components/club/LeagueMatchScheduleForm";
import {
  assignTeamToGroupAction,
  autoCreateGroupsAction,
  generateFixtureAction,
  reopenDivisionFixtureForEditAction,
  removeLeagueTeamAction,
  registerLeagueTeamAction,
  updateLeagueStatusAction,
} from "@/lib/actions/leagues.actions";

function teamLabel(team: any, playersMap: Map<string, string>) {
  const a = playersMap.get(team.player_id_a) || team.player_id_a;
  const b = playersMap.get(team.player_id_b) || team.player_id_b;
  return `${a} / ${b}`;
}

function leagueStatusLabel(status: "draft" | "active" | "finished") {
  if (status === "draft") return "Borrador";
  if (status === "active") return "Activa";
  return "Finalizada";
}

function divisionModeLabel(mode: "OPEN" | "SINGLE" | "SUM") {
  if (mode === "OPEN") return "Abierta";
  if (mode === "SINGLE") return "Categoria unica";
  return "Suma";
}

function toInputDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toInputTime(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function toHumanDateTime(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function lightGroupBgByName(groupName: string) {
  const normalized = String(groupName || "").trim().toUpperCase().replace(/^GRUPO\s+/, "");
  if (normalized === "A") return "bg-[#EAF5FF] border-[#B6D8FF] border-l-[#1D9BF0]";
  if (normalized === "B") return "bg-[#EAFBF3] border-[#BDECD2] border-l-[#10B981]";
  if (normalized === "C") return "bg-[#FFF8E8] border-[#FDE7B2] border-l-[#F59E0B]";
  if (normalized === "D") return "bg-[#FFF0F3] border-[#FBC6D2] border-l-[#F43F5E]";
  if (normalized === "E") return "bg-[#F3F0FF] border-[#D9CCFF] border-l-[#8B5CF6]";
  const palette = [
    "bg-[#EAF5FF] border-[#B6D8FF] border-l-[#1D9BF0]",
    "bg-[#EAFBF3] border-[#BDECD2] border-l-[#10B981]",
    "bg-[#FFF8E8] border-[#FDE7B2] border-l-[#F59E0B]",
    "bg-[#FFF0F3] border-[#FBC6D2] border-l-[#F43F5E]",
    "bg-[#F3F0FF] border-[#D9CCFF] border-l-[#8B5CF6]",
  ];
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) hash += normalized.charCodeAt(i);
  return palette[hash % palette.length];
}

export default async function ClubLeagueDetailPage({
  params,
  searchParams,
}: {
  params: { leagueId: string };
  searchParams?: {
    ok?: string;
    error?: string;
    debug?: string;
    removed_matches?: string;
    removed_bookings?: string;
  };
}) {
  const { leagueId } = params;
  const { club } = await requireClub();

  const leaguesService = new LeaguesService();
  const bookingService = new BookingService();
  const playerService = new PlayerService();

  const [league, divisions, players, courts, bookingSettings] = await Promise.all([
    leaguesService.getLeagueById(leagueId),
    leaguesService.listDivisions(leagueId),
    playerService.searchPlayersWeighted("", 200),
    bookingService.listActiveClubCourts(club.id),
    bookingService.getClubBookingSettings(club.id),
  ]);

  if (!league || league.club_id !== club.id) {
    return notFound();
  }

  const playersMap = new Map<string, string>();
  for (const p of players || []) {
    playersMap.set(p.id, p.display_name || `${p.first_name || ""} ${p.last_name || ""}`.trim());
  }

  const divisionData = await Promise.all(
    divisions.map(async (division) => {
      const [teams, groups] = await Promise.all([
        leaguesService.listTeams(division.id),
        leaguesService.listGroups(division.id),
      ]);

      const groupData = await Promise.all(
        groups.map(async (group) => {
          const [groupTeams, table] = await Promise.all([
            leaguesService.listGroupTeams(group.id),
            leaguesService.getGroupTable(group.id),
          ]);
          return { group, groupTeams, table };
        })
      );

      return { division, teams, groups, groupData };
    })
  );

  const leagueMatches = await leaguesService.listLeagueMatches(leagueId);
  const submitRegisterTeam = async (formData: FormData) => {
    "use server";
    await registerLeagueTeamAction(formData);
  };
  const submitAutoGroups = async (formData: FormData) => {
    "use server";
    await autoCreateGroupsAction(formData);
  };
  const submitGenerateFixture = async (formData: FormData) => {
    "use server";
    await generateFixtureAction(formData);
  };
  const submitAssignTeamToGroup = async (formData: FormData) => {
    "use server";
    await assignTeamToGroupAction(formData);
  };
  const submitUpdateLeagueStatus = async (formData: FormData) => {
    "use server";
    await updateLeagueStatusAction(formData);
  };
  const submitReopenFixtureForEdit = async (formData: FormData) => {
    "use server";
    await reopenDivisionFixtureForEditAction(formData);
  };
  const submitRemoveTeam = async (formData: FormData) => {
    "use server";
    await removeLeagueTeamAction(formData);
  };

  const okCode = searchParams?.ok || "";
  const errorCode = searchParams?.error || "";
  const errorDebug = searchParams?.debug || "";
  const removedMatches = Number(searchParams?.removed_matches || 0);
  const removedBookings = Number(searchParams?.removed_bookings || 0);

  const okMessages: Record<string, string> = {
    DIVISION_CREATED: "Division creada correctamente.",
    TEAM_REGISTERED: "Pareja inscripta correctamente.",
    TEAM_ASSIGNED_TO_GROUP: "Equipo asignado al grupo correctamente.",
    TEAM_REMOVED: "Equipo eliminado correctamente.",
    GROUPS_CREATED: "Grupos generados correctamente.",
    FIXTURE_CREATED: "Fixture generado correctamente.",
    MATCH_SCHEDULED: "Partido programado correctamente.",
    LEAGUE_STATUS_UPDATED: "Estado de liga actualizado correctamente.",
    FIXTURE_REOPENED_FOR_EDIT: "Fixture reabierto para edicion.",
  };

  const errorMessages: Record<string, string> = {
    COMPLETE_REQUIRED_FIELDS: "Completa los campos obligatorios.",
    COMPLETE_SCHEDULE_FIELDS: "Completa fecha, hora y cancha.",
    INVALID_DATE_TIME: "Fecha/hora invalida.",
    NOT_AUTHENTICATED: "Necesitas iniciar sesion.",
    NOT_ALLOWED: "No tienes permisos para esta accion.",
    LEAGUE_NOT_FOUND: "Liga no encontrada.",
    DIVISION_NOT_FOUND: "Division no encontrada.",
    GROUP_NOT_FOUND: "Grupo no encontrado.",
    TEAM_NOT_FOUND: "Equipo no encontrado.",
    TEAM_HAS_FIXTURE: "No se puede eliminar: el equipo ya tiene partidos generados.",
    TEAM_REGISTRATION_CLOSED_BY_FIXTURE: "No se pueden inscribir equipos porque la division ya tiene fixture generado.",
    LEAGUE_NOT_DRAFT: "Solo se puede reabrir fixture cuando la liga esta en estado borrador.",
    NO_FIXTURE_FOR_DIVISION: "La division no tiene fixture generado.",
    COMPLETED_MATCHES_EXIST: "No se puede reabrir: hay partidos completados en la division.",
    REOPEN_CONFIRMATION_REQUIRED: "Para reabrir debes escribir REABRIR en la confirmacion.",
    PLAYER_NOT_FOUND: "Jugador no encontrado o inactivo.",
    LEAGUE_MATCH_NOT_FOUND: "Partido de liga no encontrado.",
    FIXTURE_ALREADY_EXISTS: "Ese grupo ya tiene fixture generado.",
    NOT_ENOUGH_TEAMS: "No hay equipos suficientes para esta operacion.",
    INVALID_CATEGORY_MODE: "Modo de categoria invalido.",
    INVALID_CATEGORY_VALUE: "Valor de categoria/suma invalido.",
    INVALID_TEAM_PLAYERS: "Selecciona dos jugadores distintos.",
    PLAYER_CATEGORY_REQUIRED: "Ambos jugadores deben tener categoria cargada.",
    CATEGORY_NOT_ALLOWED: "La categoria de inscripcion no coincide con la division.",
    CATEGORY_SUM_NOT_ALLOWED: "La suma de categorias de la pareja no coincide con la division.",
    PLAYER_ALREADY_REGISTERED_IN_DIVISION: "Uno o ambos jugadores ya estan inscriptos en otro equipo de esta division.",
    DUPLICATE_PLAYER_IN_GROUP: "Hay jugadores repetidos entre equipos del grupo. Corrige los equipos y vuelve a generar el fixture.",
    TEAM_DIVISION_MISMATCH: "El equipo no pertenece a la misma division del grupo.",
    BOOKING_OVERLAP: "La cancha ya tiene una reserva confirmada en ese horario.",
    BOOKING_PLAYER_OVERLAP: "Uno o mas jugadores ya tienen partido en ese mismo horario.",
    BOOKING_OUTSIDE_HOURS: "Horario fuera de disponibilidad de la cancha.",
    BOOKING_INVALID_SLOT: "Horario invalido para la grilla de la cancha.",
    RLS_VIOLATION: "La operacion fue bloqueada por politicas de seguridad.",
    NOT_NULL_VIOLATION: "Falta un dato obligatorio para guardar.",
    FK_VIOLATION: "La referencia de datos no es valida.",
    DUPLICATE_KEY: "Ya existe un registro con esos datos.",
    INVALID_INPUT_SYNTAX: "Formato de dato invalido.",
  };

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-4">
      {okCode ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
          {okCode === "FIXTURE_REOPENED_FOR_EDIT"
            ? `${okMessages[okCode]} Se eliminaron ${removedMatches} cruces y ${removedBookings} reserva(s).`
            : okMessages[okCode] || "Operacion completada."}
        </div>
      ) : null}
      {errorCode ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          <p>{errorMessages[errorCode] || `No se pudo completar la accion (${errorCode}).`}</p>
          {errorDebug ? (
            <p className="mt-1 text-xs font-normal text-red-700">Detalle tecnico: {errorDebug}</p>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{league.name}</h1>
          <p className="text-sm text-gray-500">
            {league.season_label || "Sin temporada"} · Estado: {leagueStatusLabel(league.status)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {league.status === "draft" ? (
            <form action={submitUpdateLeagueStatus}>
              <input type="hidden" name="league_id" value={league.id} />
              <input type="hidden" name="next_status" value="active" />
              <button className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100">
                Publicar liga
              </button>
            </form>
          ) : null}
          {league.status === "active" ? (
            <form action={submitUpdateLeagueStatus}>
              <input type="hidden" name="league_id" value={league.id} />
              <input type="hidden" name="next_status" value="finished" />
              <button className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700 hover:bg-amber-100">
                Finalizar liga
              </button>
            </form>
          ) : null}
          <Link
            href="/club/dashboard/leagues"
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Volver a ligas
          </Link>
        </div>
      </div>

      {divisionData.map(({ division, teams, groupData }) => {
        const teamMap = new Map(teams.map((t) => [t.id, t]));
        const divisionMatches = leagueMatches.filter((m) => m.league_groups?.league_divisions?.id === division.id);
        const assignedTeamIds = new Set<string>();
        const assignedGroupByTeamId = new Map<string, string>();
        for (const g of groupData) {
          for (const gt of g.groupTeams as any[]) {
            if (gt.team_id) {
              assignedTeamIds.add(gt.team_id);
              assignedGroupByTeamId.set(gt.team_id, g.group.name);
            }
          }
        }
        const unassignedTeams = teams.filter((team) => !assignedTeamIds.has(team.id));
        const hasGeneratedFixture = divisionMatches.length > 0;
        const canAssignUnassigned = groupData.length > 0 && !hasGeneratedFixture && unassignedTeams.length > 0;

        return (
          <section key={division.id} className="rounded-2xl border bg-white p-4 space-y-5">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {division.name} · {divisionModeLabel(division.category_mode)}
                {division.category_value_int ? ` ${division.category_value_int}` : ""}
              </h3>
              <p className="text-xs text-gray-500">
                Permite excepcion: {division.allow_override ? "si" : "no"}
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 p-3">
              <h4 className="text-sm font-black uppercase tracking-wider text-gray-600">Inscribir equipo</h4>
              <form action={submitRegisterTeam} className="mt-3 space-y-2">
                <input type="hidden" name="league_id" value={league.id} />
                <input type="hidden" name="division_id" value={division.id} />
                <select name="player_id_a" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" required>
                  <option value="">Jugador A</option>
                  {players.map((p: any) => (
                    <option key={`a-${p.id}`} value={p.id}>
                      {p.display_name}
                    </option>
                  ))}
                </select>
                <select name="player_id_b" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" required>
                  <option value="">Jugador B</option>
                  {players.map((p: any) => (
                    <option key={`b-${p.id}`} value={p.id}>
                      {p.display_name}
                    </option>
                  ))}
                </select>
                <input
                  name="entry_category_int"
                  type="number"
                  min={1}
                  placeholder="Categoria inscripcion (opcional)"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
                <button className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700">
                  Inscribir pareja
                </button>
              </form>
            </div>

            <div className="rounded-xl border border-gray-100 p-3">
              <h4 className="text-sm font-black uppercase tracking-wider text-gray-600">Equipos inscriptos</h4>
              {teams.length === 0 ? (
                <p className="mt-2 text-sm text-gray-500">No hay equipos registrados todavia.</p>
              ) : (
                <ul className="mt-2 space-y-1 text-sm text-gray-800">
                  {teams.map((team) => (
                    <li key={team.id} className="flex items-center gap-2">
                      <span className="text-sm">
                        {teamLabel(team, playersMap)}
                        {team.entry_category_int ? ` · Cat ${team.entry_category_int}` : ""}
                      </span>
                      {assignedTeamIds.has(team.id) ? (
                        <span className="rounded border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                          Asignado · Grupo {assignedGroupByTeamId.get(team.id)}
                        </span>
                      ) : (
                        <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                          Sin grupo
                        </span>
                      )}
                      <form action={submitRemoveTeam}>
                        <input type="hidden" name="league_id" value={league.id} />
                        <input type="hidden" name="team_id" value={team.id} />
                        <button type="submit" className="rounded border border-red-200 px-2 py-0.5 text-xs font-semibold text-red-700 hover:bg-red-50">
                          Quitar
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-gray-100 p-3">
              <h4 className="text-sm font-black uppercase tracking-wider text-gray-600">Organizar grupos</h4>
              <form action={submitAutoGroups} className="mt-3 grid gap-2 md:grid-cols-3">
                <input type="hidden" name="league_id" value={league.id} />
                <input type="hidden" name="division_id" value={division.id} />
                <input
                  name="group_count"
                  type="number"
                  min={1}
                  placeholder="Cantidad grupos (opcional)"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
                <input
                  name="target_size"
                  type="number"
                  min={2}
                  defaultValue={4}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
                <button className="rounded-lg border border-blue-200 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                  Generar grupos automaticamente
                </button>
              </form>
              {canAssignUnassigned ? (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                  Hay {unassignedTeams.length} equipo(s) sin grupo. Asignalos antes de generar fixture.
                </div>
              ) : null}
              {hasGeneratedFixture ? (
                <div className="mt-3 space-y-2 rounded-lg border border-red-200 bg-red-50 px-3 py-3">
                  <p className="text-xs font-semibold text-red-800">
                    Reabrir edicion elimina cruces y reservas de esta division para permitir editar grupos y volver a generar fixture.
                  </p>
                  <form action={submitReopenFixtureForEdit} className="flex flex-col gap-2 md:flex-row md:items-center">
                    <input type="hidden" name="league_id" value={league.id} />
                    <input type="hidden" name="division_id" value={division.id} />
                    <input
                      name="confirm_text"
                      placeholder="Escribe REABRIR para confirmar"
                      className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm md:w-72"
                    />
                    <button
                      type="submit"
                      disabled={league.status !== "draft"}
                      title={league.status !== "draft" ? "Solo disponible en ligas borrador" : undefined}
                      className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                        league.status === "draft"
                          ? "border border-red-300 bg-red-100 text-red-800 hover:bg-red-200"
                          : "cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400"
                      }`}
                    >
                      Reabrir edicion de fixture
                    </button>
                  </form>
                </div>
              ) : null}
            </div>

            {canAssignUnassigned ? (
              <div className="rounded-xl border border-gray-100 p-3">
                <h4 className="text-sm font-black uppercase tracking-wider text-gray-600">Equipos sin grupo</h4>
                <div className="mt-2 space-y-2">
                  {unassignedTeams.map((team) => (
                    <form key={team.id} action={submitAssignTeamToGroup} className="flex flex-col gap-2 rounded-lg border border-gray-100 p-2 md:flex-row md:items-center">
                      <input type="hidden" name="league_id" value={league.id} />
                      <input type="hidden" name="team_id" value={team.id} />
                      <div className="text-sm text-gray-800 md:min-w-[320px]">{teamLabel(team, playersMap)}</div>
                      <select name="group_id" required className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm md:w-48">
                        <option value="">Seleccionar grupo</option>
                        {groupData.map(({ group }) => (
                          <option key={group.id} value={group.id}>
                            Grupo {group.name}
                          </option>
                        ))}
                      </select>
                      <button className="rounded-lg border border-blue-200 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                        Asignar
                      </button>
                    </form>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-2">
              {groupData.map(({ group, groupTeams, table }) => (
                <div key={group.id} className={`rounded-xl border-l-4 p-3 space-y-3 ${lightGroupBgByName(group.name)}`}>
                  {(() => {
                    const fixtureCount = divisionMatches.filter((m) => m.group_id === group.id).length;
                    const duplicatePlayerIds = (() => {
                      const playerCount = new Map<string, number>();
                      for (const gt of groupTeams as any[]) {
                        const team = teamMap.get(gt.team_id) || gt.league_teams;
                        if (!team) continue;
                        for (const pid of [team.player_id_a, team.player_id_b]) {
                          if (!pid) continue;
                          playerCount.set(pid, (playerCount.get(pid) || 0) + 1);
                        }
                      }
                      return Array.from(playerCount.entries())
                        .filter(([, count]) => count > 1)
                        .map(([pid]) => pid);
                    })();
                    const duplicatePlayerNames = duplicatePlayerIds.map((pid) => playersMap.get(pid) || pid);

                    return (
                      <>
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-gray-900">Grupo {group.name}</h4>
                          <form action={submitGenerateFixture}>
                            <input type="hidden" name="league_id" value={league.id} />
                            <input type="hidden" name="group_id" value={group.id} />
                            {fixtureCount > 0 ? (
                              <span className="rounded-lg border border-green-200 bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">
                                Fixture generado ({fixtureCount})
                              </span>
                            ) : duplicatePlayerNames.length > 0 ? (
                              <button
                                type="button"
                                disabled
                                title="Corrige jugadores repetidos antes de generar fixture"
                                className="cursor-not-allowed rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700"
                              >
                                Jugadores repetidos
                              </button>
                            ) : canAssignUnassigned ? (
                              <button
                                type="button"
                                disabled
                                title="Asigna todos los equipos sin grupo antes de generar fixture"
                                className="cursor-not-allowed rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700"
                              >
                                Equipos sin grupo
                              </button>
                            ) : (
                              <button className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                                Generar fixture
                              </button>
                            )}
                          </form>
                        </div>

                        {duplicatePlayerNames.length > 0 ? (
                          <div className="rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-semibold text-red-800">
                            Jugadores repetidos en este grupo: {duplicatePlayerNames.join(", ")}
                          </div>
                        ) : null}
                      </>
                    );
                  })()}

                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-gray-500">Equipos</p>
                    {groupTeams.length === 0 ? (
                      <p className="text-sm text-gray-500">Sin equipos asignados.</p>
                    ) : (
                      <ul className="mt-1 space-y-1 text-sm text-gray-800">
                        {groupTeams.map((gt: any) => {
                          const team = teamMap.get(gt.team_id) || gt.league_teams;
                          if (!team) return null;
                          return <li key={gt.team_id}>{teamLabel(team, playersMap)}</li>;
                        })}
                      </ul>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-gray-500">Tabla</p>
                    {table.length === 0 ? (
                      <p className="text-sm text-gray-500">Sin resultados cargados todavia.</p>
                    ) : (
                      <div className="mt-1 overflow-x-auto">
                        <table className="min-w-full text-xs">
                          <thead>
                            <tr className="text-left text-gray-500">
                              <th className="py-1 pr-2">Equipo</th>
                              <th className="py-1 pr-2">Pts</th>
                              <th className="py-1 pr-2">PJ</th>
                              <th className="py-1 pr-2">G</th>
                              <th className="py-1 pr-2">P</th>
                              <th className="py-1 pr-2">Sets</th>
                            </tr>
                          </thead>
                          <tbody>
                            {table.map((row: any) => {
                              const team = teamMap.get(row.team_id);
                              return (
                                <tr key={row.team_id} className="border-t border-gray-100">
                                  <td className="py-1 pr-2">{team ? teamLabel(team, playersMap) : row.team_id}</td>
                                  <td className="py-1 pr-2 font-bold">{row.points}</td>
                                  <td className="py-1 pr-2">{row.played}</td>
                                  <td className="py-1 pr-2">{row.wins}</td>
                                  <td className="py-1 pr-2">{row.losses}</td>
                                  <td className="py-1 pr-2">{row.sets_won}-{row.sets_lost}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-gray-100 p-3">
              <h4 className="text-sm font-black uppercase tracking-wider text-gray-600">Fixture y agenda</h4>
              {divisionMatches.length === 0 ? (
                <p className="mt-2 text-sm text-gray-500">Genera fixture en algun grupo para crear cruces.</p>
              ) : (
                <div className="mt-2 space-y-3">
                  {Object.entries(
                    divisionMatches.reduce((acc: Record<string, any[]>, m: any) => {
                      const key = m.league_groups?.name || "-";
                      acc[key] = acc[key] || [];
                      acc[key].push(m);
                      return acc;
                    }, {})
                  )
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([groupName, matches]) => (
                      <div key={groupName} className={`rounded-xl border-l-4 p-2 ${lightGroupBgByName(groupName)}`}>
                        <p className="mb-2 text-xs font-black uppercase tracking-wider text-gray-600">Grupo {groupName}</p>
                        <div className="space-y-2">
                          {matches
                            .sort((a: any, b: any) => a.round_index - b.round_index)
                            .map((m: any) => {
                              const ta = teamMap.get(m.team_a_id);
                              const tb = teamMap.get(m.team_b_id);
                              const scheduledAt = m.scheduled_at || m.matches?.match_at || null;
                              const dateDefault = toInputDate(scheduledAt);
                              const timeDefault = toInputTime(scheduledAt);
                              const courtDefault = m.court_id || "";
                              const courtName =
                                m.court?.name || courts.find((court) => court.id === courtDefault)?.name || "Cancha no asignada";
                              const isScheduled = Boolean(scheduledAt && courtDefault);
                              return (
                                <div
                                  key={m.id}
                                  className={`rounded-lg border p-2 ${isScheduled ? "border-green-200 bg-green-50/40" : "border-gray-100"}`}
                                >
                                  <p className="text-sm font-semibold text-gray-900">
                                    R{m.round_index} · {ta ? teamLabel(ta, playersMap) : m.team_a_id} vs{" "}
                                    {tb ? teamLabel(tb, playersMap) : m.team_b_id}
                                  </p>
                                  {isScheduled ? (
                                    <p className="mt-1 text-xs font-semibold text-green-700">
                                      Programado: {toHumanDateTime(scheduledAt)} · {courtName}
                                    </p>
                                  ) : (
                                    <p className="mt-1 text-xs text-amber-700">Pendiente de programacion</p>
                                  )}
                                  <LeagueMatchScheduleForm
                                    leagueId={league.id}
                                    leagueMatchId={m.id}
                                    courts={courts.map((court) => ({
                                      id: court.id,
                                      name: court.name,
                                      opening_time: court.opening_time,
                                      closing_time: court.closing_time,
                                      slot_interval_minutes: court.slot_interval_minutes,
                                    }))}
                                    defaultDate={dateDefault}
                                    defaultTime={timeDefault}
                                    defaultCourtId={courtDefault}
                                    isScheduled={isScheduled}
                                    defaultSlotDurationMinutes={bookingSettings?.slot_duration_minutes || 90}
                                  />
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

