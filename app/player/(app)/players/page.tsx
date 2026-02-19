import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/Badge";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { requirePlayer } from "@/lib/auth";
import { PlayerService } from "@/services/player.service";
import { resolveAvatarSrc } from "@/lib/avatar-server.utils";
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

export default async function PlayersPage({
    searchParams,
}: {
    searchParams: { q?: string };
}) {
    const { user, player: mePlayer } = await requirePlayer();
    const meId = mePlayer.id;
    const query = searchParams.q || "";
    const playerService = new PlayerService();
    const siteUrl = getSiteUrl();

    const players = await playerService.searchPlayersWeighted(query);

    const list = await Promise.all(
        players.map(async (p: any) => {
            const avatarData = await resolveAvatarSrc({
                player: p,
                user: p.user_id === user.id ? user : undefined,
            });
            return {
                ...p,
                avatarData,
                inviteMessage: buildPlayerInviteMessage(
                    {
                        id: p.id,
                        display_name: p.display_name,
                        city: p.city,
                        region_code: p.region_code,
                    },
                    siteUrl
                ),
            };
        })
    );

    return (
        <div className="container mx-auto p-4 max-w-5xl">
            <div className="mb-8 space-y-4">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Directorio</h1>
                        <p className="text-gray-500 text-sm font-medium">Jugadores ordenados por cercania y relevancia</p>
                    </div>
                </div>

                <form className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <Input
                        name="q"
                        defaultValue={query}
                        placeholder="Buscar por nombre o ciudad..."
                        className="pl-12 h-14 bg-white border-gray-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-blue-500/10 transition-all text-lg"
                    />
                </form>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                {list.length > 0 ? (
                    list.map((p: any) => (
                        <div
                            key={p.id}
                            className="bg-white p-5 rounded-3xl border border-gray-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-900/5 transition-all"
                        >
                            <div className="flex gap-4">
                                <UserAvatar
                                    src={p.avatarData?.src || null}
                                    initials={p.avatarData?.initials || p.display_name?.slice(0, 2)}
                                    size="md"
                                />
                                <div className="min-w-0 flex-1 space-y-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-bold text-gray-900 truncate">{p.display_name}</h3>
                                        {p.is_guest && (
                                            <Badge className="text-[10px] uppercase font-black tracking-widest bg-gray-50 border border-gray-200 text-gray-400">
                                                Invitado
                                            </Badge>
                                        )}
                                        {p.id === meId && (
                                            <Badge className="text-[10px] uppercase font-black tracking-widest bg-blue-600 text-white">
                                                Tu perfil
                                            </Badge>
                                        )}
                                    </div>

                                    <p className="text-sm text-gray-500 font-medium truncate">
                                        {p.city || "Sin ciudad"}
                                        {p.region_name ? ` (${p.region_name})` : ""}
                                    </p>

                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-bold text-gray-600">
                                            {positionLabel(p.position)}
                                        </span>
                                        <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-bold text-gray-600">
                                            Cat. {categoryLabel(p.category)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
                                <Link
                                    href={`/p/${p.id}`}
                                    className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:border-gray-300"
                                >
                                    Ver perfil
                                </Link>

                                {p.user_id === null && (
                                    <InviteWhatsAppButton
                                        message={p.inviteMessage}
                                        context="directory"
                                    />
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center space-y-3">
                        <div className="bg-gray-50 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto">
                            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-gray-900 font-bold">No se encontraron jugadores</p>
                            <p className="text-gray-500 text-sm">Proba con otro termino de busqueda</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
