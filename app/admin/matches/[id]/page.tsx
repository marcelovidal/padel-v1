import { notFound } from "next/navigation";
import { MatchService } from "@/services/match.service";
import { PlayerRepository } from "@/repositories/player.repository";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddPlayerForm } from "./add-player-form";
import { RemovePlayerButton } from "./remove-player-button";

export default async function MatchDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const matchService = new MatchService();
  const match = await matchService.getMatchById(params.id);

  if (!match) {
    notFound();
  }

  const playerRepository = new PlayerRepository();
  const availablePlayers = await playerRepository.findAll();

  // Separar jugadores por equipo
  const teamA = match.match_players.filter((mp) => mp.team === "A");
  const teamB = match.match_players.filter((mp) => mp.team === "B");

  // Obtener IDs de jugadores ya asignados
  const assignedPlayerIds = match.match_players.map((mp) => mp.player_id);
  const unassignedPlayers = availablePlayers.filter(
    (p) => !assignedPlayerIds.includes(p.id)
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      scheduled: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-gray-100 text-gray-800",
    };
    const labels = {
      scheduled: "Programado",
      completed: "Completado",
      cancelled: "Cancelado",
    };
    return {
      className: styles[status as keyof typeof styles] || styles.scheduled,
      label: labels[status as keyof typeof labels] || status,
    };
  };

  const statusBadge = getStatusBadge(match.status);
  const totalPlayers = match.match_players.length;
  const isFull = totalPlayers >= match.max_players;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Detalle del Partido</h1>
        <div className="flex space-x-2">
          {match.status === "scheduled" && (
            <Link href={`/admin/matches/${match.id}/result`}>
              <Button>Cargar Resultado</Button>
            </Link>
          )}
          {match.status === "completed" && (
            <Link href={`/admin/matches/${match.id}/result`}>
              <Button variant="outline">Editar Resultado</Button>
            </Link>
          )}
          <Link href="/admin/matches">
            <Button variant="outline">Volver</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Información del Partido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Fecha y Hora</p>
              <p className="text-lg">{formatDate(match.match_at)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Club</p>
              <p className="text-lg">{match.club_name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Estado</p>
              <span
                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusBadge.className}`}
              >
                {statusBadge.label}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">
                Jugadores Confirmados
              </p>
              <p className="text-lg">
                {totalPlayers} / {match.max_players}
                {isFull && (
                  <span className="ml-2 text-sm text-green-600">(Completo)</span>
                )}
              </p>
            </div>
            {match.notes && (
              <div>
                <p className="text-sm font-medium text-gray-500">Notas</p>
                <p className="text-sm text-gray-700">{match.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gestión de Jugadores</CardTitle>
            <CardDescription>
              Agrega jugadores al partido asignándolos a un equipo
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isFull ? (
              <p className="text-sm text-gray-500">
                El partido ya tiene el máximo de jugadores permitidos.
              </p>
            ) : unassignedPlayers.length === 0 ? (
              <p className="text-sm text-gray-500">
                No hay jugadores disponibles para agregar.
              </p>
            ) : (
              <AddPlayerForm
                matchId={match.id}
                availablePlayers={unassignedPlayers}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Equipo A</CardTitle>
          </CardHeader>
          <CardContent>
            {teamA.length === 0 ? (
              <p className="text-sm text-gray-500">No hay jugadores asignados</p>
            ) : (
              <ul className="space-y-2">
                {teamA.map((mp) => (
                  <li
                    key={mp.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <span>
                      {mp.players?.first_name} {mp.players?.last_name}
                    </span>
                    <RemovePlayerButton
                      matchId={match.id}
                      playerId={mp.player_id}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Equipo B</CardTitle>
          </CardHeader>
          <CardContent>
            {teamB.length === 0 ? (
              <p className="text-sm text-gray-500">No hay jugadores asignados</p>
            ) : (
              <ul className="space-y-2">
                {teamB.map((mp) => (
                  <li
                    key={mp.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <span>
                      {mp.players?.first_name} {mp.players?.last_name}
                    </span>
                    <RemovePlayerButton
                      matchId={match.id}
                      playerId={mp.player_id}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


