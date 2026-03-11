import Link from "next/link";
import { requirePlayer } from "@/lib/auth";
import { PlayerService } from "@/services/player.service";
import { PlayerDirectoryCard } from "@/components/players/PlayerDirectoryCard";
import { InviteWhatsAppButton } from "@/components/players/InviteWhatsAppButton";
import { getSiteUrl } from "@/lib/utils/url";
import { buildPlayerInviteMessage } from "@/lib/share/shareMessage";

export const dynamic = "force-dynamic";

const CATEGORIES = [1, 2, 3, 4, 5, 6, 7];
const ORDER_OPTIONS = [
  { value: "relevance",     label: "Relevancia" },
  { value: "index_desc",    label: "Mejor PASALA" },
  { value: "win_rate_desc", label: "Mejor WR" },
  { value: "recent",        label: "Más activos" },
];
const ACTIVITY_OPTIONS = [
  { value: "",           label: "Todos" },
  { value: "hot",        label: "En racha" },
  { value: "active",     label: "Activos" },
  { value: "occasional", label: "Ocasionales" },
  { value: "new",        label: "Nuevos" },
  { value: "inactive",   label: "Inactivos" },
];

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: {
    q?: string;
    category?: string;
    activity?: string;
    order?: string;
  };
}) {
  const { user, player: me } = await requirePlayer();
  const siteUrl = getSiteUrl();

  const query    = searchParams.q        ?? "";
  const category = searchParams.category ? parseInt(searchParams.category) : null;
  const activity = searchParams.activity ?? "";
  const orderBy  = searchParams.order    ?? "relevance";

  const playerService = new PlayerService();
  const { total, players } = await playerService.getPlayersDirectory({
    viewerCityId: me.city_id ?? null,
    query,
    category,
    activity: activity || undefined,
    orderBy,
    limit: 48,
  });

  const sameCity = players.filter((p: any) => p.is_same_city);
  const others   = players.filter((p: any) => !p.is_same_city);

  function buildInviteMsg(p: any) {
    return buildPlayerInviteMessage({ id: p.id, display_name: p.display_name, city: p.city, region_code: p.region_code }, siteUrl);
  }

  const hasFilters = query || category || activity || orderBy !== "relevance";

  return (
    <div className="container mx-auto p-4 max-w-5xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Directorio</h1>
        <p className="text-gray-500 text-sm font-medium mt-0.5">
          {total} jugadores · ordenados por cercanía y nivel
        </p>
      </div>

      {/* Filters */}
      <form className="space-y-3">
        {/* Search */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            name="q"
            defaultValue={query}
            placeholder="Buscar por nombre o ciudad..."
            className="w-full pl-12 pr-4 h-12 bg-white border border-gray-200 rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-300 transition-all text-sm"
          />
        </div>

        {/* Row: category + activity + order */}
        <div className="flex flex-wrap gap-2">
          {/* Category */}
          <select
            name="category"
            defaultValue={category ?? ""}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 shadow-sm"
          >
            <option value="">Categoría</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}ª</option>
            ))}
          </select>

          {/* Activity */}
          <select
            name="activity"
            defaultValue={activity}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 shadow-sm"
          >
            {ACTIVITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Order */}
          <select
            name="order"
            defaultValue={orderBy}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 shadow-sm"
          >
            {ORDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-blue-500 transition-colors"
          >
            Filtrar
          </button>

          {hasFilters && (
            <Link
              href="/player/players"
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors"
            >
              Limpiar
            </Link>
          )}
        </div>
      </form>

      {players.length === 0 ? (
        <div className="py-20 text-center space-y-3">
          <div className="bg-gray-50 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div>
            <p className="text-gray-900 font-bold">Sin resultados</p>
            <p className="text-gray-500 text-sm">Probá con otro filtro</p>
          </div>
        </div>
      ) : (
        <>
          {/* Same-city section */}
          {sameCity.length > 0 && orderBy === "relevance" && !query && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <h2 className="text-sm font-black uppercase tracking-widest text-gray-500">De tu ciudad</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {sameCity.map((p: any) => (
                  <PlayerDirectoryCard
                    key={p.id}
                    player={p}
                    viewerId={user.id}
                    extraAction={
                      p.user_id === null ? (
                        <InviteWhatsAppButton message={buildInviteMsg(p)} context="directory" />
                      ) : undefined
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {/* Others section */}
          {(others.length > 0 || !sameCity.length || orderBy !== "relevance" || query) && (
            <section className="space-y-4">
              {sameCity.length > 0 && orderBy === "relevance" && !query && (
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-400" />
                  <h2 className="text-sm font-black uppercase tracking-widest text-gray-500">Otros jugadores</h2>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(sameCity.length > 0 && orderBy === "relevance" && !query ? others : players).map((p: any) => (
                  <PlayerDirectoryCard
                    key={p.id}
                    player={p}
                    viewerId={user.id}
                    extraAction={
                      p.user_id === null ? (
                        <InviteWhatsAppButton message={buildInviteMsg(p)} context="directory" />
                      ) : undefined
                    }
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
