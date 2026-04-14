import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/Badge";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { requireClubOwner } from "@/lib/auth";
import { PlayerService } from "@/services/player.service";
import { resolveAvatarSrc } from "@/lib/avatar-server.utils";
import { getSiteUrl } from "@/lib/utils/url";
import { buildPlayerInviteMessage } from "@/lib/share/shareMessage";
import { InviteWhatsAppButton } from "@/components/players/InviteWhatsAppButton";
import { ClubPlayerProfileModal } from "@/components/players/ClubPlayerProfileModal";
import { formatCityWithProvinceAbbr } from "@/lib/utils/location";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ClubDirectoryRow = {
  id: string;
  display_name: string;
  city: string | null;
  city_id: string | null;
  region_code: string | null;
  region_name: string | null;
  category: number | null;
  position: "drive" | "reves" | "cualquiera" | null;
  user_id: string | null;
  pasala_index: number | null;
  level: "ROOKIE" | "AMATEUR" | "COMPETITIVO" | "PRO" | "ELITE";
  win_rate: number;
  played: number;
  current_streak: string;
  activity_level: "muy_activo" | "activo" | "ocasional" | "inactivo" | "nuevo";
  is_club_player: boolean;
  has_active_club_registration: boolean;
  last_club_match_at: string | null;
  club_bookings_count: number;
  club_avg_matches_per_week_30d: number;
  avatarData?: { src: string | null; initials: string };
  inviteMessage?: string;
};

function categoryLabel(value?: number | null) {
  if (!value) return "-";
  return `${value}ta`;
}

function levelClass(level: ClubDirectoryRow["level"]) {
  if (level === "ELITE") return "bg-amber-50 text-amber-700 border border-amber-200";
  if (level === "PRO") return "bg-violet-50 text-violet-700 border border-violet-200";
  if (level === "COMPETITIVO") return "bg-blue-50 text-blue-700 border border-blue-200";
  if (level === "AMATEUR") return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  return "bg-slate-100 text-slate-700 border border-slate-200";
}

function levelLabel(level: ClubDirectoryRow["level"]) {
  if (level === "ROOKIE") return "INICIAL";
  return level;
}

function activityMeta(activity: ClubDirectoryRow["activity_level"]) {
  if (activity === "muy_activo") {
    return { label: "Muy activo", className: "bg-rose-50 text-rose-700 border border-rose-200" };
  }
  if (activity === "activo") {
    return { label: "Activo", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
  }
  if (activity === "ocasional") {
    return { label: "Ocasional", className: "bg-amber-50 text-amber-700 border border-amber-200" };
  }
  if (activity === "inactivo") {
    return { label: "Inactivo", className: "bg-slate-100 text-slate-700 border border-slate-200" };
  }
  return { label: "Nuevo", className: "bg-cyan-50 text-cyan-700 border border-cyan-200" };
}

function pasalaProgress(value: number | null) {
  const score = Number(value ?? 0);
  return Math.max(0, Math.min(100, Number.isFinite(score) ? score : 0));
}

function formatLastMatchDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(date);
}

