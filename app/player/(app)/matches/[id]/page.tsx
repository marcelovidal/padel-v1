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
import { AssessmentInline } from "@/components/assessments/AssessmentInline";
import { ShareButtons } from "@/components/matches/ShareButtons";
import { hasMatchResult, normalizeSets, getEffectiveStatus } from "@/lib/match/matchUtils";
import { getSiteUrl } from "@/lib/utils/url";
import { buildPublicMatchUrl, buildShareMessage } from "@/lib/share/shareMessage";

export default async function MatchDetailPage({
    params,
}: {
    params: { id: string };
}) {
    const { player: mePlayer, user } = await requirePlayer();
    const playerId = mePlayer.id;
    const matchSvc = new MatchService();
    const assessmentSvc = new AssessmentService();

    const [match, selfAssessment] = await Promise.all([
        matchSvc.getMatchById(params.id),
        assessmentSvc.getPlayerAssessmentInMatch(params.id, playerId)
    ]);

    if (!match) {
        notFound();
    }

    const effectiveStatus = getEffectiveStatus(match);
    const isCreator = match.created_by === user.id;
    const isScheduled = effectiveStatus === "scheduled";
    const calculatedHasResults = hasMatchResult(match);
    const isCompleted = effectiveStatus === "completed" || calculatedHasResults;
    const isCancelled = effectiveStatus === "cancelled";
    const hasAssessment = !!selfAssessment;

    // Generate share message if result exists
    const siteUrl = getSiteUrl();
    const shareMessage = calculatedHasResults ? buildShareMessage(match, siteUrl) : undefined;
    const shareUrl = calculatedHasResults ? buildPublicMatchUrl(match.id, siteUrl) : undefined;

    // Group players by team for the MatchScore component
    const teamA = match.match_players.filter((p: any) => p.team === "A");
    const teamB = match.match_players.filter((p: any) => p.team === "B");

    const statusColors = {
        scheduled: "bg-blue-100 text-blue-800 border-blue-200",
        completed: "bg-green-100 text-green-800 border-green-200",
        cancelled: "bg-red-100 text-red-800 border-red-200",
    };

    // Normalize sets for UI consumption
    const normalizedSets = match.match_results?.sets
        ? normalizeSets(match.match_results.sets as any)
        : [];

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
                            Editar partido
                        </Link>
                        <CancelMatchButton matchId={match.id} />
                    </div>
                )}
            </header>

            <div className="bg-gradient-to-br from-blue-50 to-white p-8 rounded-3xl border border-blue-100 shadow-xl shadow-blue-900/5">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-tight">
                            Detalle del Partido
                        </h1>
                        <p className="text-gray-500 text-sm font-medium mt-1">
                            {format(new Date(match.match_at), "EEEE d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                        </p>
                    </div>
                    <Badge
                        className={`${statusColors[effectiveStatus]} px-4 py-2 text-xs font-black uppercase tracking-widest shadow-sm border`}
                    >
                        {effectiveStatus === "scheduled" && "Programado"}
                        {effectiveStatus === "completed" && "Finalizado"}
                        {effectiveStatus === "cancelled" && "Cancelado"}
                    </Badge>
                </div>

                {isScheduled && !isCreator && (
                    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                        <p className="text-sm font-medium text-amber-800">
                            Solo quien cargo el partido puede editarlo antes de registrar el resultado.
                        </p>
                    </div>
                )}

                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">{match.club_name}</h2>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Club</p>
                    </div>
                </div>

                {match.notes && (
                    <div className="mt-4 p-4 bg-white/60 rounded-2xl border border-blue-100">
                        <p className="text-sm text-gray-700 italic leading-relaxed">{match.notes}</p>
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                    <span className="w-1 h-6 bg-blue-600 rounded-full"></span>
                    Resultado del Partido
                </h3>

                <MatchScore
                    variant={isScheduled ? "scheduled" : "result"}
                    results={calculatedHasResults ? {
                        sets: normalizedSets,
                        winnerTeam: match.match_results?.winner_team || null
                    } : null}
                    playersByTeam={{
                        A: teamA.map((p: any) => p.players),
                        B: teamB.map((p: any) => p.players)
                    }}
                    showPlayers={true}
                />

                {isCompleted && !calculatedHasResults && match.match_players.some((p: any) => p.player_id === playerId) && (
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

                {calculatedHasResults && shareMessage && (
                    <div className="mt-8 p-6 bg-green-50/50 rounded-3xl border border-green-100 flex flex-col items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="text-center">
                            <h4 className="text-xs font-black uppercase tracking-widest text-green-600 mb-1">¡Buen partido!</h4>
                            <p className="text-sm text-gray-600 font-medium">Compartí el resultado con el resto del grupo.</p>
                        </div>
                        <ShareButtons
                            matchId={match.id}
                            message={shareMessage}
                            shareUrl={shareUrl || ""}
                            variant="subtle"
                        />
                    </div>
                )}
            </div>

            {/* Assessment Section */}
            <div className="space-y-4">
                <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                    <span className="w-1 h-6 bg-amber-500 rounded-full"></span>
                    Mi Desempeño
                </h3>

                <AssessmentInline
                    matchId={match.id}
                    playerId={playerId}
                    hasAssessment={hasAssessment}
                    isCompleted={isCompleted}
                />
            </div>
        </div>
    );
}
