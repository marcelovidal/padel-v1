import { Input } from "@/components/ui/input";
import { requirePlayer } from "@/lib/auth";
import { PlayerService } from "@/services/player.service";
import { CoachService } from "@/services/coach.service";
import { resolveAvatarSrc } from "@/lib/avatar-server.utils";
import { PlayersDirectoryTable, type DirectoryRow } from "@/components/player/PlayersDirectoryTable";

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
  const isCoach = (mePlayer as any).is_coach === true;

  const [players, coachProfile] = await Promise.all([
    playerService.getPlayersDirectory(query, mePlayer.city_id || null) as Promise<DirectoryRow[]>,
    isCoach ? new CoachService().getProfileByPlayerId(mePlayer.id).catch(() => null) : Promise.resolve(null),
  ]);

  const list = await Promise.all(
    players.map(async (p) => {
      const resolved = await resolveAvatarSrc({
        player: p as any,
        user: p.user_id === user.id ? user : undefined,
      });

      return {
        ...p,
        avatarData: {
          src: resolved.src ?? null,
          initials: (resolved as any).initials ?? "",
        } as { src: string | null; initials: string },
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

      <PlayersDirectoryTable players={filtered} meId={meId} coachProfile={coachProfile} />
    </div>
  );
}
