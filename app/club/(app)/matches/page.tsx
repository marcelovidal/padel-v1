import { requireClub } from "@/lib/auth";
import { ClubService } from "@/services/club.service";
import { ClubMatches } from "@/components/club/ClubMatches";
import { getEffectiveStatus } from "@/lib/match/matchUtils";

export default async function ClubMatchesPage() {
  const { club } = await requireClub();
  const clubService = new ClubService();
  const matches = await clubService.listMyClubMatches(200);
  const categorized = matches.reduce(
    (acc, match) => {
      const status = getEffectiveStatus(match as any);
      acc[status].push(match);
      return acc;
    },
    { scheduled: [] as any[], completed: [] as any[], cancelled: [] as any[] }
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="container mx-auto p-4 max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Mis Partidos</h1>
          <a
            href="/club/matches/new"
            className="bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            + Nuevo Partido
          </a>
        </div>
        <div className="text-sm text-gray-500 mb-6">Hola, {club.contact_first_name || club.name}</div>
      </div>

      {matches.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500">Todavia no hay partidos registrados en tu club.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {categorized.scheduled.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 px-4">Proximos Partidos</h2>
              <ClubMatches
                matches={categorized.scheduled.sort((a, b) => new Date(a.match_at).getTime() - new Date(b.match_at).getTime())}
              />
            </div>
          )}

          {categorized.completed.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 px-4">Finalizados</h2>
              <ClubMatches
                matches={categorized.completed.sort((a, b) => new Date(b.match_at).getTime() - new Date(a.match_at).getTime())}
              />
            </div>
          )}

          {categorized.cancelled.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 px-4">Cancelados</h2>
              <div className="opacity-75">
                <ClubMatches
                  matches={categorized.cancelled.sort((a, b) => new Date(b.match_at).getTime() - new Date(a.match_at).getTime())}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
