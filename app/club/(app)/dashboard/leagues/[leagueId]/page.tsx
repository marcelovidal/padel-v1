import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClub } from "@/lib/auth";
import { getSiteUrl } from "@/lib/utils/url";
import { buildOgLeagueUrl, buildWhatsAppTextForCard } from "@/lib/share/shareMessage";
import { ShareCardButton } from "@/components/share/ShareCardButton";
import { LeaguesService } from "@/services/leagues.service";
import { PlayerService } from "@/services/player.service";
import { BookingService } from "@/services/booking.service";
import { LeagueMatchScheduleForm } from "@/components/club/LeagueMatchScheduleForm";
import { LeagueMatchResultForm } from "@/components/club/LeagueMatchResultForm";
import { PlayoffMatchScheduleForm } from "@/components/club/PlayoffMatchScheduleForm";
import { PlayoffMatchResultForm } from "@/components/club/PlayoffMatchResultForm";
import { getEffectiveStatus, normalizeSets } from "@/lib/match/matchUtils";
import { RegistrationsPanel } from "@/components/club/RegistrationsPanel";
import { RegistrationsService } from "@/services/registrations.service";
import { EventDiffusionSection } from "@/components/club/EventDiffusionSection";
import { LeagueRegisterTeamForm } from "@/components/club/LeagueRegisterTeamForm";
import {
  assignTeamToGroupAction,
  autoCreateGroupsAction,
  generateDivisionPlayoffsAction,
  generateFixtureAction,
  reopenDivisionFixtureForEditAction,
  removeLeagueTeamAction,
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

function playoffStageLabel(stage: "quarterfinal" | "semifinal" | "final") {
  if (stage === "quarterfinal") return "Cuartos de final";
  if (stage === "semifinal") return "Semifinales";
  return "Final";
}

function playoffStageShort(stage: "quarterfinal" | "semifinal" | "final", order: number) {
  if (stage === "quarterfinal") return `QF${order}`;
  if (stage === "semifinal") return `SF${order}`;
  return "F";
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
    league_match_id?: string;
    playoff_match_id?: string;
    removed_matches?: string;
    removed_bookings?: string;
  };
}) {
  const { leagueId } = params;
  const { club } = await requireClub();

  const leaguesService = new LeaguesService();
  const bookingService = new BookingService();
  const playerService = new PlayerService();

  const registrationsService = new RegistrationsService();
  const [league, divisions, players, courts, bookingSettings] = await Promise.all([
    leaguesService.getLeagueById(leagueId),
    leaguesService.listDivisions(leagueId),
    playerService.searchPlayersWeighted("", 200),
    bookingService.listActiveClubCourts(club.id),
    bookingService.getClubBookingSettings(club.id),
  ]);

  let leagueRegistrations: any[] = [];
  let registrationsLoadError: string | null = null;
  try {
    leagueRegistrations = await registrationsService.getLeagueRegistrations(leagueId);
  } catch (error: any) {
    registrationsLoadError = [error?.message, error?.details, error?.hint, error?.code]
      .filter(Boolean)
      .join(" | ")
      .slice(0, 180);
  }

  if (!league || league.club_id !== club.id) {
    return notFound();
  }

  const playersMap = new Map<string, string>();
  for (const p of players || []) {
    playersMap.set(p.id, p.display_name || `${p.first_name || ""} ${p.last_name || ""}`.trim());
  }

  const divisionData = await Promise.all(
    divisions.map(async (division) => {
      const [teams, groups, playoffMatches] = await Promise.all([
        leaguesService.listTeams(division.id),
        leaguesService.listGroups(division.id),
        leaguesService.listDivisionPlayoffMatches(division.id),
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

      return { division, teams, groups, groupData, playoffMatches };
    })
  );

  const leagueMatches = await leaguesService.listLeagueMatches(leagueId);
  const siteUrl = getSiteUrl();
  const ogLeagueUrl = buildOgLeagueUrl(leagueId, siteUrl);
  const leagueCardWhatsAppText = buildWhatsAppTextForCard("league", {}, siteUrl);
  const submitAutoGroups = async (formData: FormData) => {
    "use server";
    await autoCreateGroupsAction(formData);
  };
  const submitGenerateFixture = async (formData: FormData) => {
    "use server";
    await generateFixtureAction(formData);
  };
  const submitGeneratePlayoffs = async (formData: FormData) => {
    "use server";
    await generateDivisionPlayoffsAction(formData);
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
  const errorLeagueMatchId = searchParams?.league_match_id || "";
  const errorPlayoffMatchId = searchParams?.playoff_match_id || "";
  const removedMatches = Number(searchParams?.removed_matches || 0);
  const removedBookings = Number(searchParams?.removed_bookings || 0);

  const okMessages: Record<string, string> = {
    DIVISION_CREATED: "Division creada correctamente.",
    TEAM_REGISTERED: "Pareja inscripta correctamente.",
    TEAM_ASSIGNED_TO_GROUP: "Equipo asignado al grupo correctamente.",
    TEAM_REMOVED: "Equipo eliminado correctamente.",
    GROUPS_CREATED: "Grupos generados correctamente.",
    FIXTURE_CREATED: "Fixture generado correctamente.",
    PLAYOFFS_CREATED: "Playoffs generados correctamente.",
    MATCH_SCHEDULED: "Partido programado correctamente.",
    MATCH_RESULT_SAVED: "Resultado cargado correctamente.",
    LEAGUE_STATUS_UPDATED: "Estado de liga actualizado correctamente.",
    FIXTURE_REOPENED_FOR_EDIT: "Fixture reabierto para edicion.",
    LEAGUE_INFO_UPDATED: "Información de difusión actualizada.",
    REGISTRATION_CONFIRMED: "Inscripción confirmada. Se notificó al jugador.",
    REGISTRATION_REJECTED: "Inscripción rechazada.",
  };

  const errorMessages: Record<string, string> = {
    COMPLETE_REQUIRED_FIELDS: "Completa los campos obligatorios.",
    COMPLETE_SCHEDULE_FIELDS: "Completa fecha, hora y cancha.",
    COMPLETE_RESULT_FIELDS: "Completa los sets obligatorios del resultado.",
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
    PLAYOFF_ALREADY_EXISTS: "La division ya tiene playoffs generados.",
    GROUP_STAGE_INCOMPLETE: "No se pueden generar playoffs: hay grupos con resultados pendientes.",
    NO_FIXTURE_FOR_GROUP: "No se pueden generar playoffs: hay grupos sin fixture.",
    NOT_ENOUGH_QUALIFIED_TEAMS: "No hay equipos suficientes clasificados para playoffs.",
    UNSUPPORTED_GROUP_COUNT_FOR_PLAYOFF: "Cantidad de grupos no soportada para generar playoffs.",
    PLAYOFF_MATCH_NOT_FOUND: "Partido de playoff no encontrado.",
    PLAYOFF_TEAMS_NOT_DEFINED: "Este cruce aun no tiene equipos definidos.",
    LEAGUE_ALREADY_FINISHED: "La liga ya esta finalizada.",
    RESULT_ALREADY_EXISTS: "Este partido ya tiene resultado cargado.",
    MATCH_NOT_COMPLETED: "Solo se pueden cargar resultados en partidos finalizados.",
    INVALID_SCORES: "Los marcadores ingresados no son validos.",
    RLS_VIOLATION: "La operacion fue bloqueada por politicas de seguridad.",
    NOT_NULL_VIOLATION: "Falta un dato obligatorio para guardar.",
    FK_VIOLATION: "La referencia de datos no es valida.",
    DUPLICATE_KEY: "Ya existe un registro con esos datos.",
    INVALID_INPUT_SYNTAX: "Formato de dato invalido.",
  };

  const scheduleInlineErrorCodes = new Set([
    "COMPLETE_SCHEDULE_FIELDS",
    "INVALID_DATE_TIME",
    "LEAGUE_MATCH_NOT_FOUND",
    "BOOKING_OVERLAP",
    "BOOKING_PLAYER_OVERLAP",
    "BOOKING_OUTSIDE_HOURS",
    "BOOKING_INVALID_SLOT",
    "22P02",
  ]);
  const hasInlineScheduleError = Boolean(
    errorCode && (errorLeagueMatchId || errorPlayoffMatchId) && scheduleInlineErrorCodes.has(errorCode)
  );
  const resultInlineErrorCodes = new Set([
    "COMPLETE_RESULT_FIELDS",
    "LEAGUE_MATCH_NOT_FOUND",
    "RESULT_ALREADY_EXISTS",
    "MATCH_NOT_COMPLETED",
    "INVALID_SCORES",
  ]);
  const hasInlineResultError = Boolean(
    errorCode && (errorLeagueMatchId || errorPlayoffMatchId) && resultInlineErrorCodes.has(errorCode)
  );

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-4">
      {okCode ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
          {okCode === "FIXTURE_REOPENED_FOR_EDIT"
            ? `${okMessages[okCode]} Se eliminaron ${removedMatches} cruces y ${removedBookings} reserva(s).`
            : okMessages[okCode] || "Operacion completada."}
        </div>
      ) : null}
      {errorCode && !hasInlineScheduleError && !hasInlineResultError ? (
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
          {league.status !== "draft" && (
            <ShareCardButton
              type="league"
              shareUrl={siteUrl}
              whatsappText={leagueCardWhatsAppText}
              ogImageUrl={ogLeagueUrl}
              label="Compartir tabla"
              downloadName={`pasala-liga-${league.name.replace(/\s+/g, "-").toLowerCase()}`}
            />
          )}
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

      {/* Navegación interna */}
      <nav className="sticky top-0 z-10 -mx-4 flex gap-1 overflow-x-auto bg-white/95 px-4 py-2 backdrop-blur border-b border-gray-100 shadow-sm">
        <a href="#diffusion" className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100">
          Difusión
        </a>
        <a href="#registrations" className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100">
          Solicitudes ({leagueRegistrations.length})
        </a>
        <a href="#teams" className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100">
          Parejas ({divisionData.reduce((sum, d) => sum + d.teams.length, 0)})
        </a>
        {divisionData.map(({ division }) => (
          <a
            key={division.id}
            href={`#division-${division.id}`}
            className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
          >
            {division.name}
          </a>
        ))}
      </nav>

      {/* Difusión: fechas y ciudades */}
      <section id="diffusion" className="scroll-mt-20 rounded-2xl border bg-white p-4">
        <h2 className="mb-3 text-sm font-black uppercase tracking-wider text-gray-600">
          Difusión geográfica
        </h2>
        <p className="mb-4 text-xs text-gray-500">
          Cuando la liga está activa, los jugadores de las ciudades seleccionadas recibirán una notificación de inscripción.
        </p>
        <EventDiffusionSection
          entityType="league"
          entityId={league.id}
          startDate={(league as any).start_date ?? null}
          endDate={(league as any).end_date ?? null}
          targetCityIds={(league as any).target_city_ids ?? []}
        />
      </section>

      {/* Solicitudes de inscripción */}
      <section id="registrations" className="scroll-mt-20 rounded-2xl border bg-white p-4">
        <h2 className="mb-3 text-sm font-black uppercase tracking-wider text-gray-600">
          Solicitudes de inscripción ({leagueRegistrations.length})
        </h2>
        {registrationsLoadError ? (
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            No se pudo leer el listado completo de solicitudes. Detalle: {registrationsLoadError}
          </p>
        ) : null}
        <RegistrationsPanel
          entityId={league.id}
          entityType="league"
          registrations={leagueRegistrations}
        />
      </section>

      {/* Parejas inscriptas */}
      {(() => {
        const allTeams = divisionData.flatMap(({ teams }) => teams);
        const allAssignedTeamIds = new Set<string>();
        const allAssignedGroupByTeamId = new Map<string, string>();
        for (const { groupData } of divisionData) {
          for (const g of groupData) {
            for (const gt of g.groupTeams as any[]) {
              if (gt.team_id) {
                allAssignedTeamIds.add(gt.team_id);
                allAssignedGroupByTeamId.set(gt.team_id, g.group.name);
              }
            }
          }
        }
        const hasAnyFixture = leagueMatches.length > 0;
        const soloConfirmed = leagueRegistrations.filter(
          (r: any) =>
            r.status === "confirmed" &&
            !r.teammate_player_id &&
            !allTeams.some((t) => t.player_id_a === r.player_id || t.player_id_b === r.player_id)
        );

        return (
          <section id="teams" className="scroll-mt-20 rounded-2xl border bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-black uppercase tracking-wider text-gray-600">
                Parejas inscriptas ({allTeams.length})
              </h2>
            </div>

            {!hasAnyFixture ? (
              <LeagueRegisterTeamForm
                leagueId={league.id}
                players={players as any[]}
              />
            ) : (
              <p className="mt-2 text-xs text-amber-700">
                El fixture ya fue generado. Reabrilo para inscribir o quitar parejas.
              </p>
            )}

            {allTeams.length > 0 ? (
              <div className="mt-4 space-y-2">
                {allTeams.map((team) => (
                  <div key={team.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {teamLabel(team, playersMap)}
                      </p>
                      {team.entry_category_int ? (
                        <p className="text-xs text-gray-500">Cat. inscripcion: {team.entry_category_int}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      {allAssignedTeamIds.has(team.id) ? (
                        <span className="rounded border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                          Grupo {allAssignedGroupByTeamId.get(team.id)}
                        </span>
                      ) : (
                        <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                          Sin grupo
                        </span>
                      )}
                      {!hasAnyFixture ? (
                        <form action={submitRemoveTeam}>
                          <input type="hidden" name="league_id" value={league.id} />
                          <input type="hidden" name="team_id" value={team.id} />
                          <button className="rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50">
                            Quitar
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-500">Todavia no hay parejas inscriptas.</p>
            )}

            {soloConfirmed.length > 0 ? (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-800">
                  Confirmados sin pareja asignada ({soloConfirmed.length})
                </p>
                <p className="mb-2 text-xs text-amber-700">
                  Estas inscripciones fueron confirmadas pero son individuales. Inscribí manualmente la pareja completa desde el formulario de arriba.
                </p>
                <ul className="space-y-1">
                  {soloConfirmed.map((r: any) => (
                    <li key={r.registration_id} className="text-sm font-medium text-amber-900">
                      {r.player_name}
                      {r.player_city ? <span className="ml-1 text-xs font-normal text-amber-700">— {r.player_city}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        );
      })()}

      {divisionData.map(({ division, teams, groupData, playoffMatches }) => {
        const teamMap = new Map(teams.map((t) => [t.id, t]));
        const divisionMatches = leagueMatches.filter((m) => m.league_groups?.league_divisions?.id === division.id);
        const hasPlayoffs = playoffMatches.length > 0;
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
          <section key={division.id} id={`division-${division.id}`} className="scroll-mt-20 rounded-2xl border bg-white p-4 space-y-5">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Grupos y fixture</h3>
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
                              const matchRow = Array.isArray(m.matches) ? m.matches[0] ?? null : m.matches ?? null;
                              const scheduledAt = m.scheduled_at || matchRow?.match_at || null;
                              const dateDefault = toInputDate(scheduledAt);
                              const timeDefault = toInputTime(scheduledAt);
                              const courtDefault = m.court_id || "";
                              const courtName =
                                m.court?.name || courts.find((court) => court.id === courtDefault)?.name || "Cancha no asignada";
                              const isScheduled = Boolean(scheduledAt && courtDefault);
                              const rawResult = Array.isArray(matchRow?.match_results)
                                ? matchRow.match_results[0] ?? null
                                : matchRow?.match_results ?? null;
                              const normalizedSets = normalizeSets(rawResult?.sets || null).filter(
                                (s: any) => s.a !== null && s.b !== null
                              );
                              const hasResult = normalizedSets.length > 0 && Boolean(rawResult?.winner_team);
                              const setsLabel =
                                normalizedSets.length > 0
                                  ? normalizedSets.map((s: any) => `${s.a}-${s.b}`).join(" ")
                                  : "Sin sets cargados";
                              const winnerLabel = rawResult?.winner_team
                                ? `Gana equipo ${rawResult.winner_team}`
                                : "Sin ganador";
                              const effectiveStatus =
                                matchRow?.match_at || scheduledAt
                                  ? getEffectiveStatus({
                                      status: matchRow?.status || "scheduled",
                                      match_at: matchRow?.match_at || scheduledAt,
                                    })
                                  : "scheduled";
                              const canSubmitResult = effectiveStatus === "completed" && !hasResult;
                              const inlineResultError =
                                hasInlineResultError && errorLeagueMatchId === m.id
                                  ? errorMessages[errorCode] || `No se pudo completar la accion (${errorCode}).`
                                  : undefined;
                              const inlineResultErrorDebug =
                                hasInlineResultError && errorLeagueMatchId === m.id ? errorDebug : undefined;
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
                                  {hasInlineScheduleError && errorLeagueMatchId === m.id ? (
                                    <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
                                      <p>{errorMessages[errorCode] || `No se pudo completar la accion (${errorCode}).`}</p>
                                      {errorDebug ? (
                                        <p className="mt-1 text-[11px] font-normal text-red-700">
                                          Detalle tecnico: {errorDebug}
                                        </p>
                                      ) : null}
                                    </div>
                                  ) : null}
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
                                  <LeagueMatchResultForm
                                    leagueId={league.id}
                                    leagueMatchId={m.id}
                                    canSubmit={canSubmitResult}
                                    hasResult={hasResult}
                                    setsLabel={setsLabel}
                                    winnerLabel={winnerLabel}
                                    inlineError={inlineResultError}
                                    inlineErrorDebug={inlineResultErrorDebug}
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

            <div className="rounded-xl border border-gray-100 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-black uppercase tracking-wider text-gray-600">Playoffs</h4>
                {!hasPlayoffs ? (
                  <form action={submitGeneratePlayoffs}>
                    <input type="hidden" name="league_id" value={league.id} />
                    <input type="hidden" name="division_id" value={division.id} />
                    <button className="rounded-lg border border-indigo-200 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">
                      Generar playoffs
                    </button>
                  </form>
                ) : (
                  <span className="rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">
                    Generados ({playoffMatches.length})
                  </span>
                )}
              </div>

              {!hasPlayoffs ? (
                <p className="mt-2 text-sm text-gray-500">
                  Se generan al finalizar todos los resultados de fase de grupos.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {(["quarterfinal", "semifinal", "final"] as const).map((stage) => {
                    const stageMatches = playoffMatches
                      .filter((pm: any) => pm.stage === stage)
                      .sort((a: any, b: any) => a.match_order - b.match_order);
                    if (stageMatches.length === 0) return null;

                    const playoffMap = new Map(
                      playoffMatches.map((pm: any) => [pm.id, pm] as const)
                    );

                    return (
                      <div key={stage} className="rounded-lg border border-gray-100 bg-gray-50/50 p-2">
                        <p className="text-xs font-black uppercase tracking-wider text-gray-600">
                          {playoffStageLabel(stage)}
                        </p>
                        <div className="mt-2 space-y-2">
                          {stageMatches.map((pm: any) => {
                            const matchRow = Array.isArray(pm.matches) ? pm.matches[0] ?? null : pm.matches ?? null;
                            const scheduledAt = pm.scheduled_at || matchRow?.match_at || null;
                            const dateDefault = toInputDate(scheduledAt);
                            const timeDefault = toInputTime(scheduledAt);
                            const courtDefault = pm.court_id || "";
                            const courtName =
                              pm.court?.name || courts.find((court) => court.id === courtDefault)?.name || "Cancha no asignada";
                            const isScheduled = Boolean(scheduledAt && courtDefault);

                            const teamALabel = (() => {
                              if (pm.team_a_id) {
                                const team = teamMap.get(pm.team_a_id);
                                return team ? teamLabel(team, playersMap) : pm.team_a_id;
                              }
                              if (pm.source_match_a_id) {
                                const source = playoffMap.get(pm.source_match_a_id);
                                if (source) {
                                  return `Ganador ${playoffStageShort(source.stage, source.match_order)}`;
                                }
                              }
                              return "Por definir";
                            })();

                            const teamBLabel = (() => {
                              if (pm.team_b_id) {
                                const team = teamMap.get(pm.team_b_id);
                                return team ? teamLabel(team, playersMap) : pm.team_b_id;
                              }
                              if (pm.source_match_b_id) {
                                const source = playoffMap.get(pm.source_match_b_id);
                                if (source) {
                                  return `Ganador ${playoffStageShort(source.stage, source.match_order)}`;
                                }
                              }
                              return "Por definir";
                            })();

                            const rawResult = Array.isArray(matchRow?.match_results)
                              ? matchRow.match_results[0] ?? null
                              : matchRow?.match_results ?? null;
                            const normalizedSets = normalizeSets(rawResult?.sets || null).filter(
                              (s: any) => s.a !== null && s.b !== null
                            );
                            const hasResult = normalizedSets.length > 0 && Boolean(rawResult?.winner_team);
                            const setsLabel =
                              normalizedSets.length > 0
                                ? normalizedSets.map((s: any) => `${s.a}-${s.b}`).join(" ")
                                : "Sin sets cargados";
                            const winnerLabel = pm.winner_team_id
                              ? (() => {
                                  const winnerTeam = teamMap.get(pm.winner_team_id);
                                  return winnerTeam ? teamLabel(winnerTeam, playersMap) : pm.winner_team_id;
                                })()
                              : rawResult?.winner_team
                                ? `Gana equipo ${rawResult.winner_team}`
                                : "Sin ganador";

                            const effectiveStatus =
                              matchRow?.match_at || scheduledAt
                                ? getEffectiveStatus({
                                    status: matchRow?.status || "scheduled",
                                    match_at: matchRow?.match_at || scheduledAt,
                                  })
                                : "scheduled";

                            const teamsDefined = Boolean(pm.team_a_id && pm.team_b_id);
                            const canSubmitResult = teamsDefined && effectiveStatus === "completed" && !hasResult;
                            const inlineScheduleError =
                              hasInlineScheduleError && errorPlayoffMatchId === pm.id
                                ? errorMessages[errorCode] || `No se pudo completar la accion (${errorCode}).`
                                : undefined;
                            const inlineScheduleErrorDebug =
                              hasInlineScheduleError && errorPlayoffMatchId === pm.id ? errorDebug : undefined;
                            const inlineResultError =
                              hasInlineResultError && errorPlayoffMatchId === pm.id
                                ? errorMessages[errorCode] || `No se pudo completar la accion (${errorCode}).`
                                : undefined;
                            const inlineResultErrorDebug =
                              hasInlineResultError && errorPlayoffMatchId === pm.id ? errorDebug : undefined;

                            return (
                              <div
                                key={pm.id}
                                className={`rounded-lg border p-2 ${isScheduled ? "border-green-200 bg-green-50/40" : "border-gray-100 bg-white"}`}
                              >
                                <p className="text-sm font-semibold text-gray-900">
                                  {playoffStageShort(pm.stage, pm.match_order)} · {teamALabel} vs {teamBLabel}
                                </p>
                                {isScheduled ? (
                                  <p className="mt-1 text-xs font-semibold text-green-700">
                                    Programado: {toHumanDateTime(scheduledAt)} · {courtName}
                                  </p>
                                ) : (
                                  <p className="mt-1 text-xs text-amber-700">Pendiente de programacion</p>
                                )}

                                {pm.winner_team_id ? (
                                  <p className="mt-1 text-xs font-semibold text-indigo-700">Clasifica: {winnerLabel}</p>
                                ) : null}

                                {inlineScheduleError ? (
                                  <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
                                    <p>{inlineScheduleError}</p>
                                    {inlineScheduleErrorDebug ? (
                                      <p className="mt-1 text-[11px] font-normal text-red-700">
                                        Detalle tecnico: {inlineScheduleErrorDebug}
                                      </p>
                                    ) : null}
                                  </div>
                                ) : null}

                                <PlayoffMatchScheduleForm
                                  leagueId={league.id}
                                  playoffMatchId={pm.id}
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
                                  disabled={!teamsDefined}
                                />

                                <PlayoffMatchResultForm
                                  leagueId={league.id}
                                  playoffMatchId={pm.id}
                                  canSubmit={canSubmitResult}
                                  hasResult={hasResult}
                                  setsLabel={setsLabel}
                                  winnerLabel={winnerLabel}
                                  inlineError={inlineResultError}
                                  inlineErrorDebug={inlineResultErrorDebug}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        );
      })
      }
    </div>
  );
}

