import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { PlayerService } from "@/services/player.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

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
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Club</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Equipo</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ganador</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resultado</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Autoevaluación</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {matches.map((m) => (
                    <tr key={m.id}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short'}).format(new Date(m.match_at))}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{m.club_name}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{m.status}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{m.team}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{(m as any).winnerLabel ?? '-'}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{(m as any).setsFormatted ?? '-'}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{m.hasAssessment ? 'Sí' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
