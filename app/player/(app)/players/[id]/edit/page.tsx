import { requirePlayer } from "@/lib/auth";
import { PlayerService } from "@/services/player.service";
import { notFound, redirect } from "next/navigation";
import { EditPlayerForm } from "@/components/players/EditPlayerForm";
import { resolveAvatarSrc } from "@/lib/avatar-server.utils";

export default async function EditPlayerPage({
    params
}: {
    params: { id: string };
}) {
    const { user } = await requirePlayer();
    const playerService = new PlayerService();
    const player = await playerService.getPlayerById(params.id);

    if (!player) {
        notFound();
    }

    const avatarData = await resolveAvatarSrc({ player, user });

    // Security check (Duplicate of client-side/RPC logic for better UX)
    const isOwnProfile = player.user_id === user.id;
    const isOwnerOfGuest = player.is_guest && !player.user_id && player.created_by === user.id;
    const canEdit = isOwnProfile || isOwnerOfGuest;

    if (!canEdit) {
        redirect(`/player/players/${player.id}`);
    }

    return (
        <div className="container mx-auto p-4 max-w-2xl">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">
                    {isOwnProfile ? "Editar Mi Perfil" : `Editar Invitado: ${player.display_name}`}
                </h1>
                <p className="text-gray-500 text-sm font-medium">Actualiza la información pública y ubicación</p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-xl shadow-blue-900/5 border border-gray-100">
                <EditPlayerForm player={player} currentAvatarUrl={avatarData.src || undefined} />
            </div>
        </div>
    );
}
