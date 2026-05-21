import { requirePlayer } from "@/lib/auth";
import { PlayerService } from "@/services/player.service";
import { AssessmentService } from "@/services/assessment.service";
import { MatchService } from "@/services/match.service";
import { LeaguesService } from "@/services/leagues.service";
import { PlayerMatches } from "@/components/player/PlayerMatches";
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
import { formatCityWithProvinceAbbr } from "@/lib/utils/location";
import { resolvePlayerCityAction } from "@/lib/actions/geo-resolve.actions";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

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
      <div className="py-4">
        <div className="rounded-[14px] border border-blue-100 bg-white p-8 shadow-xl shadow-blue-900/5">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-rojo">Tu juego empieza aca</p>
              <h1 className="text-3xl font-black tracking-tight text-brand-negro">Carga tu primer partido</h1>
              <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                Activa historial, indice PASALA y la opcion de compartir resultados con tu grupo.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link href="/welcome/first-match">
                <button className="inline-flex items-center gap-2 rounded-2xl bg-brand-rojo px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-brand-rojo/20 hover:bg-brand-rojo-dark">
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

  // Silently try to resolve city_id if missing — no UI shown, tracked in admin analytics
  if (!player.city_id && player.city) {
    resolvePlayerCityAction().catch(() => {});
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
  const enrichedMatches = recentMatches.map((m: any) => ({
    ...m,
    shareMessage: m.match_results ? buildShareMessage(m, siteUrl) : undefined,
    shareUrl: m.match_results ? buildPublicMatchUrl(m.id, siteUrl) : undefined,
  }));

  const hasMatches = metrics.played > 0;

  const dateLabel = new Date().toLocaleDateString("es-AR", {
    weekday: "short", day: "numeric", month: "long", year: "numeric",
  }).toUpperCase().replace(/\./g, "").replace(/,/g, " ·");

  return (
    <div className="space-y-6 py-4">
      {/* Page title */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[22px] font-bold uppercase tracking-[0.02em] text-[var(--text-secondary)]">Resumen de actividad</h1>
        <div className="flex items-center gap-4">
          <span className="hidden sm:block text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">{dateLabel}</span>
          <ThemeToggle />
        </div>
      </div>
      {recentMatches.length === 1 && (
        <div className="rounded-[14px] border border-emerald-100 bg-emerald-50/70 p-5 shadow-sm">
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
        locationLabel={formatCityWithProvinceAbbr(player?.city, player?.region_code, player?.region_name)}
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
        <section className="rounded-[14px] border border-[var(--border-soft)] bg-[var(--bg-card)] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.07)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] bg-brand-azul/10">
                <svg className="h-3 w-3 text-brand-azul" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <polygon points="8,1 15,5.5 15,10.5 8,15 1,10.5 1,5.5" />
                </svg>
              </div>
              <h2 className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">Atributos Técnicos</h2>
            </div>
            <Link href="/player/profile" className="text-[10px] font-black uppercase tracking-widest text-brand-azul hover:text-brand-azul/80">
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

      {/* Ranking por clubes + Contexto competitivo — 2 columnas en desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

      {/* Club rankings */}
      <section className="rounded-[14px] border border-[var(--border-soft)] bg-[var(--bg-card)] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.07)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] bg-brand-rojo/10">
              <svg className="h-3 w-3 text-brand-rojo" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="2" y="10" width="3" height="4" rx="1" /><rect x="6.5" y="6" width="3" height="8" rx="1" /><rect x="11" y="2" width="3" height="12" rx="1" />
              </svg>
            </div>
            <h2 className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">Ranking por Clubes</h2>
          </div>
          <Link href="/player/profile" className="text-[10px] font-black uppercase tracking-widest text-brand-azul hover:text-brand-azul/80">
            Ver detalle
          </Link>
        </div>
        {clubRankings.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Aun no tienes posicion de ranking disponible.</p>
        ) : (
          <div className="grid gap-3">
            {clubRankings.map((item: any) => (
              <div key={item.club_id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-soft)] bg-[var(--bg-elevated)] p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[var(--text-primary)]">{item.club_name}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {item.matches_played} PJ · {item.wins} G · {item.losses} P
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-[24px] font-black leading-none text-brand-rojo">#{item.rank}</p>
                  <p className="font-display text-[22px] font-black leading-none text-[var(--text-primary)]">{item.points} <span className="text-[12px] font-sans font-bold text-[var(--text-faint)]">pts</span></p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Competitive context */}
      <div className="rounded-[14px] border border-[var(--border-soft)] bg-[var(--bg-card)] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.07)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] bg-brand-azul/10">
            <svg className="h-3 w-3 text-brand-azul" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="5" cy="6" r="2.5" /><circle cx="11" cy="6" r="2.5" /><path strokeLinecap="round" d="M1 14c0-2.5 1.8-4 4-4m6 0c2.2 0 4 1.5 4 4" />
            </svg>
          </div>
          <h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">Contexto Competitivo</h3>
        </div>
        <div className="space-y-4">
          {/* Mejor compañero */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-azul/10">
              <Users className="h-5 w-5 text-brand-azul-light" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Mejor Compañero</p>
              {compStats?.best_teammate_name ? (
                <>
                  <p className="text-sm font-bold text-[var(--text-primary)] truncate">{compStats.best_teammate_name}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-brand-rojo">
                    {compStats.wins_together} victorias — {compStats.winrate_together}% WR
                  </p>
                </>
              ) : (
                <p className="text-xs italic text-[var(--text-muted)]">Mínimo 2 partidos juntos</p>
              )}
            </div>
          </div>
          <div className="border-t border-[var(--border-soft)]" />
          {/* Vs categoría superior */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-rojo/10">
              <Zap className="h-5 w-5 text-brand-rojo" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Vs · Mejor Rival</p>
              {compStats?.matches_vs_higher > 0 ? (
                <>
                  <p className="text-sm font-bold text-[var(--text-primary)]">
                    {compStats.wins_vs_higher} victorias en {compStats.matches_vs_higher} partidos
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-brand-rojo">
                    {compStats.winrate_vs_higher}% WR
                  </p>
                </>
              ) : (
                <p className="text-xs italic text-[var(--text-muted)]">Sin partidos contra categoría superior</p>
              )}
            </div>
          </div>
        </div>
      </div>

      </div>{/* end grid ranking + contexto */}

      {/* Recent matches */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
              <div className="h-[3px] w-[12px] rounded-full bg-brand-rojo" />
              <h2 className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">Últimos Partidos</h2>
            </div>
          <Link href="/player/matches" className="flex items-center text-[10px] font-black uppercase tracking-widest text-brand-azul hover:text-brand-azul/80">
            Ver todos <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </div>
        <div className="space-y-4">
          <PlayerMatches matches={enrichedMatches} currentUserId={user.id} currentPlayerId={playerId} />
        </div>
        {!hasMatches && (
          <div className="mt-4 rounded-[14px] border-2 border-brand-rojo/20 bg-brand-rojo/5 p-8 text-center space-y-4">
            <p className="font-bold text-brand-negro">¿Listo para debutar?</p>
            <Link href="/player/matches/new" className="block">
              <button className="w-full rounded-2xl bg-brand-rojo py-4 font-bold text-white hover:bg-brand-rojo-dark transition-all">
                Cargar mi primer partido
              </button>
            </Link>
          </div>
        )}
      </section>

    </div>
  );
}
