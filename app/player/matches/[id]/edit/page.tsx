import { requirePlayer } from "@/lib/auth";
import { MatchService } from "@/services/match.service";
import { notFound, redirect } from "next/navigation";
import { EditMatchForm } from "@/components/matches/EditMatchForm";

export default async function EditMatchPage({
    params,
}: {
    params: { id: string };
}) {
    const { user } = await requirePlayer();
    const matchSvc = new MatchService();
    const match = await matchSvc.getMatchById(params.id);

    if (!match) {
        notFound();
    }

    // Security check: only creator can edit
    if (match.created_by !== user.id || match.status !== "scheduled") {
        redirect(`/player/matches/${params.id}`);
    }

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Editar Partido</h1>
                <p className="text-gray-500 text-sm">Actualiza los detalles del encuentro</p>
            </div>

            <EditMatchForm match={{
                id: match.id,
                match_at: match.match_at,
                club_name: match.club_name,
                notes: match.notes
            }} />
        </div>
    );
}
