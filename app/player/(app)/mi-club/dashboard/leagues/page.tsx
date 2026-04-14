import Link from "next/link";
import { requireClubOwner } from "@/lib/auth";
import { LeaguesService } from "@/services/leagues.service";
import { LeagueRulesGuide } from "@/components/leagues/LeagueRulesGuide";

function leagueStatusLabel(status: "draft" | "active" | "finished") {
  if (status === "draft") return "Borrador";
  if (status === "active") return "Activa";
  return "Finalizada";
}

export default async function MiClubLeaguesPage() {
  const { club } = await requireClubOwner();
  const service = new LeaguesService();
  const leagues = await service.listClubLeagues(club.id);

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Ligas del Club</h1>
          <p className="text-sm text-gray-500">
            Crea ligas por temporada, define divisiones y organiza grupos, fixture y agenda.
          </p>
        </div>
        <Link
          href="/player/mi-club/dashboard/leagues/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + Nueva liga
        </Link>
      </div>

      <LeagueRulesGuide />

      <section className="rounded-2xl border bg-white p-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-gray-600">Ligas registradas</h2>
        {leagues.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">Todavia no creaste ligas para este club.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {leagues.map((league) => (
              <div key={league.id} className="rounded-xl border border-gray-100 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-gray-900">{league.name}</p>
                    <p className="text-sm text-gray-500">
                      {league.season_label || "Sin temporada"} · Estado: {leagueStatusLabel(league.status)}
                    </p>
                  </div>
                  <Link
                    href={`/player/mi-club/dashboard/leagues/${league.id}`}
                    className="rounded-lg border border-blue-200 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                  >
                    Administrar
                  </Link>
                </div>
                {league.description ? (
                  <p className="mt-2 text-sm text-gray-700">{league.description}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
