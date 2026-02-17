import { requirePlayer } from "@/lib/auth";
import { MatchService } from "@/services/match.service";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ResultEntryForm } from "@/components/matches/ResultEntryForm";

export default async function MatchResultEntryPage({
    params,
}: {
    params: { id: string };
}) {
    const { player: mePlayer } = await requirePlayer();
    const playerId = mePlayer.id;
    const matchSvc = new MatchService();

    const match = await matchSvc.getMatchById(params.id);

    if (!match) notFound();

    // Verification: match must be in the past or completed, and without results
    const isPast = new Date(match.match_at) < new Date();
    const isCompleted = match.status === "completed" || isPast;

    // We fetch match_results in repository findById (it's part of MatchWithPlayers)
    // Actually repository.findById uses match_results (*) join.
    const hasResults = !!match.match_results;

    if (!isCompleted) {
        // Cannot load results for future matches
        redirect(`/player/matches/${params.id}`);
    }

    if (hasResults) {
        // Results already exist
        redirect(`/player/matches/${params.id}`);
    }

    // Check participation
    const playersByTeam = {
        A: match.match_players.filter((p: any) => p.team === "A"),
        B: match.match_players.filter((p: any) => p.team === "B"),
    };

    const isParticipant = match.match_players.some((p: any) => p.player_id === playerId);
    if (!isParticipant) {
        redirect(`/player/matches/${params.id}`);
    }

    const teamANames = playersByTeam.A.map((p: any) => `${p.players?.first_name} ${p.players?.last_name}`);
    const teamBNames = playersByTeam.B.map((p: any) => `${p.players?.first_name} ${p.players?.last_name}`);

    return (
        <div className="p-6 max-w-2xl mx-auto space-y-8">
            <header className="flex items-center justify-between">
                <Link
                    href={`/player/matches/${params.id}`}
                    className="group text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center transition-colors"
                >
                    <svg className="w-4 h-4 mr-1 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Volver al partido
                </Link>
                <div className="text-right">
                    <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">Marcador</h2>
                    <p className="text-sm font-bold text-gray-900">{match.club_name}</p>
                </div>
            </header>

            <main>
                <ResultEntryForm
                    matchId={match.id}
                    teamANames={teamANames}
                    teamBNames={teamBNames}
                />
            </main>
        </div>
    );
}
