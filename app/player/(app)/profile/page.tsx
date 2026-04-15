import { requirePlayer } from "@/lib/auth";
import { PlayerService } from "@/services/player.service";
import { AssessmentService } from "@/services/assessment.service";
import { LeaguesService } from "@/services/leagues.service";
import { PendingAssessmentCard } from "@/components/assessments/PendingAssessmentCard";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PasalaIndex } from "@/components/player/PasalaIndex";
import { PlayerRadarChart } from "@/components/player/PlayerRadarChart";
import { MapPin, Trophy, Target, Activity, Users, Zap } from "lucide-react";

import { resolveAvatarSrc } from "@/lib/avatar-server.utils";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { ClubOwnerSection } from "@/components/player/ClubOwnerSection";
import { createClient } from "@/lib/supabase/server";

export default async function PlayerProfilePage({
    searchParams,
}: {
    searchParams?: { access?: string };
}) {
    const { user, player } = await requirePlayer();
    const playerId = player.id;
    const avatarData = await resolveAvatarSrc({ player, user });

    const playerService = new PlayerService();
    const assessmentService = new AssessmentService();
    const leaguesService = new LeaguesService();

    const supabase = await createClient();
    const sb = supabase as any;

    const [metrics, pendingAssessments, compStats, clubRankings, clubOwnerRequest] = await Promise.all([
        playerService.getProfileMetrics(playerId),
        assessmentService.getPendingAssessments(playerId),
        playerService.getCompetitiveStats(),
        leaguesService.getMyClubRankings(5).catch(() => []),
        sb
            .from("club_owner_requests")
            .select("id, status, created_at, club_id, club_name_requested, clubs(name)")
            .eq("player_id", player.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
            .then((res: any) => res.data),
    ]);

    const isClubOwner = !!(player as any).is_club_owner;

    let clubOwnerStatus: "none" | "pending" | "active" = "none";
    let clubName: string | null = null;
    let requestedClubName: string | null = null;
    let requestedAt: string | null = null;

    if (isClubOwner) {
        clubOwnerStatus = "active";
        // Buscar el club del owner para mostrar el nombre
        const { data: ownerClub } = await sb
            .from("clubs")
            .select("name")
            .eq("owner_player_id", player.id)
            .maybeSingle();
        clubName = ownerClub?.name || null;
    } else if (clubOwnerRequest?.status === "pending") {
        clubOwnerStatus = "pending";
        requestedClubName = clubOwnerRequest.clubs?.name || clubOwnerRequest.club_name_requested || null;
        requestedAt = clubOwnerRequest.created_at;
    }

    const hasMatches = metrics.played > 0;
    const openClubAccess = searchParams?.access === "club" && clubOwnerStatus === "none";

    return (
        <div className="py-4">
            {/* HERO SECTION */}
            <div className="flex justify-between items-center mb-8 bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
                <div className="flex items-center gap-6">
                    <UserAvatar
                        src={avatarData.src}
                        initials={avatarData.initials}
                        size="lg"
                        className="shadow-xl shadow-blue-50 border-4 border-white ring-1 ring-gray-100"
                    />
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase leading-none">
                            {player.display_name}
                        </h1>
                        <div className="flex items-center gap-1.5 text-gray-500 font-bold text-sm">
                            <MapPin className="w-3.5 h-3.5 text-blue-500" />
                            <span>{player.city || "Ubicación no definida"}, {player.region_name || "AR"}</span>
                        </div>
                    </div>
                </div>
                <Link href={`/player/players/${player.id}/edit`}>
                    <Button variant="outline" className="rounded-full border-gray-200 font-black text-[10px] uppercase tracking-widest px-6 h-10 hover:bg-gray-50 transition-all active:scale-95 shadow-sm">
                        Editar
                    </Button>
                </Link>
            </div>

            {/* PASALA INDEX SECTION */}
            <div className="mb-8">
                <PasalaIndex
                    value={metrics.pasala_index}
                    winRateScore={metrics.win_rate_score}
                    rivalLevelScore={metrics.rival_level_score}
                    perfScore={metrics.perf_score}
                    recentScore={metrics.recent_score}
                    volumeScore={metrics.volume_score}
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

            {/* CONTEXTO COMPETITIVO */}
            <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm mb-8 space-y-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Contexto Competitivo</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Mejor Compañero */}
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Mejor Compañero</p>
                            {compStats?.best_teammate_name ? (
                                <>
                                    <p className="text-base font-bold text-gray-900 leading-tight">{compStats.best_teammate_name}</p>
                                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter">
                                        {compStats.wins_together} victorias — {compStats.winrate_together}% WR
                                    </p>
                                </>
                            ) : (
                                <p className="text-xs text-gray-400 italic">Mínimo 2 partidos juntos</p>
                            )}
                        </div>
                    </div>

                    {/* Vs Categoría Superior */}
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                            <Zap className="w-5 h-5 text-orange-600" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Vs Categoría Superior</p>
                            {compStats?.matches_vs_higher > 0 ? (
                                <>
                                    <p className="text-base font-bold text-gray-900 leading-tight">
                                        {compStats.wins_vs_higher} victorias
                                    </p>
                                    <p className="text-[10px] font-bold text-orange-600 uppercase tracking-tighter">
                                        en {compStats.matches_vs_higher} partidos ({compStats.winrate_vs_higher}% WR)
                                    </p>
                                </>
                            ) : (
                                <p className="text-xs text-gray-400 italic">Sin partidos contra categoría superior</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm mb-8 space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Ranking por Clubes</h3>
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Q5</span>
                </div>
                {clubRankings.length === 0 ? (
                    <p className="text-xs text-gray-500">
                        Aun no hay posicion de ranking disponible para tus clubes.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {clubRankings.map((item: any) => (
                            <div
                                key={item.club_id}
                                className="rounded-2xl border border-gray-100 px-4 py-3 flex items-center justify-between gap-3"
                            >
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-gray-900 truncate">{item.club_name}</p>
                                    <p className="text-[11px] text-gray-500">
                                        {item.matches_played} PJ · {item.wins} G · {item.losses} P
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-blue-700">#{item.rank}</p>
                                    <p className="text-sm font-black text-gray-900">{item.points} pts</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
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
                                    playerId={player.id}
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

            {/* SECCIÓN DUEÑO DE CLUB */}
            <div className="mt-8">
                <ClubOwnerSection
                    status={clubOwnerStatus}
                    clubName={clubName}
                    requestedClubName={requestedClubName}
                    requestedAt={requestedAt}
                    initialOpen={openClubAccess}
                />
            </div>

        </div>
    );
}
