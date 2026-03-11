import { requirePlayer } from "@/lib/auth";
import { PlayerService } from "@/services/player.service";
import { AssessmentService } from "@/services/assessment.service";
import { MatchService } from "@/services/match.service";
import { LeaguesService } from "@/services/leagues.service";
import { PlayerMatches } from "@/components/player/PlayerMatches";
import { PendingAssessmentCard } from "@/components/assessments/PendingAssessmentCard";
import { PlayerRadarChart } from "@/components/player/PlayerRadarChart";
import { PlayerHeroCard } from "@/components/player/PlayerHeroCard";
import { PlayerIndexEvolution } from "@/components/player/PlayerIndexEvolution";
import { PlayerTopRivals } from "@/components/player/PlayerTopRivals";
import { PlayerBadges } from "@/components/player/PlayerBadges";
import Link from "next/link";
import { ArrowRight, Users, Zap, PlusCircle } from "lucide-react";
import { getSiteUrl } from "@/lib/utils/url";
import { buildPublicMatchUrl, buildShareMessage, buildOgPlayerUrl, buildPublicPlayerUrl, buildWhatsAppTextForCard } from "@/lib/share/shareMessage";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { resolveAvatarSrc } from "@/lib/avatar-server.utils";
import { RegistrationsService } from "@/services/registrations.service";
import { PlayerEventsWidget } from "@/components/player/PlayerEventsWidget";

export const dynamic = "force-dynamic";

