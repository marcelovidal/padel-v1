import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveAvatarSrc } from "@/lib/avatar-server.utils";
import { PlayerService } from "@/services/player.service";
import { getSiteUrl } from "@/lib/utils/url";
import { buildOgPlayerUrl, buildPlayerInviteMessage, buildPublicPlayerUrl, buildWhatsAppTextForCard } from "@/lib/share/shareMessage";
import { InviteWhatsAppButton } from "@/components/players/InviteWhatsAppButton";
import { ProfileIssueTooltip } from "@/components/feedback/ProfileIssueTooltip";
import { PlayerHeroCard } from "@/components/player/PlayerHeroCard";

function positionLabel(value?: string | null) {
    if (!value) return "Cualquiera";
    if (value === "drive") return "Drive";
    if (value === "reves") return "Reves";
    return "Ambas";
}

function categoryLabel(value?: number | null) {
    if (!value) return "-";
    return `${value}ta`;
}

export default async function PublicPlayerProfilePage({
    params,
    searchParams,
}: {
    params: { playerId: string };
    searchParams: { claim_match?: string };
}) {
    const playerService = new PlayerService();
    const player = await playerService.getPublicPlayerData(params.playerId);

    if (!player) notFound();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const siteUrl = getSiteUrl();

    const avatarData = await resolveAvatarSrc({
        player,
    });
    const heroStats = await playerService.getPublicHeroStats(player.id);

    let mePlayer: any = null;
    if (user) {
        const { data } = await (supabase
            .from("players")
            .select("id, onboarding_completed, first_name, last_name")
            .eq("user_id", user.id)
            .is("deleted_at", null)
            .maybeSingle() as any);
        mePlayer = data;
    }

    const isAnonymous = !user;
    const isUnonboarded = !!user && (!mePlayer || !mePlayer.onboarding_completed);
    const isOwnProfile = !!mePlayer && mePlayer.id === player.id;

    let primaryHref = "/player/players";
    let primaryLabel = "Volver al directorio";

    if (isAnonymous) {
        primaryHref = `/welcome?next=${encodeURIComponent(`/p/${player.id}`)}`;
        primaryLabel = "Entrar para continuar";
    } else if (isUnonboarded) {
        primaryHref = `/welcome/onboarding?next=${encodeURIComponent(`/p/${player.id}`)}`;
        primaryLabel = "Completar onboarding";
    } else if (isOwnProfile) {
        primaryHref = "/player/profile";
        primaryLabel = "Editar mi perfil";
    }

    const claimParams = new URLSearchParams();
    claimParams.set("claim_player", player.id);
    if (searchParams.claim_match) claimParams.set("claim_match", searchParams.claim_match);
    claimParams.set("next", "/player");

    const inviteMessage = buildPlayerInviteMessage(
        {
            id: player.id,
            display_name: player.display_name,
            city: player.city,
            region_code: player.region_code,
        },
        siteUrl
    );

    const shareUrl = buildPublicPlayerUrl(player.id, siteUrl);
    const ogImageUrl = buildOgPlayerUrl(player.id, siteUrl);
    const whatsappShareText = buildWhatsAppTextForCard("player", {}, shareUrl);
    const locationLabel = [player.city, player.region_name].filter(Boolean).join(", ");

    const heroMetrics = {
        pasala_index: heroStats?.metrics?.pasala_index ?? null,
        win_rate_score: Number(heroStats?.metrics?.win_rate_score ?? 0),
        rival_level_score: Number(heroStats?.metrics?.rival_level_score ?? 50),
        perf_score: Number(heroStats?.metrics?.perf_score ?? 50),
        recent_score: Number(heroStats?.metrics?.recent_score ?? 0),
        volume_score: Number(heroStats?.metrics?.volume_score ?? 0),
        played: Number(heroStats?.metrics?.played ?? 0),
        wins: Number(heroStats?.metrics?.wins ?? 0),
        win_rate: Number(heroStats?.metrics?.win_rate ?? 0),
        current_streak: String(heroStats?.metrics?.current_streak || "-"),
    };

    const globalRank = heroStats?.globalRank || { rank: null, total: null };

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="mx-auto max-w-5xl space-y-6">
                <PlayerHeroCard
                    playerName={player.display_name}
                    title={player.display_name}
                    panelLabel="Perfil publico"
                    avatarSrc={avatarData.src || null}
                    avatarInitials={avatarData.initials || "PL"}
                    locationLabel={locationLabel || "Sin ubicacion"}
                    category={player.category ? Number(player.category) : null}
                    metrics={heroMetrics}
                    globalRank={globalRank}
                    shareProps={{
                        shareUrl,
                        ogImageUrl,
                        whatsappText: whatsappShareText,
                        downloadName: `pasala-perfil-${player.display_name?.replace(/\s+/g, "-").toLowerCase() || "jugador"}`,
                    }}
                    actions={
                        <>
                            <Link href={primaryHref} className="flex-1 min-w-0">
                                <button className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-blue-500 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-900/50 hover:bg-blue-400 transition-colors active:scale-95 whitespace-nowrap">
                                    {primaryLabel}
                                </button>
                            </Link>

                            <div className="shrink-0 rounded-2xl border border-white/15 bg-white/8 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-blue-200">
                                {positionLabel(player.position)} · {categoryLabel(player.category)}
                            </div>

                            {player.is_claimable && (
                                <Link
                                    href={`/welcome/claim?${claimParams.toString()}`}
                                    className="shrink-0 inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/8 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-blue-200 hover:bg-white/15 transition-colors active:scale-95 whitespace-nowrap"
                                >
                                    Reclamar perfil
                                </Link>
                            )}

                            {player.is_claimable && (
                                <InviteWhatsAppButton
                                    message={inviteMessage}
                                    context="profile"
                                    iconOnly
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[#25D366] hover:bg-[#128C7E] disabled:opacity-60 text-white"
                                />
                            )}
                        </>
                    }
                />

                {user && (
                    <ProfileIssueTooltip
                        targetProfileType="player"
                        targetProfileId={player.id}
                        targetProfileName={player.display_name}
                    />
                )}
            </div>
        </div>
    );
}
