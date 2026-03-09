import { requirePlayer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RegistrationsService, OpenEvent } from "@/services/registrations.service";
import {
  requestTournamentRegistrationAction,
  requestLeagueRegistrationAction,
} from "@/lib/actions/registrations.actions";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { TeammateCombobox } from "@/components/player/TeammateCombobox";

type TeammateOption = {
  id: string;
  display_name: string;
  city: string | null;
  region_name: string | null;
};

function statusBadge(status: OpenEvent["registration_status"]) {
  if (status === "confirmed") {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-bold text-green-800">
        Confirmado
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-[11px] font-bold text-yellow-800">
        Pendiente
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-800">
        Rechazado
      </span>
    );
  }
  return null;
}

function formatDate(d: string | null) {
  if (!d) return null;
  try {
    return format(parseISO(d), "d 'de' MMMM yyyy", { locale: es });
  } catch {
    return null;
  }
}

export default async function PlayerEventsPage({
  searchParams,
}: {
  searchParams: { ok?: string; error?: string; debug?: string };
}) {
  const { player } = await requirePlayer();
  const service = new RegistrationsService();
  const supabase = await createClient();

  let events: OpenEvent[] = [];
  let fetchError: string | null = null;
  try {
    events = await service.getOpenEvents();
  } catch {
    fetchError = "No se pudieron cargar los eventos disponibles.";
  }

  let teammateOptions: TeammateOption[] = [];
  const { data: teammatesData } = await (supabase as any)
    .from("players")
    .select("id,display_name,city,region_name,user_id")
    .neq("id", player.id)
    .eq("status", "active")
    .is("deleted_at", null)
    .not("user_id", "is", null)
    .order("display_name", { ascending: true })
    .limit(200);

  teammateOptions = ((teammatesData || []) as any[]).map((row) => ({
    id: row.id,
    display_name: row.display_name || "Jugador",
    city: row.city ?? null,
    region_name: row.region_name ?? null,
  }));

  const tournaments = events.filter((e) => e.entity_type === "tournament");
  const leagues = events.filter((e) => e.entity_type === "league");

  const okMessages: Record<string, string> = {
    REGISTRATION_REQUESTED: "Tu solicitud de inscripcion fue enviada. El club la revisara pronto.",
  };
  const errorMessages: Record<string, string> = {
    ALREADY_REGISTERED: "Ya tienes una inscripcion activa para este evento.",
    TEAMMATE_NOT_FOUND: "El companero seleccionado no esta disponible.",
    TEAMMATE_NOT_ELIGIBLE: "El companero seleccionado no puede recibir notificaciones.",
    TEAMMATE_ALREADY_REGISTERED: "Tu companero ya tiene una inscripcion activa en este evento.",
    INVALID_TEAM_PLAYERS: "Selecciona un companero distinto a tu perfil.",
    TOURNAMENT_NOT_OPEN: "Este torneo no esta abierto para inscripciones.",
    LEAGUE_NOT_OPEN: "Esta liga no esta abierta para inscripciones.",
    NOT_AUTHENTICATED: "Tu sesion expiro, vuelve a iniciar sesion.",
    PLAYER_NOT_FOUND: "No se encontro tu perfil de jugador.",
    UNKNOWN: "Ocurrio un error inesperado.",
  };

  return (
    <div className="container mx-auto max-w-3xl space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Eventos disponibles</h1>
        <p className="mt-1 text-sm text-gray-500">
          Torneos y ligas abiertas para inscripcion en tu zona.
        </p>
      </div>

      {searchParams.ok && okMessages[searchParams.ok] && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
          {okMessages[searchParams.ok]}
        </div>
      )}
      {searchParams.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {errorMessages[searchParams.error] ?? `Error: ${searchParams.error}`}
        </div>
      )}
      {fetchError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {fetchError}
        </div>
      )}

      <section>
        <h2 className="mb-3 text-sm font-black uppercase tracking-wider text-gray-500">
          Torneos
        </h2>
        {tournaments.length === 0 ? (
          <p className="rounded-xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-400">
            No hay torneos disponibles en tu ciudad por el momento.
          </p>
        ) : (
          <div className="space-y-3">
            {tournaments.map((ev) => (
              <EventCard
                key={ev.entity_id}
                ev={ev}
                action={requestTournamentRegistrationAction}
                inputName="tournament_id"
                teammateOptions={teammateOptions}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-black uppercase tracking-wider text-gray-500">
          Ligas
        </h2>
        {leagues.length === 0 ? (
          <p className="rounded-xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-400">
            No hay ligas disponibles en tu ciudad por el momento.
          </p>
        ) : (
          <div className="space-y-3">
            {leagues.map((ev) => (
              <EventCard
                key={ev.entity_id}
                ev={ev}
                action={requestLeagueRegistrationAction}
                inputName="league_id"
                teammateOptions={teammateOptions}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EventCard({
  ev,
  action,
  inputName,
  teammateOptions,
}: {
  ev: OpenEvent;
  action: (formData: FormData) => Promise<void>;
  inputName: string;
  teammateOptions: TeammateOption[];
}) {
  const start = formatDate(ev.start_date);
  const end = formatDate(ev.end_date);
  const hasReg = ev.registration_id !== null;
  const canRegister = !hasReg || ev.registration_status === "rejected";
  const partnerName = ev.registration_partner_name || null;
  const roleLabel =
    ev.registration_role === "teammate"
      ? "Te inscribieron como companero"
      : ev.registration_role === "requester"
      ? "Solicitud enviada por ti"
      : null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-base font-bold text-gray-900">
            {ev.entity_name}
            {ev.season_label ? (
              <span className="ml-2 text-sm font-medium text-gray-500">{ev.season_label}</span>
            ) : null}
          </p>
          <p className="mt-0.5 text-sm text-gray-500">{ev.club_name}</p>
          {(start || end) && (
            <p className="mt-1 text-xs text-gray-400">
              {start && `Inicio: ${start}`}
              {start && end && " - "}
              {end && `Cierre: ${end}`}
            </p>
          )}
          {roleLabel ? (
            <p className="mt-1 text-xs font-semibold text-gray-600">{roleLabel}</p>
          ) : null}
          {partnerName ? (
            <p className="text-xs text-gray-500">Companero: {partnerName}</p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-2">
          {hasReg ? statusBadge(ev.registration_status) : null}
        </div>
      </div>

      {canRegister ? (
        <form action={action} className="mt-3 grid gap-2 md:grid-cols-[1fr_auto] md:items-end">
          <input type="hidden" name={inputName} value={ev.entity_id} />
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-gray-500">
              Companero (opcional)
            </label>
            <TeammateCombobox options={teammateOptions} />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-700"
          >
            Enviar solicitud
          </button>
        </form>
      ) : null}
    </div>
  );
}