export default async function PlayerDashboard() {
  const { user, player } = await requirePlayer();
  const playerId = player.id;
  const avatarData = await resolveAvatarSrc({ player, user });

  const playerService = new PlayerService();
  const matchService = new MatchService();
  const assessmentService = new AssessmentService();
  const leaguesService = new LeaguesService();
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

  const registrationsService = new RegistrationsService();

  const [
    metrics,
    recentMatches,
    pendingAssessments,
    compStats,
    clubRankings,
    openEvents,
    globalRank,
    topRivals,
    indexHistory,
    badges,
  ] = await Promise.all([
    playerService.getProfileMetrics(playerId),
    matchService.getPlayerMatches(playerId, { limit: 5 }),
    assessmentService.getPendingAssessments(playerId),
    playerService.getCompetitiveStats(),
    leaguesService.getMyClubRankings(5).catch(() => []),
    registrationsService.getOpenEvents().catch(() => []),
    playerService.getGlobalRanking(playerId).catch(() => ({ rank: null, total: null })),
    playerService.getTopRivals(playerId, 5).catch(() => []),
    playerService.getIndexHistory(playerId, 30).catch(() => []),
    playerService.getPlayerBadges(playerId).catch(() => []),
  ]);

  const siteUrl = getSiteUrl();
  const ogPlayerImageUrl = buildOgPlayerUrl(playerId, siteUrl);
  const playerShareUrl = buildPublicPlayerUrl(playerId, siteUrl);
  const playerCardWhatsAppText = buildWhatsAppTextForCard("player", {}, playerShareUrl);
  const enrichedMatches = recentMatches.map((m) => ({
    ...m,
    shareMessage: m.match_results ? buildShareMessage(m, siteUrl) : undefined,
    shareUrl: m.match_results ? buildPublicMatchUrl(m.id, siteUrl) : undefined,
  }));

  const hasMatches = metrics.played > 0;

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-4 pb-20">
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

      {/* Hero gamified card */}
      <PlayerHeroCard
        playerName={player?.first_name || "Jugador"}
        avatarSrc={avatarData.src ?? null}
        avatarInitials={avatarData.initials ?? "?"}
        category={player?.category ? Number(player.category) : null}
        metrics={{
          pasala_index:    metrics.pasala_index,
          win_rate_score:  metrics.win_rate_score   ?? 0,
          rival_level_score: metrics.rival_level_score ?? 50,
          perf_score:      metrics.perf_score        ?? 50,
          recent_score:    metrics.recent_score      ?? 0,
          volume_score:    metrics.volume_score      ?? 0,
          played:   metrics.played,
          wins:     metrics.wins,
          win_rate: metrics.win_rate,
          current_streak: metrics.current_streak,
        }}
        globalRank={globalRank}
        shareProps={{
          shareUrl: playerShareUrl,
          ogImageUrl: ogPlayerImageUrl,
          whatsappText: playerCardWhatsAppText,
          downloadName: `pasala-perfil-${player?.display_name?.replace(/\s+/g, "-").toLowerCase() ?? "jugador"}`,
        }}
      />

      {/* Events widget */}
      <PlayerEventsWidget events={openEvents} />

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <PlayerIndexEvolution history={indexHistory} />
        <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Atributos Técnicos</h2>
            <Link href="/player/profile" className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700">
              Ver perfil
            </Link>
          </div>
          <PlayerRadarChart data={metrics.avg_by_skill} />
        </section>
      </div>

      {/* Rivals + Badges */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <PlayerTopRivals rivals={topRivals} />
        <PlayerBadges badges={badges} />
      </div>

      {/* Competitive context */}
      <div className="rounded-[32px] border border-gray-100 bg-white p-8 shadow-sm">
        <h3 className="mb-6 text-xs font-black uppercase tracking-widest text-gray-400">Contexto Competitivo</h3>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-50">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Mejor Compañero</p>
              {compStats?.best_teammate_name ? (
                <>
                  <p className="text-lg font-bold leading-tight text-gray-900">{compStats.best_teammate_name}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">
                    {compStats.wins_together} victorias — {compStats.winrate_together}% WR
                  </p>
                </>
              ) : (
                <p className="text-sm italic text-gray-400">Mínimo 2 partidos juntos</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-orange-50">
              <Zap className="h-6 w-6 text-orange-600" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Vs Categoría Superior</p>
              {compStats?.matches_vs_higher > 0 ? (
                <>
                  <p className="text-lg font-bold leading-tight text-gray-900">
                    {compStats.wins_vs_higher} victorias
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600">
                    en {compStats.matches_vs_higher} partidos ({compStats.winrate_vs_higher}% WR)
                  </p>
                </>
              ) : (
                <p className="text-sm italic text-gray-400">Sin partidos contra categoría superior</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Club rankings */}
      <section className="rounded-[32px] border border-gray-100 bg-white p-8 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Ranking por Clubes</h2>
          <Link href="/player/profile" className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700">
            Ver detalle
          </Link>
        </div>
        {clubRankings.length === 0 ? (
          <p className="text-sm text-gray-500">Aun no tienes posicion de ranking disponible.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {clubRankings.map((item: any) => (
              <div key={item.club_id} className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-gray-900">{item.club_name}</p>
                  <p className="text-xs text-gray-500">
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
      </section>

      {/* Recent matches */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Últimos Partidos</h2>
          <Link href="/player/matches" className="flex items-center text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700">
            Ver todos <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </div>
        <div className="space-y-4">
          <PlayerMatches matches={enrichedMatches} currentUserId={user.id} currentPlayerId={playerId} />
        </div>
        {!hasMatches && (
          <div className="mt-4 rounded-[32px] border-2 border-blue-100 bg-blue-50 p-8 text-center space-y-4">
            <p className="font-bold text-blue-900">¿Listo para debutar?</p>
            <Link href="/player/matches/new" className="block">
              <button className="w-full rounded-2xl bg-blue-600 py-4 font-bold text-white hover:bg-blue-700 transition-all">
                Cargar mi primer partido
              </button>
            </Link>
          </div>
        )}
      </section>

      {/* Pending assessments */}
      {pendingAssessments.length > 0 && (
        <section className="rounded-[32px] border border-orange-100 bg-orange-50/50 p-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-orange-800">Evaluaciones Pendientes</h2>
            <span className="rounded-full bg-orange-200 px-2 py-0.5 text-[10px] font-black text-orange-900">
              {pendingAssessments.length}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {pendingAssessments.map((match) => (
              <PendingAssessmentCard key={match.id} match={match} playerId={playerId} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
