import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { ClubAdminService } from "@/services/club-admin.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatLocation(cluster: {
  city: string | null;
  region_name: string | null;
  region_code: string | null;
  country_code: string;
}) {
  const region = cluster.region_name || cluster.region_code;
  const city = cluster.city || "Sin ciudad";
  if (region) return `${city} (${region}, ${cluster.country_code})`;
  return `${city} (${cluster.country_code})`;
}

export default async function AdminClubDuplicatesPage({
  searchParams,
}: {
  searchParams: { q?: string; limit?: string };
}) {
  await requireAdmin();

  const q = searchParams.q?.trim() || "";
  const limitRaw = Number(searchParams.limit || "50");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;

  const service = new ClubAdminService();
  const clusters = await service.findDuplicates(q || null, limit);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">
            Club consolidation tooling
          </p>
          <h1 className="text-3xl font-black tracking-tight text-gray-900">Duplicados de clubes</h1>
          <p className="text-sm text-gray-600">
            Detecta variantes de nombre por ubicacion para consolidar clubes sin perder historial.
          </p>
        </div>
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Buscar clusters</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Nombre del club, alias, ciudad..."
              className="md:col-span-3 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
            >
              Buscar
            </button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Clusters candidatos ({clusters.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {clusters.length === 0 ? (
            <p className="text-sm text-gray-600">No hay clusters candidatos con los filtros actuales.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-3 py-2">Ubicacion</th>
                    <th className="px-3 py-2">Candidatos</th>
                    <th className="px-3 py-2">Partidos</th>
                    <th className="px-3 py-2">Claimed</th>
                    <th className="px-3 py-2">Confianza</th>
                    <th className="px-3 py-2">Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {clusters.map((cluster) => {
                    const claimedCount = cluster.clubs.filter((c) => c.claimed).length;
                    const names = cluster.clubs.map((c) => c.name).join(" · ");
                    const href = `/admin/clubs/duplicates/${encodeURIComponent(cluster.cluster_key)}${
                      q ? `?q=${encodeURIComponent(q)}` : ""
                    }`;

                    return (
                      <tr key={cluster.cluster_key} className="border-b border-gray-100 align-top">
                        <td className="px-3 py-3 text-gray-800">{formatLocation(cluster)}</td>
                        <td className="px-3 py-3 text-gray-700">
                          <div className="font-semibold">{cluster.clubs_count} clubes</div>
                          <div className="text-xs text-gray-500">{names}</div>
                        </td>
                        <td className="px-3 py-3 font-semibold text-gray-900">{cluster.total_matches}</td>
                        <td className="px-3 py-3 text-gray-700">{claimedCount > 0 ? `${claimedCount} si` : "No"}</td>
                        <td className="px-3 py-3">
                          <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                            {cluster.confidence.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <Link
                            href={href}
                            className="inline-flex rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:border-gray-300"
                          >
                            Revisar
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
