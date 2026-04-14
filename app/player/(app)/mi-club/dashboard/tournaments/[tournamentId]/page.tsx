import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClubOwner } from "@/lib/auth";
import { TournamentsService } from "@/services/tournaments.service";

// Stub — administración completa disponible en versión desktop
// TODO PASO 6: port completo desde /club/dashboard/tournaments/[tournamentId]

export default async function MiClubTournamentDetailPage({
  params,
}: {
  params: { tournamentId: string };
}) {
  const { club } = await requireClubOwner();
  const service = new TournamentsService();
  const tournament = await service.getTournamentById(params.tournamentId).catch(() => null);

  if (!tournament || tournament.club_id !== club.id) notFound();

  function statusLabel(status: "draft" | "active" | "finished") {
    if (status === "draft") return "Borrador";
    if (status === "active") return "Activo";
    return "Finalizado";
  }

  return (
    <div className="w-full space-y-6">
      <div>
        <Link
          href="/player/mi-club/dashboard/tournaments"
          className="text-sm text-gray-400 hover:text-gray-700"
        >
          ← Torneos del Club
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">{tournament.name}</h1>
        <p className="text-sm text-gray-500">
          {tournament.season_label || "Sin temporada"} · Categoria {tournament.target_category_int} · {statusLabel(tournament.status as any)}
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center space-y-4">
        <p className="text-sm text-gray-600">
          La administración completa de torneos (grupos, fixture, resultados, playoffs) está disponible en el panel de club.
        </p>
        <Link
          href={`/club/dashboard/tournaments/${params.tournamentId}`}
          className="inline-block rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
        >
          Abrir administración completa
        </Link>
      </div>
    </div>
  );
}
