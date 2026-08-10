import { requirePlayer } from "@/lib/auth";
import { MatchService } from "@/services/match.service";
import { PlayerRepository } from "@/repositories/player.repository";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CompleteRosterForm } from "@/components/matches/CompleteRosterForm";
import { hasMatchResult, isMatchIncomplete, getMissingPlayersCount } from "@/lib/match/matchUtils";

export const dynamic = "force-dynamic";

export default async function CompleteMatchRosterPage({
  params,
}: {
  params: { id: string };
}) {
  const { user, player } = await requirePlayer();
  const matchSvc = new MatchService();
  const playerRepo = new PlayerRepository();

  const match = await matchSvc.getMatchById(params.id);
  if (!match) notFound();

  // Un partido completo, cancelado o ya cerrado con resultado no se completa.
  if (!isMatchIncomplete(match) || hasMatchResult(match)) {
    redirect(`/player/matches/${params.id}`);
  }

  const isParticipant = match.match_players.some((mp: any) => mp.player_id === player.id);
  const isCreator = match.created_by === user.id;
  if (!isParticipant && !isCreator) {
    redirect(`/player/matches/${params.id}`);
  }

  const [players, currentPlayer] = await Promise.all([
    playerRepo.findAllActive(),
    playerRepo.findById(player.id),
  ]);

  const toMember = (mp: any) => ({
    playerId: mp.player_id,
    name:
      `${mp.players?.first_name ?? ""} ${mp.players?.last_name ?? ""}`.trim() || "Jugador",
    isMe: mp.player_id === player.id,
  });

  const teamA = match.match_players.filter((mp: any) => mp.team === "A").map(toMember);
  const teamB = match.match_players.filter((mp: any) => mp.team === "B").map(toMember);
  const rosterIds = new Set(match.match_players.map((mp: any) => mp.player_id));
  const missingPlayers = getMissingPlayersCount(match);

  return (
    <div className="py-6 space-y-6">
      <Link
        href={`/player/matches/${params.id}`}
        className="group text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center transition-colors"
      >
        <svg className="w-4 h-4 mr-1 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Volver al partido
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Completar jugadores</h1>
        <p className="text-gray-500 text-sm">
          {match.club_name} ·{" "}
          {format(new Date(match.match_at), "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es })}
        </p>
        <p className="mt-2 text-sm font-medium text-amber-700">
          {missingPlayers === 1
            ? "Falta 1 jugador."
            : `Faltan ${missingPlayers} jugadores.`}{" "}
          Una vez completo vas a poder cargar el resultado.
        </p>
      </div>

      <CompleteRosterForm
        matchId={match.id}
        teamA={teamA}
        teamB={teamB}
        missingPlayers={missingPlayers}
        availablePlayers={players.filter((p) => !rosterIds.has(p.id))}
        currentPlayerLocation={{
          city: currentPlayer?.city || undefined,
          city_id: currentPlayer?.city_id || undefined,
          region_code: currentPlayer?.region_code || undefined,
          region_name: currentPlayer?.region_name || undefined,
        }}
      />
    </div>
  );
}
