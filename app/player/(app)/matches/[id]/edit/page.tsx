import { requirePlayer } from "@/lib/auth";
import { MatchService } from "@/services/match.service";
import { notFound, redirect } from "next/navigation";
import { EditMatchForm } from "@/components/matches/EditMatchForm";
import { PlayerRepository } from "@/repositories/player.repository";

export default async function EditMatchPage({
  params,
}: {
  params: { id: string };
}) {
  const { user, player } = await requirePlayer();
  const matchSvc = new MatchService();
  const playerRepo = new PlayerRepository();
  const match = await matchSvc.getMatchById(params.id);

  if (!match) {
    notFound();
  }

  if (match.created_by !== user.id || match.status !== "scheduled") {
    redirect(`/player/matches/${params.id}`);
  }

  const [players, currentPlayer] = await Promise.all([
    playerRepo.findAllActive(),
    playerRepo.findById(player.id),
  ]);

  const teamA = match.match_players.filter((mp: any) => mp.team === "A");
  const teamB = match.match_players.filter((mp: any) => mp.team === "B");
  const partner = teamA.find((mp: any) => mp.player_id !== player.id);
  const opp1 = teamB[0];
  const opp2 = teamB[1];

  if (!partner || !opp1 || !opp2) {
    redirect(`/player/matches/${params.id}`);
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Editar Partido</h1>
        <p className="text-gray-500 text-sm">Actualiza los detalles del encuentro</p>
      </div>

      <EditMatchForm
        match={{
          id: match.id,
          match_at: match.match_at,
          club_name: match.club_name,
          club_id: match.club_id,
          notes: match.notes,
        }}
        currentPlayerId={player.id}
        currentPlayerLocation={{
          city: currentPlayer?.city || undefined,
          city_id: currentPlayer?.city_id || undefined,
          region_code: currentPlayer?.region_code || undefined,
          region_name: currentPlayer?.region_name || undefined,
        }}
        availablePlayers={players}
        initialRoster={{
          partnerId: partner.player_id,
          opponent1Id: opp1.player_id,
          opponent2Id: opp2.player_id,
        }}
      />
    </div>
  );
}
