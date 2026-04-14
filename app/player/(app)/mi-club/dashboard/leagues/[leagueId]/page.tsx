import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClubOwner } from "@/lib/auth";
import { LeaguesService } from "@/services/leagues.service";

// Stub — administración completa disponible en versión desktop
// TODO PASO 6: port completo desde /club/dashboard/leagues/[leagueId]

export default async function MiClubLeagueDetailPage({
  params,
}: {
  params: { leagueId: string };
}) {
  const { club } = await requireClubOwner();
  const service = new LeaguesService();
  const league = await service.getLeagueById(params.leagueId).catch(() => null);

  if (!league || league.club_id !== club.id) notFound();

  function statusLabel(status: "draft" | "active" | "finished") {
    if (status === "draft") return "Borrador";
    if (status === "active") return "Activa";
    return "Finalizada";
  }

  return (
    <div className="w-full space-y-6">
      <div>
        <Link
          href="/player/mi-club/dashboard/leagues"
          className="text-sm text-gray-400 hover:text-gray-700"
        >
          ← Ligas del Club
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">{league.name}</h1>
        <p className="text-sm text-gray-500">
          {league.season_label || "Sin temporada"} · {statusLabel(league.status as any)}
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center space-y-4">
        <p className="text-sm text-gray-600">
          La administración completa de ligas (grupos, fixture, resultados, playoffs) está disponible en el panel de club.
        </p>
        <Link
          href={`/club/dashboard/leagues/${params.leagueId}`}
          className="inline-block rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
        >
          Abrir administración completa
        </Link>
      </div>
    </div>
  );
}
