import { requirePlayer } from "@/lib/auth";
import { PlayerAuthService } from "@/services/playerAuth.service";

export default async function PlayerHome() {
  const { user, playerId } = await requirePlayer();
  const playerService = new PlayerAuthService();
  const player = await playerService.getPlayerByUserId(user.id);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Bienvenido, {player?.first_name ?? 'Jugador'}</h1>
      <p className="mt-2">ID jugador: {playerId}</p>
      <div className="mt-4">
        <div className="flex gap-4">
          <a href="/player/matches" className="text-blue-600 hover:underline">Mis partidos</a>
          <a href="/player/profile" className="text-green-600 hover:underline font-semibold">Mi Perfil (Estadísticas)</a>
        </div>
      </div>
    </div>
  );
}
