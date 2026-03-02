import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { ClubService } from "@/services/club.service";
import { ClubAdminService } from "@/services/club-admin.service";
import { AdminService } from "@/services/admin.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminClubClaimActions } from "@/components/clubs/AdminClubClaimActions";

type TabKey = "pending" | "approved" | "rejected" | "unclaimed" | "player-created" | "duplicates";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "pending", label: "Solicitudes Pendientes" },
  { key: "approved", label: "Clubes Aprobados" },
  { key: "rejected", label: "Solicitudes Rechazadas" },
  { key: "unclaimed", label: "Clubes Sin Reclamo" },
  { key: "player-created", label: "Clubes Creados por Jugadores" },
  { key: "duplicates", label: "Clubes Duplicados" },
];

function tabFromSearch(value?: string): TabKey {
  const found = tabs.find((t) => t.key === value);
  return found ? found.key : "pending";
}

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

export default async function AdminClubClaimsPage({
  searchParams,
}: {
  searchParams: { tab?: string; q?: string };
}) {
  await requireAdmin();

  const activeTab = tabFromSearch(searchParams.tab);
  const duplicateQuery = searchParams.q?.trim() || "";

  const clubService = new ClubService();
  const clubAdminService = new ClubAdminService();
  const adminService = new AdminService();

  const [
    pendingClaims,
    approvedClaims,
    rejectedClaims,
    unclaimedClubs,
    playerCreatedLeads,
    duplicateClusters,
    overviewStats,
  ] = await Promise.all([
    clubService.listClaimRequestsByStatus("pending", 200),
    clubService.listClaimedClubs(200),
    clubService.listClaimRequestsByStatus("rejected", 200),
    clubService.listUnclaimedClubs(200),
    clubService.listClubLeads("pending", 200),
    clubAdminService.findDuplicates(duplicateQuery || null, 50),
    adminService.getOverviewStats(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Clubes</h1>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Claims pendientes</p>
          <p className="mt-1 text-2xl font-black text-gray-900">{pendingClaims.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Propuestas de jugadores</p>
          <p className="mt-1 text-2xl font-black text-gray-900">{playerCreatedLeads.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Clusters duplicados</p>
          <p className="mt-1 text-2xl font-black text-gray-900">{duplicateClusters.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Jugadores activos (30d)</p>
          <p className="mt-1 text-2xl font-black text-gray-900">{overviewStats.users.active_players_30d}</p>
          <Link href="/admin/users" className="mt-2 inline-flex text-xs font-bold text-blue-700 hover:underline">
            Ir a Jugadores
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/admin/club-claims?tab=${tab.key}${
              tab.key === "duplicates" && duplicateQuery ? `&q=${encodeURIComponent(duplicateQuery)}` : ""
            }`}
            className={`px-3 py-2 rounded-xl text-sm font-bold border ${
              activeTab === tab.key
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {activeTab === "pending" && (
        <Card>
          <CardHeader>
            <CardTitle>Solicitudes Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingClaims.length === 0 ? (
              <p className="text-gray-500">No hay reclamos pendientes.</p>
            ) : (
              <div className="space-y-4">
                {pendingClaims.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-black text-gray-900">{request.clubs?.name || "Club"}</p>
                      <p className="text-xs text-gray-500">
                        {request.clubs?.city || "Sin ciudad"}
                        {request.clubs?.region_name
                          ? ` (${request.clubs.region_name})`
                          : request.clubs?.region_code
                          ? ` (${request.clubs.region_code})`
                          : ""}
                      </p>
                      <p className="text-sm text-gray-800">
                        Solicitante:{" "}
                        <span className="font-semibold">
                          {request.requester_first_name} {request.requester_last_name}
                        </span>
                      </p>
                      <p className="text-sm text-gray-700">Celular: {request.requester_phone}</p>
                      <p className="text-sm text-gray-700">Email: {request.requester_email}</p>
                      {request.message && <p className="text-sm text-gray-600 italic">&quot;{request.message}&quot;</p>}
                      <p className="text-xs text-gray-400">
                        Solicitado: {new Date(request.created_at).toLocaleString("es-AR")}
                      </p>
                      {request.clubs?.id ? (
                        <Link
                          href={`/admin/clubs/${request.clubs.id}/preview`}
                          className="inline-flex text-xs font-bold text-blue-700 hover:underline mt-1"
                        >
                          Ver preview del club
                        </Link>
                      ) : null}
                    </div>
                    <AdminClubClaimActions requestId={request.id} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "approved" && (
        <Card>
          <CardHeader>
            <CardTitle>Clubes Aprobados</CardTitle>
          </CardHeader>
          <CardContent>
            {approvedClaims.length === 0 ? (
              <p className="text-gray-500">No hay clubes aprobados.</p>
            ) : (
              <div className="space-y-3">
                {approvedClaims.map((club) => (
                  <div key={club.id} className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm font-black text-gray-900">{club.name}</p>
                    <p className="text-xs text-gray-500">
                      {club.city || "Sin ciudad"}
                      {club.region_name ? ` (${club.region_name})` : club.region_code ? ` (${club.region_code})` : ""}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Aprobado: {club.claimed_at ? new Date(club.claimed_at).toLocaleString("es-AR") : "N/D"}
                    </p>
                    <Link
                      href={`/admin/clubs/${club.id}/preview`}
                      className="inline-flex text-xs font-bold text-blue-700 hover:underline mt-2"
                    >
                      Ver preview del club
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "rejected" && (
        <Card>
          <CardHeader>
            <CardTitle>Solicitudes Rechazadas</CardTitle>
          </CardHeader>
          <CardContent>
            {rejectedClaims.length === 0 ? (
              <p className="text-gray-500">No hay reclamos rechazados.</p>
            ) : (
              <div className="space-y-3">
                {rejectedClaims.map((request) => (
                  <div key={request.id} className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm font-black text-gray-900">{request.clubs?.name || "Club"}</p>
                    <p className="text-sm text-gray-700">
                      Solicitante:{" "}
                      <span className="font-semibold">
                        {request.requester_first_name} {request.requester_last_name}
                      </span>
                    </p>
                    <p className="text-xs text-gray-400">
                      Resuelto: {request.resolved_at ? new Date(request.resolved_at).toLocaleString("es-AR") : "N/D"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "unclaimed" && (
        <Card>
          <CardHeader>
            <CardTitle>Clubes Sin Reclamo</CardTitle>
          </CardHeader>
          <CardContent>
            {unclaimedClubs.length === 0 ? (
              <p className="text-gray-500">No hay clubes sin reclamar.</p>
            ) : (
              <div className="space-y-3">
                {unclaimedClubs.map((club) => (
                  <div key={club.id} className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm font-black text-gray-900">{club.name}</p>
                    <p className="text-xs text-gray-500">
                      {club.city || "Sin ciudad"}
                      {club.region_name ? ` (${club.region_name})` : club.region_code ? ` (${club.region_code})` : ""}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Creado: {new Date(club.created_at).toLocaleString("es-AR")}
                    </p>
                    <Link
                      href={`/admin/clubs/${club.id}/preview`}
                      className="inline-flex text-xs font-bold text-blue-700 hover:underline mt-2"
                    >
                      Ver preview del club
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "player-created" && (
        <Card>
          <CardHeader>
            <CardTitle>Clubes Creados por Jugadores (Propuestas)</CardTitle>
          </CardHeader>
          <CardContent>
            {playerCreatedLeads.length === 0 ? (
              <p className="text-gray-500">No hay propuestas pendientes de jugadores.</p>
            ) : (
              <div className="space-y-3">
                {playerCreatedLeads.map((lead) => (
                  <div key={lead.id} className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm font-black text-gray-900">{lead.suggested_name}</p>
                    <p className="text-xs text-gray-500">
                      {lead.city || "Sin ciudad"}
                      {lead.region_name ? ` (${lead.region_name})` : lead.region_code ? ` (${lead.region_code})` : ""}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Propuesto: {new Date(lead.created_at).toLocaleString("es-AR")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "duplicates" && (
        <Card>
          <CardHeader>
            <CardTitle>Clubes Duplicados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form method="get" className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <input type="hidden" name="tab" value="duplicates" />
              <input
                type="text"
                name="q"
                defaultValue={duplicateQuery}
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

            {duplicateClusters.length === 0 ? (
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
                    {duplicateClusters.map((cluster) => {
                      const claimedCount = cluster.clubs.filter((c) => c.claimed).length;
                      const names = cluster.clubs.map((c) => c.name).join(" - ");
                      const href = `/admin/clubs/duplicates/${encodeURIComponent(cluster.cluster_key)}${
                        duplicateQuery ? `?q=${encodeURIComponent(duplicateQuery)}` : ""
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
      )}
    </div>
  );
}
