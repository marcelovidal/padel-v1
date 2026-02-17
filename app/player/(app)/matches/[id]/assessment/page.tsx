import { requirePlayer } from "@/lib/auth";
import { MatchService } from "@/services/match.service";
import { AssessmentService } from "@/services/assessment.service";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { AssessmentForm } from "@/components/assessments/AssessmentForm";
import { PlayerAssessmentView } from "@/components/assessments/PlayerAssessmentView";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default async function MatchAssessmentPage({
    params,
}: {
    params: { id: string };
}) {
    const { player: mePlayer } = await requirePlayer();
    const playerId = mePlayer.id;
    const matchSvc = new MatchService();
    const assessmentSvc = new AssessmentService();

    const [match, assessment] = await Promise.all([
        matchSvc.getMatchById(params.id),
        assessmentSvc.getPlayerAssessmentInMatch(params.id, playerId)
    ]);

    if (!match) notFound();

    // Verification: match must be completed to assess
    const isCompleted = match.status === "completed" || !!match.match_results;
    if (!isCompleted) {
        redirect(`/player/matches/${params.id}`);
    }

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
                    <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">Autoevaluación</h2>
                    <p className="text-sm font-bold text-gray-900">{match.club_name}</p>
                </div>
            </header>

            <main>
                {assessment ? (
                    <div className="space-y-6">
                        <div className="bg-blue-600 p-8 rounded-3xl text-white shadow-xl shadow-blue-500/20">
                            <h1 className="text-3xl font-black tracking-tight mb-2">Buen trabajo!</h1>
                            <p className="text-blue-100 font-medium">Esta es la valoración de tu desempeño el {format(new Date(match.match_at), "d 'de' MMMM", { locale: es })}.</p>
                        </div>
                        <PlayerAssessmentView assessment={assessment} />
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-white p-8 rounded-3xl border border-blue-100 shadow-xl shadow-blue-900/5">
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-4">¿Cómo jugaste?</h1>
                            <p className="text-gray-500 font-medium leading-relaxed">Tómate un momento para analizar tu rendimiento técnico y táctico en este partido. Tu honestidad te ayudará a seguir mejorando.</p>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                            <AssessmentForm matchId={match.id} playerId={playerId} />
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
