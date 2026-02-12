import { createClient } from "@/lib/supabase/server";
import { PlayerService } from "@/services/player.service";
import { AssessmentService } from "@/services/assessment.service";
import { PendingAssessmentCard } from "@/components/assessments/PendingAssessmentCard";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PasalaIndex } from "@/components/player/PasalaIndex";
import { PlayerRadarChart } from "@/components/player/PlayerRadarChart";
import { MapPin, Trophy, Target, Activity } from "lucide-react";

export default async function PlayerProfilePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const playerService = new PlayerService();
    const assessmentService = new AssessmentService();

    // Find player associated with this user
    const playerByUserId = await playerService.getPlayerByUserId(user.id);

    if (!playerByUserId) {
        return (
            <div className="container mx-auto p-4 max-w-2xl">
                <h1 className="text-2xl font-bold mb-4">Mi Perfil</h1>
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-xl">
                    <p className="text-yellow-700">
                        No se encontró un perfil de jugador asociado a tu cuenta.
                    </p>
                </div>
            </div>
        );
    }

    const [metrics, pendingAssessments] = await Promise.all([
        playerService.getProfileMetrics(playerByUserId.id),
        assessmentService.getPendingAssessments(playerByUserId.id)
    ]);

    const hasMatches = metrics.played > 0;

    return (
        <div className="container mx-auto p-4 max-w-2xl pb-20">
            {/* HERO SECTION */}
            <div className="flex justify-between items-start mb-8 bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase">
                        {playerByUserId.display_name}
                    </h1>
                    <div className="flex items-center gap-1.5 text-gray-500 font-bold text-sm">
                        <MapPin className="w-3.5 h-3.5 text-blue-500" />
                        <span>{playerByUserId.city || "Ubicación no definida"}, {playerByUserId.region_name || "AR"}</span>
                    </div>
                </div>
                <Link href={`/player/players/${playerByUserId.id}/edit`}>
                    <Button variant="outline" className="rounded-full border-gray-200 font-black text-[10px] uppercase tracking-widest px-6 h-10 hover:bg-gray-50 transition-all active:scale-95 shadow-sm">
                        Editar
                    </Button>
                </Link>
            </div>

            {/* PASALA INDEX SECTION */}
            <div className="mb-8">
                <PasalaIndex
                    value={metrics.pasala_index}
                    winScore={metrics.win_rate}
                    perfScore={metrics.perf_score}
                />
            </div>

            {/* KPI GRID */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Jugados</p>
                        <p className="text-xl font-bold text-gray-900">{metrics.played}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Ganados</p>
                        <p className="text-xl font-bold text-gray-900">{metrics.wins}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center">
                        <Target className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Efectividad</p>
                        <p className="text-xl font-bold text-gray-900">{metrics.win_rate}%</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center">
                        <div className="text-xs font-black text-purple-600">{metrics.current_streak}</div>
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Racha</p>
                        <p className="text-xl font-bold text-gray-900">{metrics.current_streak}</p>
                    </div>
                </div>
            </div>

            {/* LAST 10 & RADAR CHART */}
            <div className="space-y-8">
                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Forma Reciente (Últimos 10)</h3>
                    {metrics.last_10_results.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">No hay historial de partidos.</p>
                    ) : (
                        <div className="flex gap-2">
                            {metrics.last_10_results.map((r: string, i: number) => (
                                <div
                                    key={i}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm ${r === 'W' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'
                                        }`}
                                >
                                    {r}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <PlayerRadarChart data={metrics.avg_by_skill} />

                {/* PENDING ASSESSMENTS */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Pendientes de Evaluación</h3>
                        <span className="bg-blue-100 text-blue-600 text-[10px] font-black px-2 py-0.5 rounded-full">
                            {pendingAssessments.length}
                        </span>
                    </div>

                    {pendingAssessments.length === 0 ? (
                        <div className="bg-gray-50 border border-dashed border-gray-200 p-6 rounded-[28px] text-center">
                            <p className="text-xs text-gray-400">¡Estás al día con tus evaluaciones!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {pendingAssessments.map((match) => (
                                <PendingAssessmentCard
                                    key={match.id}
                                    match={match}
                                    playerId={playerByUserId.id}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {!hasMatches && (
                    <div className="bg-blue-50 border-2 border-blue-100 p-8 rounded-[32px] text-center space-y-4">
                        <p className="font-bold text-blue-900">¿Listo para debutar?</p>
                        <p className="text-sm text-blue-700/70">Carga tu primer partido para ver tus estadísticas y el Índice PASALA en acción.</p>
                        <Link href="/player/matches/new" className="block">
                            <Button className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold py-6">
                                Cargar mi primer partido
                            </Button>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
