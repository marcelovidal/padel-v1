import { requirePlayer } from "@/lib/auth";
import { MatchService } from "@/services/match.service";
import { AssessmentService } from "@/services/assessment.service";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { CancelMatchButton } from "@/components/matches/CancelMatchButton";
import { MatchScore } from "@/components/matches/MatchScore";
import { PlayerAssessmentView } from "@/components/assessments/PlayerAssessmentView";
import { AssessmentToggleForm } from "@/components/assessments/AssessmentToggleForm";

export default async function MatchDetailPage({
    params,
}: {
    params: { id: string };
}) {
    const { playerId, user } = await requirePlayer();
    const matchSvc = new MatchService();
    const assessmentSvc = new AssessmentService();

    const [match, selfAssessment] = await Promise.all([
        matchSvc.getMatchById(params.id),
        assessmentSvc.getPlayerAssessmentInMatch(params.id, playerId)
    ]);


    if (!match) {
        notFound();
    }

    const isCreator = match.created_by === user.id;
    const isScheduled = match.status === "scheduled";
    const isCompleted = match.status === "completed" || !!match.match_results;
    const isCancelled = match.status === "cancelled";

    // Group players by team for the MatchScore component
    const teamA = match.match_players.filter((p) => p.team === "A");
    const teamB = match.match_players.filter((p) => p.team === "B");

    const statusColors = {
        scheduled: "bg-blue-100 text-blue-800 border-blue-200",
        completed: "bg-green-100 text-green-800 border-green-200",
        cancelled: "bg-red-100 text-red-800 border-red-200",
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-8">
            <header className="flex justify-between items-center">
                <Link
                    href="/player/matches"
                    className="group text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center transition-colors"
                >
                    <svg className="w-4 h-4 mr-1 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Mis partidos
                </Link>

                {isCreator && isScheduled && (
                    <div className="flex gap-2">
                        <Link
                            href={`/player/matches/${match.id}/edit`}
                            className="px-4 py-2 text-sm font-bold text-blue-600 bg-white border border-blue-200 rounded-xl hover:bg-blue-50 transition-all active:scale-[0.98]"
                        >
                            Editar
                        </Link>
                        <CancelMatchButton matchId={match.id} />
                    </div>
                )}
            </header>

            <div className="bg-white rounded-3xl shadow-xl shadow-blue-900/5 border border-gray-100 overflow-hidden">
                {/* Banner Header */}
                <div className="p-8 bg-gradient-to-br from-gray-50 to-white border-b border-gray-100">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                        <div className="space-y-2">
                            <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusColors[match.status]}`}>
                                {match.status === 'scheduled' ? 'Próximo Partido' :
                                    match.status === 'completed' ? 'Partido Finalizado' : 'Cancelado'}
                            </span>
                            <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                                {match.club_name}
                            </h1>
                            <div className="flex flex-wrap gap-6 text-gray-500 font-medium">
                                <div className="flex items-center">
                                    <svg className="w-5 h-5 mr-2 text-blue-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    {format(new Date(match.match_at), "PPPP", { locale: es })}
                                </div>
                                <div className="flex items-center">
                                    <svg className="w-5 h-5 mr-2 text-blue-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {format(new Date(match.match_at), "p", { locale: es })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {match.notes && (
                        <div className="mt-8 p-4 bg-amber-50 rounded-2xl border border-amber-100 text-amber-900 text-sm flex items-start">
                            <svg className="w-5 h-5 mr-3 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="leading-relaxed">
                                <span className="font-bold">Notas del partido:</span> {match.notes}
                            </p>
                        </div>
                    )}
                </div>

                {/* Score & Roster Section */}
                <div className="p-8">
                    <MatchScore
                        variant={isCompleted ? "result" : "scheduled"}
                        results={match.match_results ? {
                            sets: match.match_results.sets as any[] || [],
                            winnerTeam: match.match_results.winner_team
                        } : null}
                        playersByTeam={{
                            A: teamA.map(tp => tp.players),
                            B: teamB.map(tp => tp.players)
                        }}
                        showPlayers={true}
                    />

                    {isCompleted && !match.match_results && match.match_players.some(p => p.player_id === playerId) && (
                        <div className="mt-8 flex flex-col items-center justify-center p-8 bg-red-50/50 rounded-3xl border border-red-100 border-dashed animate-in fade-in zoom-in duration-500">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-black text-gray-900 mb-2">Marcador pendiente</h3>
                            <p className="text-gray-500 text-sm font-medium mb-6 text-center max-w-xs">El partido ha finalizado pero aún no se ha registrado el resultado final.</p>
                            <Link
                                href={`/player/matches/${match.id}/result`}
                                className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-lg shadow-red-200 transition-all active:scale-[0.98]"
                            >
                                Cargar Resultado
                            </Link>
                        </div>
                    )}
                </div>

            </div>

            {/* Assessment Section (Refined) */}
            {isCompleted && (
                <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-xl shadow-blue-900/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-2">
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Mi Desempeño</h2>
                            <p className="text-gray-500 text-sm font-medium">
                                {selfAssessment
                                    ? "Ya has completado tu autoevaluación para este partido."
                                    : "Aún no has registrado tu autoevaluación para este encuentro."}
                            </p>
                        </div>

                        <Link
                            href={`/player/matches/${match.id}/assessment`}
                            className={`inline-flex items-center justify-center px-8 py-4 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-[0.98] ${selfAssessment
                                ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200"
                                }`}
                        >
                            {selfAssessment ? "Ver valoración" : "Completar ahora"}
                            {!selfAssessment && (
                                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                </svg>
                            )}
                        </Link>
                    </div>
                </section>
            )}
        </div>
    );
}
