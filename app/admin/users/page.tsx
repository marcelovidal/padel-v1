import { requireAdmin } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlayerService } from "@/services/player.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ACTIVITY_LABELS: Record<string, string> = {
  hot:        "En racha",
  active:     "Activo",
  occasional: "Ocasional",
  new:        "Nuevo",
  inactive:   "Inactivo",
};

const ACTIVITY_COLORS: Record<string, string> = {
  hot:        "bg-amber-100 text-amber-800",
  active:     "bg-emerald-100 text-emerald-800",
  occasional: "bg-blue-100 text-blue-700",
  new:        "bg-cyan-100 text-cyan-700",
  inactive:   "bg-gray-100 text-gray-500",
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string; activity?: string };
}) {
  await requireAdmin();

  const query    = searchParams.q        ?? "";
  const category = searchParams.category ? parseInt(searchParams.category) : null;
  const activity = searchParams.activity ?? "";

  const playerService = new PlayerService();
  const { total, players } = await playerService.getPlayersDirectory({
    query,
    category,
    activity: activity || undefined,
    orderBy: "index_desc",
    limit: 200,
  });

  const hasFilters = query || category || activity;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Jugadores</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} jugadores en el sistema</p>
        </div>
        <Link href="/admin/users/new">
          <Button>Nuevo Jugador</Button>
        </Link>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-4">
          <form className="flex flex-wrap gap-2">
            <input
              name="q"
              defaultValue={query}
              placeholder="Buscar nombre o ciudad..."
              className="flex-1 min-w-[200px] rounded-xl border border-gray-200 px-3 py-2 text-sm"
            />
            <select
              name="category"
              defaultValue={category ?? ""}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">Categoría</option>
              {[1, 2, 3, 4, 5, 6, 7].map((c) => (
                <option key={c} value={c}>{c}ª</option>
              ))}
            </select>
            <select
              name="activity"
              defaultValue={activity}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">Actividad</option>
              <option value="hot">En racha</option>
              <option value="active">Activos</option>
              <option value="occasional">Ocasionales</option>
              <option value="new">Nuevos</option>
              <option value="inactive">Inactivos</option>
            </select>
            <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">
              Buscar
            </button>
            {hasFilters && (
              <Link href="/admin/users" className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-500">
                Limpiar
              </Link>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Jugadores</CardTitle>
        </CardHeader>
        <CardContent>
          {players.length === 0 ? (
            <p className="text-gray-500">No se encontraron jugadores</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jugador</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ciudad</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Cat.</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">PASALA</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">PJ</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">WR%</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actividad</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {players.map((player: any) => (
                    <tr key={player.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {player.display_name}
                        {player.user_id === null && (
                          <span className="ml-1.5 text-[10px] text-gray-400 font-normal">(sin cuenta)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{player.city || "—"}</td>
                      <td className="px-4 py-3 text-center text-gray-500">{player.category ? `${player.category}ª` : "—"}</td>
                      <td className="px-4 py-3 text-center font-bold text-blue-600">
                        {player.pasala_index !== null ? Math.round(player.pasala_index) : "—"}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500">{player.played}</td>
                      <td className="px-4 py-3 text-center text-gray-500">
                        {player.played > 0 ? `${player.win_rate}%` : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ACTIVITY_COLORS[player.activity_badge] ?? "bg-gray-100 text-gray-500"}`}>
                          {ACTIVITY_LABELS[player.activity_badge] ?? player.activity_badge}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <Link href={`/admin/users/${player.id}`}>
                            <Button size="sm" variant="outline">Ver</Button>
                          </Link>
                          <Link href={`/admin/users/${player.id}/edit`}>
                            <Button size="sm" variant="outline">Editar</Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
