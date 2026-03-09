import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClub } from "@/lib/auth";
import { TournamentsService } from "@/services/tournaments.service";
import { PlayerService } from "@/services/player.service";
import { BookingService } from "@/services/booking.service";
import { TournamentMatchScheduleForm } from "@/components/club/TournamentMatchScheduleForm";
import { TournamentMatchResultForm } from "@/components/club/TournamentMatchResultForm";
import { TournamentPlayoffScheduleForm } from "@/components/club/TournamentPlayoffScheduleForm";
import { TournamentPlayoffResultForm } from "@/components/club/TournamentPlayoffResultForm";
import { TournamentRegisterTeamForm } from "@/components/club/TournamentRegisterTeamForm";
import { getEffectiveStatus, normalizeSets } from "@/lib/match/matchUtils";
import {
  updateTournamentStatusAction,
  removeTournamentTeamAction,
  autoCreateTournamentGroupsAction,
  assignTournamentTeamToGroupAction,
  generateTournamentFixtureAction,
  reopenTournamentFixtureForEditAction,
  generateTournamentPlayoffsAction,
} from "@/lib/actions/tournaments.actions";
import { TournamentBracketView } from "@/components/club/TournamentBracketView";
import { RegistrationsPanel } from "@/components/club/RegistrationsPanel";
import { RegistrationsService } from "@/services/registrations.service";
import { EventDiffusionSection } from "@/components/club/EventDiffusionSection";

function teamLabel(team: any, playersMap: Map<string, string>) {
  const a = playersMap.get(team.player_id_a) || "Jugador A";
  const b = playersMap.get(team.player_id_b) || "Jugador B";
  return `${a} / ${b}`;
}

