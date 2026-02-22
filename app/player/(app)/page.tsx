import { requirePlayer } from "@/lib/auth";
import { PlayerService } from "@/services/player.service";
import { AssessmentService } from "@/services/assessment.service";
import { MatchService } from "@/services/match.service";
import { PlayerMatches } from "@/components/player/PlayerMatches";
import { PendingAssessmentCard } from "@/components/assessments/PendingAssessmentCard";
import { PasalaIndex } from "@/components/player/PasalaIndex";
import { PlayerRadarChart } from "@/components/player/PlayerRadarChart";
import Link from "next/link";
import { ArrowRight, Activity, Trophy, Target, Users, Zap, PlusCircle } from "lucide-react";
import { getSiteUrl } from "@/lib/utils/url";
import { buildPublicMatchUrl, buildShareMessage } from "@/lib/share/shareMessage";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { resolveAvatarSrc } from "@/lib/avatar-server.utils";
import { UserAvatar } from "@/components/ui/UserAvatar";

export const dynamic = "force-dynamic";

export default async function PlayerDashboard() {
  const { user, player } = await requirePlayer();
  const playerId = player.id;
  const avatarData = await resolveAvatarSrc({ player, user });

  const playerService = new PlayerService();
  const matchService = new MatchService();
  const assessmentService = new AssessmentService();
  const cookieStore = cookies();

  const fmeSeen = cookieStore.get("pasala_fme_seen")?.value === "1";
  const firstMatchCheck = await matchService.getPlayerMatches(playerId, { limit: 2 });

  if (!fmeSeen && firstMatchCheck.length === 0) {
    redirect("/welcome/first-match");
  }

  if (firstMatchCheck.length === 0) {
    return (
      <div className="container mx-auto max-w-3xl p-4 pb-20">
        <div className="rounded-[32px] border border-blue-100 bg-white p-8 shadow-xl shadow-blue-900/5">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Tu juego empieza aca</p>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">Carga tu primer partido</h1>
              <p className="text-sm leading-relaxed text-slate-600">
                Activa historial, indice PASALA y la opcion de compartir resultados con tu grupo.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link href="/welcome/first-match">
                <button className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-blue-200 hover:bg-blue-700">
                  <PlusCircle className="h-4 w-4" />
                  Cargar mi primer partido
                </button>
              </Link>
              <Link href="/player/matches/new" className="text-center text-sm font-bold text-gray-400 hover:text-gray-600">
                Ir al formulario completo
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fetch all data in parallel
  const [metrics, recentMatches, pendingAssessments, compStats] = await Promise.all([
    playerService.getProfileMetrics(playerId),
    matchService.getPlayerMatches(playerId, { limit: 5 }),
    assessmentService.getPendingAssessments(playerId),
    playerService.getCompetitiveStats(),
  ]);

  // Enrich matches with share messages for completed ones
  const siteUrl = getSiteUrl();
  const enrichedMatches = recentMatches.map((m) => ({
    ...m,
    shareMessage: m.match_results ? buildShareMessage(m, siteUrl) : undefined,
    shareUrl: m.match_results ? buildPublicMatchUrl(m.id, siteUrl) : undefined,
  }));

  const hasMatches = metrics.played > 0;

  return (
    <div className="container mx-auto p-4 max-w-5xl space-y-8 pb-20">
      {recentMatches.length === 1 && (
        <div className="rounded-[28px] border border-emerald-100 bg-emerald-50/70 p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Buen comienzo</p>
              <p className="mt-1 text-sm font-medium text-emerald-900">
                Ya cargaste tu primer partido. Suma otro para mejorar tu lectura de progreso y contexto competitivo.
              </p>
            </div>
            <Link href="/player/matches/new">
              <button className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white hover:bg-emerald-700">
                Cargar segundo partido
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* Header with Hero Style */}
      <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-6">
          <UserAvatar
            src={avatarData.src}
            initials={avatarData.initials}
            size="lg"
            className="shadow-xl shadow-blue-100 border-2 border-white ring-1 ring-gray-100"
          />
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase">
              Hola, {player?.first_name || 'Jugador'}
            </h1>
            <p className="text-gray-500 font-bold">Bienvenido a tu resumen de juego</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/player/matches/new">
            <button className="bg-blue-600 text-white px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-200 inline-flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4" />
              Cargar Partido
            </button>
          </Link>
          <Link href="/player/profile">
            <button className="bg-gray-900 text-white px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-gray-200">
              Mi Perfil
            </button>
          </Link>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* PASALA Index Card */}
        <div className="lg:col-span-1">
          <PasalaIndex
            value={metrics.pasala_index}
            winScore={metrics.win_rate}
            perfScore={metrics.perf_score}
          />
        </div>

        {/* KPI Grid */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm flex flex-col justify-between">
            <Activity className="w-5 h-5 text-blue-600 mb-4" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Jugados</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.played}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm flex flex-col justify-between">
            <Trophy className="w-5 h-5 text-green-600 mb-4" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Ganados</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.wins}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm flex flex-col justify-between">
            <Target className="w-5 h-5 text-orange-600 mb-4" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Winrate</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.win_rate}%</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center mb-4">
              <span className="text-[10px] font-black text-purple-600">{metrics.current_streak}</span>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Racha</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.current_streak}</p>
            </div>
          </div>
        </div>
      </div>

      {/* CONTEXTO COMPETITIVO */}
      <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Contexto Competitivo</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Mejor Compañero */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Mejor Compañero</p>
              {compStats?.best_teammate_name ? (
                <>
                  <p className="text-lg font-bold text-gray-900 leading-tight">{compStats.best_teammate_name}</p>
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                    {compStats.wins_together} victorias — {compStats.winrate_together}% WR
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-400 italic">Mínimo 2 partidos juntos</p>
              )}
            </div>
          </div>

          {/* Vs Categoría Superior */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center flex-shrink-0">
              <Zap className="w-6 h-6 text-orange-600" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Vs Categoría Superior</p>
              {compStats?.matches_vs_higher > 0 ? (
                <>
                  <p className="text-lg font-bold text-gray-900 leading-tight">
                    {compStats.wins_vs_higher} victorias
                  </p>
                  <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">
                    en {compStats.matches_vs_higher} partidos ({compStats.winrate_vs_higher}% WR)
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-400 italic">Sin partidos contra categoría superior</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Attributes Chart */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Atributos Técnicos</h2>
            <Link href="/player/profile" className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700">
              Ver Radar
            </Link>
          </div>
          <PlayerRadarChart data={metrics.avg_by_skill} />
        </section>

        {/* Recent Matches */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Últimos Partidos</h2>
            <Link href="/player/matches" className="flex items-center text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700">
              Ver todos <ArrowRight className="ml-1 w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-4">
            <PlayerMatches matches={enrichedMatches} currentUserId={user.id} currentPlayerId={playerId} />
          </div>

          {!hasMatches && (
            <div className="bg-blue-50 border-2 border-blue-100 p-8 rounded-[32px] text-center space-y-4 mt-4">
              <p className="font-bold text-blue-900">¿Listo para debutar?</p>
              <Link href="/player/matches/new" className="block">
                <button className="w-full rounded-2xl bg-blue-600 text-white font-bold py-4 hover:bg-blue-700 transition-all">
                  Cargar mi primer partido
                </button>
              </Link>
            </div>
          )}
        </section>
      </div>

      {/* Pending Assessments Section */}
      {pendingAssessments.length > 0 && (
        <section className="bg-orange-50/50 border border-orange-100 rounded-[32px] p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-orange-800">Evaluaciones Pendientes</h2>
            <span className="bg-orange-200 text-orange-900 text-[10px] font-black px-2 py-0.5 rounded-full">
              {pendingAssessments.length}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {pendingAssessments.map((match) => (
              <PendingAssessmentCard
                key={match.id}
                match={match}
                playerId={playerId}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
