import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { ClubService } from "@/services/club.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminClubClaimActions } from "@/components/clubs/AdminClubClaimActions";

type TabKey = "pending" | "approved" | "rejected" | "unclaimed" | "player-created";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "pending", label: "Solicitudes Pendientes" },
  { key: "approved", label: "Clubes Aprobados" },
  { key: "rejected", label: "Solicitudes Rechazadas" },
  { key: "unclaimed", label: "Clubes Sin Reclamo" },
  { key: "player-created", label: "Clubes Creados por Jugadores" },
];

function tabFromSearch(value?: string): TabKey {
  const found = tabs.find((t) => t.key === value);
  return found ? found.key : "pending";
}

export default async function AdminClubClaimsPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  await requireAdmin();

  const activeTab = tabFromSearch(searchParams.tab);
  const clubService = new ClubService();

  const [pendingClaims, approvedClaims, rejectedClaims, unclaimedClubs, playerCreatedLeads] = await Promise.all([
    clubService.listClaimRequestsByStatus("pending", 200),
    clubService.listClaimedClubs(200),
    clubService.listClaimRequestsByStatus("rejected", 200),
    clubService.listUnclaimedClubs(200),
    clubService.listClubLeads("pending", 200),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Clubes</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/admin/club-claims?tab=${tab.key}`}
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
                  <div key={request.id} className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
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
                        Solicitante: <span className="font-semibold">{request.requester_first_name} {request.requester_last_name}</span>
                      </p>
                      <p className="text-sm text-gray-700">Celular: {request.requester_phone}</p>
                      <p className="text-sm text-gray-700">Email: {request.requester_email}</p>
                      {request.message && <p className="text-sm text-gray-600 italic">&quot;{request.message}&quot;</p>}
                      <p className="text-xs text-gray-400">
                        Solicitado: {new Date(request.created_at).toLocaleString("es-AR")}
                      </p>
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
                      Solicitante: <span className="font-semibold">{request.requester_first_name} {request.requester_last_name}</span>
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
    </div>
  );
}
