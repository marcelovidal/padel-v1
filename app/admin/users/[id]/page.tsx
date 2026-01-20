import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { PlayerService } from "@/services/player.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import MatchCard from "@/components/matches/MatchCard";

export default async function PlayerProfilePage({ params }: { params: { id: string } }) {
  await requireAdmin();

  const playerService = new PlayerService();
  const player = await playerService.getPlayerById(params.id);
  if (!player) return notFound();

  const summary = await playerService.getPlayerMatchSummary(params.id);
  const averages = await playerService.getPlayerShotAverages(params.id);
  const matches = await playerService.getPlayerMatches(params.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Perfil: {player.first_name} {player.last_name}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
            <CardDescription>Resultados del jugador</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>Ganados: <strong>{summary.wins}</strong></div>
              <div>Perdidos: <strong>{summary.losses}</strong></div>
              <div>Partidos con resultado: <strong>{summary.totalWithResult}</strong></div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Promedios por golpe</CardTitle>
            <CardDescription>Promedio (1.0) sobre autoevaluaciones</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['Volea','volea'],['Globo','globo'],['Remate','remate'],['Bandeja','bandeja'],
                ['Vibora','vibora'],['Bajada pared','bajada_pared'],['Saque','saque'],['Recepción saque','recepcion_saque']
              ].map(([label, key]) => (
                <div key={String(key)} className="flex justify-between border-b py-2">
                  <div className="text-sm text-gray-700">{label}</div>
                  <div className="text-sm font-medium text-gray-900">{(averages as any)[key] !== null ? (averages as any)[key] : '—'}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Partidos</CardTitle>
          <CardDescription>Listado de partidos del jugador</CardDescription>
        </CardHeader>
        <CardContent>
          {matches.length === 0 ? (
            <p className="text-sm text-gray-500">No hay partidos para este jugador</p>
          ) : (
            <div>
              {matches.map((m) => (
                <MatchCard
                  key={m.id}
                  matchId={m.id}
                  clubName={m.club_name}
                  matchAt={m.match_at}
                  status={m.status}
                  team={(m as any).team}
                  winnerLabel={(m as any).winnerLabel ?? '-'}
                  setsFormatted={(m as any).setsFormatted ?? '-'}
                  hasAssessment={m.hasAssessment}
                  primaryAction={{ label: (m as any).setsFormatted === '-' ? 'Cargar resultado' : 'Ver detalle', href: `/admin/matches/${m.id}` }}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