function statusLabel(status: "draft" | "active" | "finished") {
  if (status === "draft") return "Borrador";
  if (status === "active") return "Activo";
  return "Finalizado";
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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toInputTime(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function toHumanDateTime(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
}

function lightGroupBg(groupName: string) {
  const n = String(groupName || "").trim().toUpperCase();
  if (n === "A") return "bg-[#EAF5FF] border-[#B6D8FF] border-l-[#1D9BF0]";
  if (n === "B") return "bg-[#EAFBF3] border-[#BDECD2] border-l-[#10B981]";
  if (n === "C") return "bg-[#FFF8E8] border-[#FDE7B2] border-l-[#F59E0B]";
  if (n === "D") return "bg-[#FFF0F3] border-[#FBC6D2] border-l-[#F43F5E]";
  const palette = [
    "bg-[#EAF5FF] border-[#B6D8FF] border-l-[#1D9BF0]",
    "bg-[#EAFBF3] border-[#BDECD2] border-l-[#10B981]",
    "bg-[#FFF8E8] border-[#FDE7B2] border-l-[#F59E0B]",
    "bg-[#FFF0F3] border-[#FBC6D2] border-l-[#F43F5E]",
  ];
  let h = 0; for (const c of n) h += c.charCodeAt(0);
  return palette[h % palette.length];
}

const ERROR_LABELS: Record<string, string> = {
  NOT_AUTHENTICATED: "Tu sesion expiro. Vuelve a ingresar.",
  NOT_ALLOWED: "No tenes permiso para esta operacion.",
  TOURNAMENT_NOT_FOUND: "Torneo no encontrado.",
  TOURNAMENT_ALREADY_FINISHED: "El torneo ya esta finalizado.",
  GROUP_NOT_FOUND: "Grupo no encontrado.",
  TEAM_NOT_FOUND: "Pareja no encontrada.",
  TEAM_HAS_FIXTURE: "La pareja ya tiene fixture generado y no se puede eliminar.",
  TEAM_REGISTRATION_CLOSED_BY_FIXTURE: "El fixture ya fue generado. Reabrilo antes de inscribir mas parejas.",
  PLAYER_NOT_FOUND: "Uno o ambos jugadores no existen o estan inactivos.",
  INVALID_TEAM_PLAYERS: "Selecciona dos jugadores distintos.",
  INVALID_NAME: "El nombre no puede estar vacio.",
  INVALID_CATEGORY_VALUE: "La categoria objetivo debe ser un numero valido.",
  CATEGORY_NOT_ALLOWED: "La categoria de la pareja no cumple la restriccion del torneo.",
  NOT_ENOUGH_TEAMS: "Se necesitan al menos 2 parejas para armar grupos.",
  FIXTURE_ALREADY_EXISTS: "El fixture ya fue generado. Reabrilo para modificar.",
  COMPLETED_MATCHES_EXIST: "Hay partidos completados. No se puede reabrir el fixture.",
  BOOKING_OVERLAP: "La cancha ya tiene una reserva en ese horario.",
  BOOKING_OUTSIDE_HOURS: "El horario esta fuera del rango de apertura de la cancha.",
  BOOKING_INVALID_SLOT: "El horario no corresponde a un slot valido de la cancha.",
  RESULT_ALREADY_EXISTS: "El resultado ya fue cargado para este partido.",
  MATCH_NOT_COMPLETED: "El partido no esta en estado completado todavia.",
  INVALID_SCORES: "Los puntajes ingresados no son validos.",
  TOURNAMENT_MATCH_NOT_FOUND: "Partido de torneo no encontrado.",
  PLAYOFF_ALREADY_EXISTS: "Los playoffs ya fueron generados.",
  GROUP_STAGE_INCOMPLETE: "Hay partidos de grupos sin resultado.",
  NO_FIXTURE_FOR_GROUP: "Un grupo no tiene fixture generado.",
  NOT_ENOUGH_QUALIFIED_TEAMS: "Un grupo no tiene suficientes clasificados.",
  UNSUPPORTED_GROUP_COUNT_FOR_PLAYOFF: "Los playoffs solo soportan 1, 2 o 4 grupos.",
  PLAYOFF_MATCH_NOT_FOUND: "Partido de playoff no encontrado.",
  PLAYOFF_TEAMS_NOT_DEFINED: "Los equipos de este cruce aun no estan definidos.",
  REOPEN_CONFIRMATION_REQUIRED: 'Escribi "REABRIR" para confirmar.',
  COMPLETE_REQUIRED_FIELDS: "Completa todos los campos obligatorios.",
  COMPLETE_SCHEDULE_FIELDS: "Selecciona cancha, fecha y horario.",
  COMPLETE_RESULT_FIELDS: "Ingresa todos los puntajes requeridos.",
  INVALID_DATE_TIME: "La fecha u hora ingresada no es valida.",
  DUPLICATE_KEY: "Ya existe un registro duplicado.",
  UNKNOWN: "Error inesperado. Intenta de nuevo.",
};

const OK_LABELS: Record<string, string> = {
  TOURNAMENT_CREATED: "Torneo creado exitosamente.",
  TOURNAMENT_STATUS_UPDATED: "Estado del torneo actualizado.",
  TEAM_REGISTERED: "Pareja inscripta correctamente.",
  TEAM_REMOVED: "Pareja eliminada del torneo.",
  GROUPS_CREATED: "Grupos creados y equipos asignados.",
  TEAM_ASSIGNED_TO_GROUP: "Pareja asignada al grupo.",
  FIXTURE_CREATED: "Fixture generado correctamente.",
  FIXTURE_REOPENED_FOR_EDIT: "Fixture eliminado. Podes armar los grupos nuevamente.",
  MATCH_SCHEDULED: "Partido programado correctamente.",
  MATCH_RESULT_SAVED: "Resultado guardado.",
  PLAYOFFS_CREATED: "Playoffs generados correctamente.",
  TOURNAMENT_INFO_UPDATED: "Informacion de difusion actualizada.",
  REGISTRATION_CONFIRMED: "Inscripcion confirmada. Se notifico al jugador.",
  REGISTRATION_REJECTED: "Inscripcion rechazada.",
};

export default async function ClubTournamentDetailPage({
  params,
  searchParams,
}: {
  params: { tournamentId: string };
  searchParams?: {
    ok?: string;
    error?: string;
    debug?: string;
    tournament_match_id?: string;
    playoff_match_id?: string;
    removed_matches?: string;
    removed_bookings?: string;
  };
}) {
  const { tournamentId } = params;
  const { club } = await requireClub();

  const service = new TournamentsService();
  const playerService = new PlayerService();
  const bookingService = new BookingService();

  const tournament = await service.getTournamentById(tournamentId);
  if (!tournament || tournament.club_id !== club.id) return notFound();

  const registrationsService = new RegistrationsService();
  const [teams, groups, allMatches, playoffMatches, allPlayers, courts, bookingSettings] =
    await Promise.all([
      service.listTeams(tournamentId),
      service.listGroups(tournamentId),
      service.listTournamentMatches(tournamentId),
      service.listTournamentPlayoffMatches(tournamentId),
      playerService.getAllPlayers(),
      bookingService.listActiveClubCourts(club.id),
      bookingService.getClubBookingSettings(club.id),
    ]);

  let registrations: any[] = [];
  let registrationsLoadError: string | null = null;
  try {
    registrations = await registrationsService.getTournamentRegistrations(tournamentId);
  } catch (error: any) {
    registrationsLoadError = [error?.message, error?.details, error?.hint, error?.code]
      .filter(Boolean)
      .join(" | ")
      .slice(0, 180);
  }

  const playersMap = new Map<string, string>(
    allPlayers.map((p: any) => [p.id, p.display_name || `${p.first_name} ${p.last_name}`])
  );

  const groupsWithData = await Promise.all(
    groups.map(async (group) => {
      const [groupTeams, groupTable] = await Promise.all([
        service.listGroupTeams(group.id),
        service.getGroupTable(group.id),
      ]);
      const groupMatches = allMatches.filter((m: any) => m.group_id === group.id);
      return { group, groupTeams, groupTable, groupMatches };
    })
  );

  const hasGroups = groups.length > 0;
  const hasFixture = allMatches.length > 0;
  const hasPlayoffs = playoffMatches.length > 0;

  const defaultSlotDuration = (bookingSettings as any)?.slot_duration_minutes || 90;
  const courtOptions = courts.map((c: any) => ({
    id: c.id,
    name: c.name,
    opening_time: c.opening_time,
    closing_time: c.closing_time,
    slot_interval_minutes: c.slot_interval_minutes,
  }));

  const errorCode = searchParams?.error;
  const okCode = searchParams?.ok;
  const debugMsg = searchParams?.debug;
  const inlineMatchId = searchParams?.tournament_match_id;
  const inlinePlayoffId = searchParams?.playoff_match_id;
  const removedMatches = Number(searchParams?.removed_matches || 0);
  const removedBookings = Number(searchParams?.removed_bookings || 0);

  // Agrupar playoffs por stage
  const playoffsByStage = playoffMatches.reduce((acc: any, pm: any) => {
    if (!acc[pm.stage]) acc[pm.stage] = [];
    acc[pm.stage].push(pm);
    return acc;
  }, {} as Record<string, any[]>);
  const playoffStages = (["quarterfinal", "semifinal", "final"] as const).filter((s) => playoffsByStage[s]);

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/club/dashboard/tournaments" className="text-sm font-semibold text-blue-700 hover:underline">
            {"<-"} Torneos
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{tournament.name}</h1>
          <p className="text-sm text-gray-500">
            {tournament.season_label || "Sin temporada"} - Categoria {tournament.target_category_int}
            {tournament.allow_lower_category ? " (acepta menores)" : ""} - {statusLabel(tournament.status)}
          </p>
          {tournament.description ? <p className="mt-1 text-sm text-gray-700">{tournament.description}</p> : null}
        </div>
        {/* Cambio de estado */}
        <form action={updateTournamentStatusAction} className="flex items-center gap-2">
          <input type="hidden" name="tournament_id" value={tournament.id} />
          <select
            name="next_status"
            defaultValue={tournament.status}
            className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
          >
            <option value="draft">Borrador</option>
            <option value="active">Activo</option>
            <option value="finished">Finalizado</option>
          </select>
          <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Actualizar estado
          </button>
        </form>
      </div>

      {/* Alertas globales */}
      {errorCode ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-800">
            {ERROR_LABELS[errorCode] || errorCode}
          </p>
          {debugMsg ? <p className="mt-1 text-xs text-red-700">Detalle: {debugMsg}</p> : null}
        </div>
      ) : null}
      {okCode ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-sm font-semibold text-emerald-800">
            {OK_LABELS[okCode] || okCode}
            {okCode === "FIXTURE_REOPENED_FOR_EDIT" && (removedMatches > 0 || removedBookings > 0)
              ? ` (${removedMatches} partidos, ${removedBookings} reservas eliminadas)`
              : null}
          </p>
        </div>
      ) : null}

      {/* Navegación interna */}
      <nav className="sticky top-0 z-10 -mx-4 flex gap-1 overflow-x-auto bg-white/95 px-4 py-2 backdrop-blur border-b border-gray-100 shadow-sm">
        <a href="#diffusion" className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100">
          Difusión
        </a>
        <a href="#registrations" className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100">
          Solicitudes ({registrations.length})
        </a>
        <a href="#teams" className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100">
          Parejas ({teams.length})
        </a>
        {hasGroups ? (
          <a href="#groups" className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50">
            Grupos y fixture
          </a>
        ) : null}
        {hasPlayoffs ? (
          <a href="#playoffs" className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">
            Playoffs
          </a>
        ) : null}
      </nav>

      {/* Difusión: fechas y ciudades */}
      <section id="diffusion" className="scroll-mt-20 rounded-2xl border bg-white p-4">
        <h2 className="mb-3 text-sm font-black uppercase tracking-wider text-gray-600">
          Difusion geografica
        </h2>
        <p className="mb-4 text-xs text-gray-500">
          Cuando el torneo esta activo, los jugadores de las ciudades seleccionadas recibiran una notificacion de inscripcion.
        </p>
        <EventDiffusionSection
          entityType="tournament"
          entityId={tournament.id}
          startDate={(tournament as any).start_date ?? null}
          endDate={(tournament as any).end_date ?? null}
          targetCityIds={(tournament as any).target_city_ids ?? []}
        />
      </section>

      {/* Solicitudes de inscripcion */}
      <section id="registrations" className="scroll-mt-20 rounded-2xl border bg-white p-4">
        <h2 className="mb-3 text-sm font-black uppercase tracking-wider text-gray-600">
          Solicitudes de inscripcion ({registrations.length})
        </h2>
        {registrationsLoadError ? (
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            No se pudo leer el listado completo de solicitudes. Detalle: {registrationsLoadError}
          </p>
        ) : null}
        <RegistrationsPanel
          entityId={tournament.id}
          entityType="tournament"
          registrations={registrations}
        />
      </section>

      {/* Inscripcion de parejas */}
      <section id="teams" className="scroll-mt-20 rounded-2xl border bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-black uppercase tracking-wider text-gray-600">
            Parejas inscriptas ({teams.length})
          </h2>
        </div>

        {!hasFixture ? (
          <TournamentRegisterTeamForm
            tournamentId={tournament.id}
            targetCategoryInt={tournament.target_category_int}
            players={allPlayers as any[]}
          />
        ) : (
          <p className="mt-2 text-xs text-amber-700">
            El fixture ya fue generado. Reabrilo para inscribir o quitar parejas.
          </p>
        )}

        {teams.length > 0 ? (
          <div className="mt-4 space-y-2">
            {teams.map((team) => (
              <div key={team.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {(team.player_a as any)?.display_name || team.player_id_a} /{" "}
                    {(team.player_b as any)?.display_name || team.player_id_b}
                  </p>
                  {team.entry_category_int ? (
                    <p className="text-xs text-gray-500">Cat. inscripcion: {team.entry_category_int}</p>
                  ) : null}
                </div>
                {!hasFixture ? (
                  <form action={removeTournamentTeamAction}>
                    <input type="hidden" name="tournament_id" value={tournament.id} />
                    <input type="hidden" name="team_id" value={team.id} />
                    <button className="rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50">
                      Quitar
                    </button>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-500">Todavia no hay parejas inscriptas.</p>
        )}

        {/* Inscripciones confirmadas individuales (sin compañero asignado) */}
        {(() => {
          const soloConfirmed = registrations.filter(
            (r: any) =>
              r.status === "confirmed" &&
              !r.teammate_player_id &&
              !teams.some((t) => t.player_id_a === r.player_id || t.player_id_b === r.player_id)
          );
          if (soloConfirmed.length === 0) return null;
          return (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-800">
                Confirmados sin pareja asignada ({soloConfirmed.length})
              </p>
              <p className="mb-2 text-xs text-amber-700">
                Estas inscripciones fueron confirmadas pero son individuales. Inscribí manualmente la pareja completa desde el formulario de arriba.
              </p>
              <ul className="space-y-1">
                {soloConfirmed.map((r: any) => (
                  <li key={r.registration_id} className="text-sm text-amber-900 font-medium">
                    {r.player_name}
                    {r.player_city ? <span className="ml-1 text-xs font-normal text-amber-700">— {r.player_city}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          );
        })()}
      </section>

      {/* Armado de grupos */}
      {teams.length >= 2 ? (
        <section id="groups" className="scroll-mt-20 rounded-2xl border bg-white p-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-gray-600">Grupos y fixture</h2>

          {!hasFixture ? (
            <div className="mt-3 flex flex-wrap gap-3">
              <form action={autoCreateTournamentGroupsAction} className="flex items-center gap-2">
                <input type="hidden" name="tournament_id" value={tournament.id} />
                <input
                  type="number"
                  name="group_count"
                  min={1}
                  max={4}
                  placeholder="Cant. grupos (auto)"
                  className="w-44 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                />
                <input
                  type="number"
                  name="target_size"
                  min={2}
                  max={8}
                  placeholder="Tam. grupo (4)"
                  className="w-40 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                />
                <button className="rounded-lg border border-blue-200 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                  Armar grupos automaticamente
                </button>
              </form>
            </div>
          ) : null}

          {hasGroups ? (
            <div className="mt-4 space-y-4">
              {groupsWithData.map(({ group, groupTeams, groupMatches }) => {
                const groupHasFixture = groupMatches.length > 0;
                return (
                  <div key={group.id} className={`rounded-xl border border-l-4 p-3 ${lightGroupBg(group.name)}`}>
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-gray-900">Grupo {group.name}</p>
                      {!groupHasFixture ? (
                        <form action={generateTournamentFixtureAction}>
                          <input type="hidden" name="tournament_id" value={tournament.id} />
                          <input type="hidden" name="group_id" value={group.id} />
                          <button
                            disabled={groupTeams.length < 2}
                            className={
                              groupTeams.length >= 2
                                ? "rounded-lg border border-blue-200 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                                : "rounded-lg border border-gray-200 bg-gray-100 px-2 py-1 text-xs text-gray-400"
                            }
                          >
                            Generar fixture
                          </button>
                        </form>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                          Fixture generado ({groupMatches.length} partidos)
                        </span>
                      )}
                    </div>
                    <div className="mt-2 space-y-1">
                      {groupTeams.map((gt: any) => {
                        const t = gt.tournament_teams;
                        if (!t) return null;
                        return (
                          <div key={gt.team_id} className="flex items-center justify-between text-sm">
                            <span>{playersMap.get(t.player_id_a) || "?"} / {playersMap.get(t.player_id_b) || "?"}</span>
                          </div>
                        );
                      })}
                      {groupTeams.length === 0 ? (
                        <p className="text-xs text-gray-500">Sin equipos asignados.</p>
                      ) : null}
                    </div>
                    {/* Asignar equipo manual - solo si el grupo no tiene fixture */}
                    {!groupHasFixture ? (
                      <form action={assignTournamentTeamToGroupAction} className="mt-2 flex gap-2">
                        <input type="hidden" name="tournament_id" value={tournament.id} />
                        <input type="hidden" name="group_id" value={group.id} />
                        <select name="team_id" className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-xs">
                          <option value="">Asignar pareja</option>
                          {teams.map((t) => (
                            <option key={t.id} value={t.id}>
                              {(t.player_a as any)?.display_name || t.player_id_a} /{" "}
                              {(t.player_b as any)?.display_name || t.player_id_b}
                            </option>
                          ))}
                        </select>
                        <button className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                          Asignar
                        </button>
                      </form>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* Reabrir fixture */}
          {hasFixture ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-semibold text-amber-800">
                Fixture activo: {allMatches.length} partidos generados.
              </p>
              <form action={reopenTournamentFixtureForEditAction} className="mt-2 flex items-center gap-2">
                <input type="hidden" name="tournament_id" value={tournament.id} />
                <input
                  name="confirm_text"
                  placeholder='Escribi "REABRIR" para confirmar'
                  className="rounded-lg border border-amber-300 bg-white px-2 py-1 text-xs"
                />
                <button className="rounded-lg border border-red-300 bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700">
                  Reabrir y eliminar fixture
                </button>
              </form>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Partidos de grupos */}
      {hasFixture ? (
        <section className="space-y-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-gray-600">Partidos por grupo</h2>
          {groupsWithData.map(({ group, groupTable, groupMatches }) => (
            <div key={group.id} className={`rounded-2xl border border-l-4 p-4 ${lightGroupBg(group.name)}`}>
              <p className="font-bold text-gray-900">Grupo {group.name}</p>

              {/* Tabla de posiciones */}
              {groupTable.length > 0 ? (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="text-left text-gray-500">
                        <th className="py-1 pr-3">#</th>
                        <th className="py-1 pr-3">Pareja</th>
                        <th className="py-1 pr-3">Pts</th>
                        <th className="py-1 pr-3">PJ</th>
                        <th className="py-1 pr-3">G</th>
                        <th className="py-1 pr-3">P</th>
                        <th className="py-1">Sets G/P</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupTable.map((row: any, idx: number) => {
                        const team = teams.find((t) => t.id === row.team_id);
                        const label = team
                          ? `${(team.player_a as any)?.display_name || team.player_id_a} / ${(team.player_b as any)?.display_name || team.player_id_b}`
                          : row.team_id;
                        return (
                          <tr key={row.team_id} className={`border-t border-gray-200 ${idx < 2 ? "font-semibold" : ""}`}>
                            <td className="py-1 pr-3">{idx + 1}{idx < 2 ? " *" : ""}</td>
                            <td className="py-1 pr-3">{label}</td>
                            <td className="py-1 pr-3 font-bold">{row.points}</td>
                            <td className="py-1 pr-3">{row.played}</td>
                            <td className="py-1 pr-3">{row.wins}</td>
                            <td className="py-1 pr-3">{row.losses}</td>
                            <td className="py-1">{row.sets_won}/{row.sets_lost}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {/* Partidos del grupo */}
              <div className="mt-4 space-y-3">
                {groupMatches.map((m: any) => {
                  const match = m.matches;
                  const effectiveStatus = getEffectiveStatus(match);
                  const result = match?.match_results?.[0] || match?.match_results || null;
                  const hasResult = Boolean(result?.winner_team);
                  const sets = normalizeSets(result?.sets);
                  const setsLabel = sets.map((s: any) => `${s.team_a_games ?? s.a ?? 0}-${s.team_b_games ?? s.b ?? 0}`).join(", ");
                  const winnerLabel = result?.winner_team === "A"
                    ? `Gana Eq. A`
                    : result?.winner_team === "B" ? `Gana Eq. B` : "";
                  const isScheduled = Boolean(m.scheduled_at);
                  const canSubmitResult = effectiveStatus === "completed" && !hasResult;
                  const isInlineErrorMatch = inlineMatchId === m.id && Boolean(errorCode);

                  return (
                    <div key={m.id} className="rounded-xl border border-gray-200 bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Ronda {m.round_index}
                          </p>
                          <p className="text-sm font-semibold text-gray-900">
                            {teamLabel(m.team_a, playersMap)} vs {teamLabel(m.team_b, playersMap)}
                          </p>
                          {isScheduled ? (
                            <p className="text-xs text-gray-600">
                              {toHumanDateTime(m.scheduled_at)}{m.court ? ` - ${m.court.name}` : ""}
                            </p>
                          ) : (
                            <p className="text-xs text-amber-700">Sin programar</p>
                          )}
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          effectiveStatus === "completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : effectiveStatus === "cancelled"
                            ? "bg-red-100 text-red-800"
                            : "bg-blue-100 text-blue-800"
                        }`}>
                          {effectiveStatus === "completed" ? "Completado" : effectiveStatus === "cancelled" ? "Cancelado" : "Programado"}
                        </span>
                      </div>

                      {/* Programar */}
                      {!hasResult ? (
                        <TournamentMatchScheduleForm
                          tournamentId={tournament.id}
                          tournamentMatchId={m.id}
                          courts={courtOptions}
                          defaultDate={toInputDate(m.scheduled_at)}
                          defaultTime={toInputTime(m.scheduled_at)}
                          defaultCourtId={m.court_id || ""}
                          isScheduled={isScheduled}
                          defaultSlotDurationMinutes={defaultSlotDuration}
                        />
                      ) : null}

                      {/* Resultado */}
                      <TournamentMatchResultForm
                        tournamentId={tournament.id}
                        tournamentMatchId={m.id}
                        canSubmit={canSubmitResult}
                        hasResult={hasResult}
                        setsLabel={setsLabel}
                        winnerLabel={winnerLabel}
                        inlineError={isInlineErrorMatch ? (ERROR_LABELS[errorCode!] || errorCode) : undefined}
                        inlineErrorDebug={isInlineErrorMatch ? debugMsg : undefined}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {/* Generar playoffs */}
      {hasFixture && !hasPlayoffs ? (
        <section className="rounded-2xl border bg-white p-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-gray-600">Playoffs</h2>
          <p className="mt-2 text-sm text-gray-600">
            Cuando todos los partidos de grupos tengan resultado, genera el bracket de playoffs (top 2 de cada grupo).
          </p>
          <form action={generateTournamentPlayoffsAction} className="mt-3">
            <input type="hidden" name="tournament_id" value={tournament.id} />
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              Generar playoffs
            </button>
          </form>
        </section>
      ) : null}

      {/* Bracket de playoffs */}
      {hasPlayoffs ? (
        <section id="playoffs" className="scroll-mt-20 rounded-2xl border bg-white p-4 space-y-6">
          <h2 className="text-sm font-black uppercase tracking-wider text-gray-600">Playoffs - Cuadro de eliminacion</h2>

          {/* Visual bracket */}
          <TournamentBracketView
            playoffMatches={playoffMatches}
            teams={teams}
            playersMap={playersMap}
          />

          <p className="text-xs text-gray-400">
            Haz clic en un cruce del cuadro para ir a su seccion de gestion.
          </p>

          {/* Detailed management cards for each playoff match */}
          <div className="border-t border-gray-100 pt-4 space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Gestion de cruces</p>
            {playoffStages.map((stage) => (
              <div key={stage}>
                <p className="text-xs font-semibold text-gray-600 mb-2">{playoffStageLabel(stage)}</p>
                <div className="space-y-3">
                  {(playoffsByStage[stage] as any[]).map((pm: any) => {
                    const match = pm.matches;
                    const effectiveStatus = getEffectiveStatus(match);
                    const result = match?.match_results?.[0] || match?.match_results || null;
                    const hasResult = Boolean(result?.winner_team);
                    const sets = normalizeSets(result?.sets);
                    const setsLabel = sets.map((s: any) => `${s.team_a_games ?? s.a ?? 0}-${s.team_b_games ?? s.b ?? 0}`).join(", ");
                    const winnerLabel = result?.winner_team === "A" ? "Gana Eq. A" : result?.winner_team === "B" ? "Gana Eq. B" : "";
                    const isScheduled = Boolean(pm.scheduled_at);
                    const teamsReady = Boolean(pm.team_a_id && pm.team_b_id);
                    const canSubmitResult = teamsReady && effectiveStatus === "completed" && !hasResult;
                    const isInlineErrorPlayoff = inlinePlayoffId === pm.id && Boolean(errorCode);

                    const teamALabel = pm.team_a_id
                      ? (() => { const t = teams.find((x) => x.id === pm.team_a_id); return t ? `${(t.player_a as any)?.display_name || t.player_id_a} / ${(t.player_b as any)?.display_name || t.player_id_b}` : "?"; })()
                      : "Por definir";
                    const teamBLabel = pm.team_b_id
                      ? (() => { const t = teams.find((x) => x.id === pm.team_b_id); return t ? `${(t.player_a as any)?.display_name || t.player_id_a} / ${(t.player_b as any)?.display_name || t.player_id_b}` : "?"; })()
                      : "Por definir";

                    return (
                      <div
                        key={pm.id}
                        id={`pm-${pm.id}`}
                        className="rounded-xl border border-gray-200 p-3 scroll-mt-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                              {playoffStageShort(pm.stage, pm.match_order)}
                            </p>
                            <p className="text-sm font-semibold text-gray-900">
                              {teamALabel} vs {teamBLabel}
                            </p>
                            {isScheduled ? (
                              <p className="text-xs text-gray-600">
                                {toHumanDateTime(pm.scheduled_at)}{pm.court ? ` - ${pm.court.name}` : ""}
                              </p>
                            ) : (
                              <p className="text-xs text-amber-700">Sin programar</p>
                            )}
                            {pm.winner_team_id ? (
                              <p className="text-xs font-semibold text-emerald-700">
                                Clasificado: {(() => { const t = teams.find((x) => x.id === pm.winner_team_id); return t ? `${(t.player_a as any)?.display_name || t.player_id_a} / ${(t.player_b as any)?.display_name || t.player_id_b}` : "?"; })()}
                              </p>
                            ) : null}
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            effectiveStatus === "completed"
                              ? "bg-emerald-100 text-emerald-800"
                              : effectiveStatus === "cancelled"
                              ? "bg-red-100 text-red-800"
                              : "bg-blue-100 text-blue-800"
                          }`}>
                            {effectiveStatus === "completed" ? "Completado" : effectiveStatus === "cancelled" ? "Cancelado" : "Programado"}
                          </span>
                        </div>

                        {/* Programar playoff */}
                        {!hasResult ? (
                          <TournamentPlayoffScheduleForm
                            tournamentId={tournament.id}
                            playoffMatchId={pm.id}
                            courts={courtOptions}
                            defaultDate={toInputDate(pm.scheduled_at)}
                            defaultTime={toInputTime(pm.scheduled_at)}
                            defaultCourtId={pm.court_id || ""}
                            isScheduled={isScheduled}
                            teamsReady={teamsReady}
                            defaultSlotDurationMinutes={defaultSlotDuration}
                          />
                        ) : null}

                        {/* Resultado playoff */}
                        <TournamentPlayoffResultForm
                          tournamentId={tournament.id}
                          playoffMatchId={pm.id}
                          canSubmit={canSubmitResult}
                          hasResult={hasResult}
                          setsLabel={setsLabel}
                          winnerLabel={winnerLabel}
                          inlineError={isInlineErrorPlayoff ? (ERROR_LABELS[errorCode!] || errorCode) : undefined}
                          inlineErrorDebug={isInlineErrorPlayoff ? debugMsg : undefined}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}



