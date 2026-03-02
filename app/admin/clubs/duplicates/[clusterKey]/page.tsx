import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { ClubAdminService } from "@/services/club-admin.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClubConsolidationForm } from "@/components/admin/ClubConsolidationForm";

function locationText(cluster: {
  city: string | null;
  region_name: string | null;
  region_code: string | null;
  country_code: string;
}) {
  const region = cluster.region_name || cluster.region_code;
  const city = cluster.city || "Sin ciudad";
  return region ? `${city} (${region}, ${cluster.country_code})` : `${city} (${cluster.country_code})`;
}

export default async function AdminClubDuplicateClusterPage({
  params,
  searchParams,
}: {
  params: { clusterKey: string };
  searchParams: { q?: string };
}) {
  await requireAdmin();
  const clusterKey = decodeURIComponent(params.clusterKey);
  const q = searchParams.q?.trim() || null;

  const service = new ClubAdminService();
  const clusters = await service.findDuplicates(q, 300);
  const cluster = clusters.find((item) => item.cluster_key === clusterKey);

  if (!cluster) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">Cluster de duplicados</p>
          <h1 className="text-3xl font-black tracking-tight text-gray-900">Consolidar clubes</h1>
          <p className="text-sm text-gray-600">
            Ubicacion: <span className="font-semibold">{locationText(cluster)}</span>
          </p>
        </div>
        <Link
          href={`/admin/clubs/duplicates${q ? `?q=${encodeURIComponent(q)}` : ""}`}
          className="inline-flex rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
        >
          Volver a duplicados
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border-gray-200 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Candidatos del cluster</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {cluster.clubs.map((club) => (
                <div
                  key={club.id}
                  className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{club.name}</p>
                    <p className="text-xs text-gray-500">
                      {club.normalized_name} · status: {club.claim_status}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-gray-900">{club.matches_count}</p>
                    <p className="text-xs text-gray-500">partidos</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Impacto estimado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-xl border border-gray-100 bg-white px-3 py-2">
              <p className="text-xs font-semibold text-gray-500">Confianza</p>
              <p className="text-lg font-black text-gray-900">{cluster.confidence.toFixed(1)}%</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white px-3 py-2">
              <p className="text-xs font-semibold text-gray-500">Clubes en cluster</p>
              <p className="text-lg font-black text-gray-900">{cluster.clubs_count}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white px-3 py-2">
              <p className="text-xs font-semibold text-gray-500">Partidos potencialmente afectados</p>
              <p className="text-lg font-black text-gray-900">{cluster.total_matches}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white px-3 py-2">
              <p className="text-xs font-semibold text-gray-500">Aliases esperados</p>
              <p className="text-lg font-black text-gray-900">{cluster.clubs_count - 1} + existentes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Ejecutar consolidacion</CardTitle>
        </CardHeader>
        <CardContent>
          <ClubConsolidationForm clusterKey={cluster.cluster_key} candidates={cluster.clubs} />
        </CardContent>
      </Card>
    </div>
  );
}
