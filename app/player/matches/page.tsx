import { requirePlayer } from "@/lib/auth";
import { PlayerAuthService } from "@/services/playerAuth.service";

export default async function PlayerMatchesPage() {
  const { user, playerId } = await requirePlayer();
  const svc = new PlayerAuthService();
  // For now reuse existing PlayerService if needed; here we just show placeholder
  const player = await svc.getPlayerByUserId(user.id);

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Partidos de {player?.first_name}</h1>
      <p className="text-sm text-gray-500">Listado de partidos (implementación futura)</p>
    </div>
  );
}
