import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/Badge";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { requirePlayer } from "@/lib/auth";
import { PlayerService } from "@/services/player.service";
import { resolveAvatarSrc } from "@/lib/avatar-server.utils";
import { formatCityWithProvinceAbbr } from "@/lib/utils/location";

type DirectoryRow = {
  id: string;
  display_name: string;
  city: string | null;
  city_id: string | null;
  region_code: string | null;
  region_name: string | null;
  category: number | null;
  user_id: string | null;
  pasala_index: number | null;
  level: "ROOKIE" | "AMATEUR" | "COMPETITIVO" | "PRO" | "ELITE";
  win_rate: number;
  played: number;
  current_streak: string;
  activity_level: "muy_activo" | "activo" | "ocasional" | "inactivo" | "nuevo";
  is_same_city: boolean;
  avatarData?: { src: string | null; initials: string };
};

function categoryLabel(value?: number | null) {
  if (!value) return "-";
  return `${value}ta`;
}

function levelClass(level: DirectoryRow["level"]) {
  if (level === "ELITE") return "bg-amber-50 text-amber-700 border border-amber-200";
  if (level === "PRO") return "bg-violet-50 text-violet-700 border border-violet-200";
  if (level === "COMPETITIVO") return "bg-blue-50 text-blue-700 border border-blue-200";
  if (level === "AMATEUR") return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  return "bg-slate-100 text-slate-700 border border-slate-200";
}

function levelLabel(level: DirectoryRow["level"]) {
  if (level === "ROOKIE") return "INICIAL";
  return level;
}

