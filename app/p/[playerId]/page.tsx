import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Button } from "@/components/ui/button";
import { resolveAvatarSrc } from "@/lib/avatar-server.utils";
import { PlayerService } from "@/services/player.service";
import { getSiteUrl } from "@/lib/utils/url";
import { buildPlayerInviteMessage } from "@/lib/share/shareMessage";
import { InviteWhatsAppButton } from "@/components/players/InviteWhatsAppButton";

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

    let mePlayer: any = null;
    if (user) {
        const { data } = await (supabase
            .from("players")
            .select("id, onboarding_completed")
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

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-6">
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-6">
                    <div className="flex items-center gap-5">
                        <UserAvatar
                            src={avatarData.src || null}
                            initials={avatarData.initials || "PL"}
                            size="lg"
                        />
                        <div className="space-y-1 min-w-0">
                            <h1 className="text-3xl font-black text-gray-900 truncate">{player.display_name}</h1>
                            <p className="text-sm text-gray-500 font-medium">
                                {player.city || "Sin ciudad"}
                                {player.region_name ? `, ${player.region_name}` : ""}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                            <p className="text-[10px] uppercase tracking-widest font-black text-gray-400">Posicion</p>
                            <p className="text-lg font-bold text-gray-900">{positionLabel(player.position)}</p>
                        </div>
                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                            <p className="text-[10px] uppercase tracking-widest font-black text-gray-400">Categoria</p>
                            <p className="text-lg font-bold text-gray-900">{categoryLabel(player.category)}</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Link href={primaryHref}>
                            <Button className="rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold">
                                {primaryLabel}
                            </Button>
                        </Link>

                        {player.is_claimable && (
                            <Link href={`/welcome/claim?${claimParams.toString()}`}>
                                <Button variant="outline" className="rounded-2xl font-bold">
                                    Reclamar perfil
                                </Button>
                            </Link>
                        )}

                        {player.is_claimable && (
                            <InviteWhatsAppButton
                                message={inviteMessage}
                                context="profile"
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-[#25D366] hover:bg-[#128C7E] disabled:opacity-60 text-white text-xs font-bold"
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