export default async function MiClubPlayersPage({
  searchParams,
}: {
  searchParams: {
    q?: string;
    category?: string;
    account?: string;
    activity?: string;
    registration?: string;
    sort?: string;
  };
}) {
  const { club } = await requireClubOwner();

  const query = searchParams.q || "";
  const categoryFilter = searchParams.category || "all";
  const accountFilter = searchParams.account || "all";
  const activityFilter = searchParams.activity || "all";
  const registrationFilter = searchParams.registration || "all";
  const sortBy = searchParams.sort || "relevance";
  const siteUrl = getSiteUrl();

  const playerService = new PlayerService();
  const { total, players } = await playerService.getClubPlayersDirectory({
    clubId: club.id,
    query,
    category: categoryFilter === "all" ? null : Number(categoryFilter),
    account: accountFilter as "all" | "linked" | "guest",
    activity: activityFilter === "all" ? undefined : activityFilter,
    registration: registrationFilter as "all" | "registered" | "unregistered",
    orderBy: sortBy as
      | "relevance"
      | "name_asc"
      | "name_desc"
      | "category_desc"
      | "category_asc"
      | "index_desc"
      | "win_rate_desc"
      | "played_desc"
      | "last_match_desc"
      | "bookings_desc"
      | "club_activity_desc",
    limit: 120,
  });

  const list = await Promise.all(
    (players as ClubDirectoryRow[]).map(async (player) => {
      const avatarData = await resolveAvatarSrc({ player: player as any });
      return {
        ...player,
        avatarData,
        inviteMessage: buildPlayerInviteMessage(
          {
            id: player.id,
            display_name: player.display_name,
            city: player.city,
            region_code: player.region_code,
          },
          siteUrl
        ),
      };
    })
  );

  const hasFilters =
    !!query ||
    categoryFilter !== "all" ||
    accountFilter !== "all" ||
    activityFilter !== "all" ||
    registrationFilter !== "all" ||
    sortBy !== "relevance";

  return (
    <div className="w-full">
      <div className="mb-6 space-y-3">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-gray-900">Directorio</h1>
          <p className="text-sm font-medium text-gray-500">
            {total} jugadores · vista club con métricas internas
          </p>
        </div>

        <form className="space-y-3">
          <div className="group relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <svg className="h-5 w-5 text-gray-400 transition-colors group-focus-within:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <Input
              name="q"
              defaultValue={query}
              placeholder="Buscar por nombre o ciudad..."
              className="h-12 rounded-2xl border-gray-200 bg-white pl-12 text-base shadow-sm transition-all focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select name="category" defaultValue={categoryFilter} className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700">
              <option value="all">Categoría</option>
              <option value="1">1ra</option>
              <option value="2">2da</option>
              <option value="3">3ra</option>
              <option value="4">4ta</option>
              <option value="5">5ta</option>
              <option value="6">6ta</option>
              <option value="7">7ma</option>
            </select>

            <select name="registration" defaultValue={registrationFilter} className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700">
              <option value="all">Inscripción activa</option>
              <option value="registered">Inscripto en torneo/liga</option>
              <option value="unregistered">No inscripto</option>
            </select>

            <select name="activity" defaultValue={activityFilter} className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700">
              <option value="all">Actividad</option>
              <option value="muy_activo">Muy activo</option>
              <option value="activo">Activo</option>
              <option value="ocasional">Ocasional</option>
              <option value="nuevo">Nuevo</option>
              <option value="inactivo">Inactivo</option>
            </select>

            <select name="account" defaultValue={accountFilter} className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700">
              <option value="all">Tipo cuenta</option>
              <option value="linked">Vinculados</option>
              <option value="guest">Invitados</option>
            </select>

            <select name="sort" defaultValue={sortBy} className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700">
              <option value="relevance">Relevancia</option>
              <option value="last_match_desc">Último partido club</option>
              <option value="bookings_desc">Más reservas club</option>
              <option value="club_activity_desc">Más activo (club)</option>
              <option value="index_desc">Índice PASALA</option>
              <option value="win_rate_desc">Win rate</option>
              <option value="played_desc">Partidos jugados</option>
              <option value="name_asc">Nombre A-Z</option>
              <option value="name_desc">Nombre Z-A</option>
            </select>

            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-xs font-black uppercase tracking-wide text-white hover:bg-blue-700"
            >
              Filtrar
            </button>

            {hasFilters && (
              <Link
                href="/player/mi-club/jugadores"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                Limpiar
              </Link>
            )}
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1320px] table-fixed">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr className="text-left">
                <th className="w-[16%] px-2.5 py-2 text-[11px] font-black uppercase tracking-wide text-gray-500">Jugador</th>
                <th className="w-[12%] px-2.5 py-2 text-[11px] font-black uppercase tracking-wide text-gray-500">Ubicación</th>
                <th className="w-[7%] px-2.5 py-2 text-[11px] font-black uppercase tracking-wide text-gray-500">Categoría</th>
                <th className="w-[10%] px-2.5 py-2 text-[11px] font-black uppercase tracking-wide text-gray-500">Índice PASALA</th>
                <th className="w-[8%] px-2.5 py-2 text-[11px] font-black uppercase tracking-wide text-gray-500">Nivel</th>
                <th className="w-[5%] px-2.5 py-2 text-[11px] font-black uppercase tracking-wide text-gray-500">WR</th>
                <th className="w-[4%] px-2.5 py-2 text-[11px] font-black uppercase tracking-wide text-gray-500">PJ</th>
                <th className="w-[5%] px-2.5 py-2 text-[11px] font-black uppercase tracking-wide text-gray-500">Racha</th>
                <th className="w-[7%] px-2.5 py-2 text-[11px] font-black uppercase tracking-wide text-gray-500">Actividad</th>
                <th className="w-[6%] px-2.5 py-2 text-[11px] font-black uppercase tracking-wide text-gray-500">Últ. partido</th>
                <th className="w-[5%] px-2.5 py-2 text-[11px] font-black uppercase tracking-wide text-gray-500">Inscripto</th>
                <th className="w-[4%] px-2.5 py-2 text-[11px] font-black uppercase tracking-wide text-gray-500">Reservas</th>
                <th className="w-[5%] px-2.5 py-2 text-[11px] font-black uppercase tracking-wide text-gray-500">Prom/sem</th>
                <th className="w-[6%] px-2.5 py-2 text-right text-[11px] font-black uppercase tracking-wide text-gray-500">Acción</th>
              </tr>
            </thead>
            <tbody>
              {list.length > 0 ? (
                list.map((player) => {
                  const activity = activityMeta(player.activity_level);
                  const pasala = pasalaProgress(player.pasala_index);
                  const locationLabel = formatCityWithProvinceAbbr(player.city, player.region_code, player.region_name);

                  return (
                    <tr key={player.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/70">
                      <td className="px-2.5 py-2">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar
                            src={player.avatarData?.src || null}
                            initials={player.avatarData?.initials || player.display_name?.slice(0, 2)}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">{player.display_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-2.5 py-2 text-sm text-gray-700">
                        <span className="block truncate">{locationLabel}</span>
                      </td>
                      <td className="px-2.5 py-2">
                        <Badge className="border border-gray-200 bg-gray-100 text-gray-700">
                          Cat. {categoryLabel(player.category)}
                        </Badge>
                      </td>
                      <td className="px-2.5 py-2">
                        <div className="w-full max-w-[120px]">
                          <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-gray-700">
                            <span>{player.pasala_index == null ? "-" : player.pasala_index.toFixed(1)}</span>
                            <span>/100</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                            <div className="h-full rounded-full bg-blue-600" style={{ width: `${pasala}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-2.5 py-2">
                        <Badge className={levelClass(player.level)}>{levelLabel(player.level)}</Badge>
                      </td>
                      <td className="px-2.5 py-2 text-sm font-semibold text-gray-800">
                        {Number(player.win_rate || 0).toFixed(1)}%
                      </td>
                      <td className="px-2.5 py-2 text-sm font-semibold text-gray-800">{player.played}</td>
                      <td className="px-2.5 py-2 text-sm font-semibold text-gray-800">{player.current_streak || "-"}</td>
                      <td className="px-2.5 py-2">
                        <Badge className={activity.className}>{activity.label}</Badge>
                      </td>
                      <td className="px-2.5 py-2 text-sm font-semibold text-gray-800">
                        {formatLastMatchDate(player.last_club_match_at)}
                      </td>
                      <td className="px-2.5 py-2">
                        <Badge
                          className={
                            player.has_active_club_registration
                              ? "border border-blue-200 bg-blue-50 text-blue-700"
                              : "border border-gray-200 bg-gray-100 text-gray-600"
                          }
                        >
                          {player.has_active_club_registration ? "Sí" : "No"}
                        </Badge>
                      </td>
                      <td className="px-2.5 py-2 text-sm font-semibold text-gray-800">{player.club_bookings_count || 0}</td>
                      <td className="px-2.5 py-2 text-sm font-semibold text-gray-800">
                        {Number(player.club_avg_matches_per_week_30d || 0).toFixed(2)}
                      </td>
                      <td className="px-2.5 py-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <ClubPlayerProfileModal
                            playerId={player.id}
                            displayName={player.display_name}
                            avatarSrc={player.avatarData?.src || null}
                            avatarInitials={player.avatarData?.initials || player.display_name?.slice(0, 2)}
                            locationLabel={locationLabel}
                            category={player.category}
                            position={player.position}
                            pasalaIndex={player.pasala_index}
                            level={player.level}
                            winRate={player.win_rate}
                            played={player.played}
                            currentStreak={player.current_streak}
                            activityLevel={player.activity_level}
                          />
                          {player.user_id === null && (
                            <InviteWhatsAppButton
                              message={player.inviteMessage || ""}
                              context="directory"
                              iconOnly
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#25D366] text-white hover:bg-[#128C7E] disabled:opacity-60"
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={14} className="px-6 py-20 text-center">
                    <div className="space-y-3">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gray-50">
                        <svg className="h-8 w-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">No se encontraron jugadores</p>
                        <p className="text-sm text-gray-500">Probá con otro filtro o término de búsqueda</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