function activityMeta(activity: DirectoryRow["activity_level"]) {
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

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string; city?: string; activity?: string; sort?: string };
}) {
  const { user, player: mePlayer } = await requirePlayer();
  const meId = mePlayer.id;
  const query = searchParams.q || "";
  const categoryFilter = searchParams.category || "all";
  const cityFilter = searchParams.city || "all";
  const activityFilter = searchParams.activity || "all";
  const sortBy = searchParams.sort || "pasala_desc";

  const playerService = new PlayerService();
  const players = (await playerService.getPlayersDirectory(query, mePlayer.city_id || null)) as DirectoryRow[];

  const list = await Promise.all(
    players.map(async (p) => {
      const avatarData = await resolveAvatarSrc({
        player: p as any,
        user: p.user_id === user.id ? user : undefined,
      });

      return {
        ...p,
        avatarData,
      };
    })
  );

  const cityOptions = Array.from(
    new Map(
      list
        .filter((p) => p.city)
        .map((p) => [p.city_id || p.city || "", { cityId: p.city_id || "", label: p.city || "Sin ciudad" }])
    ).values()
  ).sort((a, b) => a.label.localeCompare(b.label, "es"));

  const filtered = list.filter((p) => {
    if (categoryFilter !== "all" && String(p.category || "") !== categoryFilter) return false;
    if (cityFilter !== "all" && (p.city_id || "") !== cityFilter) return false;
    if (activityFilter !== "all" && p.activity_level !== activityFilter) return false;
    return true;
  });

  filtered.sort((a, b) => {
    if (a.is_same_city !== b.is_same_city) return a.is_same_city ? -1 : 1;

    if (sortBy === "win_rate_desc") return b.win_rate - a.win_rate;
    if (sortBy === "played_desc") return b.played - a.played;
    if (sortBy === "name_asc") return a.display_name.localeCompare(b.display_name, "es");
    return pasalaProgress(b.pasala_index) - pasalaProgress(a.pasala_index);
  });

  return (
    <div className="container mx-auto max-w-[1280px] p-4">
      <div className="mb-6 space-y-3">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-gray-900">Directorio</h1>
          <p className="text-sm font-medium text-gray-500">Primero jugadores de tu ciudad, luego el resto</p>
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
              placeholder="Buscar por nombre..."
              className="h-12 rounded-2xl border-gray-200 bg-white pl-12 text-base shadow-sm transition-all focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select name="category" defaultValue={categoryFilter} className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700">
              <option value="all">Categoria</option>
              <option value="1">1ra</option>
              <option value="2">2da</option>
              <option value="3">3ra</option>
              <option value="4">4ta</option>
              <option value="5">5ta</option>
              <option value="6">6ta</option>
              <option value="7">7ma</option>
            </select>

            <select name="city" defaultValue={cityFilter} className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700">
              <option value="all">Ciudad</option>
              {cityOptions.map((city) => (
                <option key={city.cityId || city.label} value={city.cityId}>
                  {city.label}
                </option>
              ))}
            </select>

            <select name="activity" defaultValue={activityFilter} className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700">
              <option value="all">Actividad</option>
              <option value="muy_activo">Muy activo</option>
              <option value="activo">Activo</option>
              <option value="ocasional">Ocasional</option>
              <option value="inactivo">Inactivo</option>
              <option value="nuevo">Nuevo</option>
            </select>

            <select name="sort" defaultValue={sortBy} className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700">
              <option value="pasala_desc">Indice PASALA</option>
              <option value="win_rate_desc">Win rate</option>
              <option value="played_desc">Partidos jugados</option>
              <option value="name_asc">Nombre alfabetico</option>
            </select>

            <button type="submit" className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-xs font-black uppercase tracking-wide text-white hover:bg-blue-700">
              Filtrar
            </button>
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] table-fixed">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr className="text-left">
              <th className="w-[19%] px-3 py-2 text-[11px] font-black uppercase tracking-wide text-gray-500">Jugador</th>
              <th className="w-[13%] px-3 py-2 text-[11px] font-black uppercase tracking-wide text-gray-500">Ubicacion</th>
              <th className="w-[8%] px-3 py-2 text-[11px] font-black uppercase tracking-wide text-gray-500">Categoria</th>
              <th className="w-[15%] px-3 py-2 text-[11px] font-black uppercase tracking-wide text-gray-500">Indice PASALA</th>
              <th className="w-[10%] px-3 py-2 text-[11px] font-black uppercase tracking-wide text-gray-500">Nivel</th>
              <th className="w-[7%] px-3 py-2 text-[11px] font-black uppercase tracking-wide text-gray-500">WR</th>
              <th className="w-[6%] px-3 py-2 text-[11px] font-black uppercase tracking-wide text-gray-500">PJ</th>
              <th className="w-[6%] px-3 py-2 text-[11px] font-black uppercase tracking-wide text-gray-500">Racha</th>
              <th className="w-[9%] px-3 py-2 text-[11px] font-black uppercase tracking-wide text-gray-500">Actividad</th>
              <th className="w-[7%] px-3 py-2 text-right text-[11px] font-black uppercase tracking-wide text-gray-500">Accion</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((p) => {
                const activity = activityMeta(p.activity_level);
                const pasala = pasalaProgress(p.pasala_index);
                return (
                  <tr key={p.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/70">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar src={p.avatarData?.src || null} initials={p.avatarData?.initials || p.display_name?.slice(0, 2)} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">{p.display_name}</p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {p.id === meId && <Badge className="bg-blue-600 text-[10px] font-black uppercase tracking-widest text-white">Tu perfil</Badge>}
                            {p.is_same_city && (
                              <Badge className="border border-indigo-100 bg-indigo-50/50 text-[8px] font-medium lowercase tracking-normal text-indigo-500">
                                tu ciudad
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-700">
                      <span className="line-clamp-2">{formatCityWithProvinceAbbr(p.city, p.region_code, p.region_name)}</span>
                    </td>
                    <td className="px-3 py-2">
                      <Badge className="border border-gray-200 bg-gray-100 text-gray-700">Cat. {categoryLabel(p.category)}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <div className="w-full max-w-[150px]">
                        <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-gray-700">
                          <span>{p.pasala_index == null ? "-" : p.pasala_index.toFixed(1)}</span>
                          <span>/100</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                          <div className="h-full rounded-full bg-blue-600" style={{ width: `${pasala}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Badge className={levelClass(p.level)}>{levelLabel(p.level)}</Badge>
                    </td>
                    <td className="px-3 py-2 text-sm font-semibold text-gray-800">{p.win_rate.toFixed(1)}%</td>
                    <td className="px-3 py-2 text-sm font-semibold text-gray-800">{p.played}</td>
                    <td className="px-3 py-2 text-sm font-semibold text-gray-800">{p.current_streak || "-"}</td>
                    <td className="px-3 py-2">
                      <Badge className={activity.className}>{activity.label}</Badge>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link href={`/p/${p.id}`} className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:border-gray-300">
                        Ver perfil
                      </Link>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={10} className="px-6 py-20 text-center">
                  <div className="space-y-3">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gray-50">
                      <svg className="h-8 w-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">No se encontraron jugadores</p>
                      <p className="text-sm text-gray-500">Proba con otro filtro o termino de busqueda</p>
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
