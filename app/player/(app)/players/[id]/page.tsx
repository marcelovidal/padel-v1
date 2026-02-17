import { requirePlayer } from "@/lib/auth";
import { PlayerService } from "@/services/player.service";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/Badge";

export default async function PlayerDetailPage({
    params
}: {
    params: { id: string };
}) {
    const { user, player: mePlayer } = await requirePlayer();
    const meId = mePlayer.id;
    const playerService = new PlayerService();
    const player = await playerService.getPlayerById(params.id);

    if (!player) {
        notFound();
    }

    // Edit permission logic:
    // 1. Own profile: user_id = current user's id
    // 2. Guest created by current user: is_guest = true AND user_id IS NULL AND created_by = current user's id
    const isOwnProfile = player.user_id === user.id;
    const isOwnerOfGuest = player.is_guest && !player.user_id && player.created_by === user.id;
    const canEdit = isOwnProfile || isOwnerOfGuest;

    return (
        <div className="container mx-auto p-4 max-w-2xl">
            <div className="mb-6 flex items-center gap-4">
                <Link href="/player/players" className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </Link>
                <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Detalle del Jugador</h1>
            </div>

            <div className="bg-white rounded-3xl shadow-xl shadow-blue-900/5 border border-gray-100 overflow-hidden">
                <div className="p-8 space-y-8">
                    <div className="flex justify-between items-start">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <h2 className="text-3xl font-black text-gray-900 tracking-tight">{player.display_name}</h2>
                                {player.is_guest && (
                                    <Badge className="text-[10px] uppercase font-black tracking-widest bg-gray-50 border border-gray-200 text-gray-400">Invitado</Badge>
                                )}
                                {player.id === meId && (
                                    <Badge className="text-[10px] uppercase font-black tracking-widest bg-blue-600 text-white">Tú</Badge>
                                )}
                            </div>
                            <p className="text-sm font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                                {player.position || "Posición no definida"}
                            </p>
                        </div>

                        {canEdit && (
                            <Link href={`/player/players/${player.id}/edit`}>
                                <Button className="rounded-2xl bg-gray-900 hover:bg-gray-800 text-white font-bold px-6">
                                    Editar Perfil
                                </Button>
                            </Link>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-8 pt-8 border-t border-gray-50">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Ubicación</p>
                            <p className="text-gray-900 font-bold">
                                {player.city || "No definida"}{player.region_name ? `, ${player.region_name}` : ""}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Miembro desde</p>
                            <p className="text-gray-900 font-bold">
                                {new Date(player.created_at).toLocaleDateString()}
                            </p>
                        </div>
                    </div>

                    {player.is_guest && !player.user_id && player.created_by !== user.id && (
                        <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl">
                            <p className="text-xs text-orange-700 font-medium leading-relaxed">
                                Este es un perfil de invitado creado por otro usuario. Solo el creador puede editar este perfil.
                            </p>
                        </div>
                    )}

                    {player.user_id && player.user_id !== user.id && (
                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                            <p className="text-xs text-blue-700 font-medium leading-relaxed">
                                Este perfil pertenece a un usuario registrado. Solo el dueño puede editar su propia información.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Stats section could be added here later if needed */}
        </div>
    );
}
