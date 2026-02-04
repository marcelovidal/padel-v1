import { requirePlayer } from "@/lib/auth";
import { PlayerAuthService } from "@/services/playerAuth.service";
import { MatchService } from "@/services/match.service";
import { AssessmentService } from "@/services/assessment.service";
import { PlayerStatsCards } from "@/components/player/PlayerStatsCards";
import { PlayerAttributesChart } from "@/components/player/PlayerAttributesChart";
import { PlayerMatches } from "@/components/player/PlayerMatches";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PlayerDashboard() {
  const { user, playerId } = await requirePlayer();

  const playerAuthSvc = new PlayerAuthService();
  const matchSvc = new MatchService();
  const assessmentSvc = new AssessmentService();

  // Fetch all data in parallel to avoid waterfalls
  const [player, stats, averages, recentMatches] = await Promise.all([
    playerAuthSvc.getPlayerByUserId(user.id),
    matchSvc.getPlayerStats(playerId),
    assessmentSvc.getPlayerAverages(playerId),
    matchSvc.getPlayerMatches(playerId, { limit: 5 }),
  ]);

  return (
    <div className="container mx-auto p-4 max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hola, {player?.first_name || 'Jugador'}</h1>
          <p className="text-gray-500">Bienvenido a tu panel de control</p>
        </div>
        <div className="bg-gray-100 px-3 py-1 rounded-full text-xs font-mono text-gray-600">
          ID: {playerId.split('-')[0]}...
        </div>
      </div>

      {/* Stats Overview */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Resumen General</h2>
        <PlayerStatsCards stats={stats} />
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Attributes Chart */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Mis Atributos</h2>
            <Link href="/player/profile" className="text-sm text-blue-600 hover:underline">
              Ver detalle
            </Link>
          </div>
          <PlayerAttributesChart data={averages} />
        </section>

        {/* Recent Matches */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Últimos Partidos</h2>
            <Link href="/player/matches" className="flex items-center text-sm text-blue-600 hover:underline">
              Ver todos
              <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
          </div>

          <PlayerMatches matches={recentMatches} />

          {recentMatches.length > 0 && (
            <div className="mt-4 text-center md:hidden">
              <Link href="/player/matches" className="text-sm font-medium text-blue-600">
                Ver historial completo
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
