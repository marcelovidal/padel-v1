import { requirePlayer } from "@/lib/auth";
import { PlayerRepository } from "@/repositories/player.repository";
import { CreateMatchForm } from "@/components/matches/CreateMatchForm";

export default async function CreateMatchPage() {
    const { playerId } = await requirePlayer();
    const playerRepo = new PlayerRepository();
    const players = await playerRepo.findAllActive();

    return (
        <div className="container mx-auto p-4 max-w-2xl">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Crear Nuevo Partido</h1>
                <p className="text-gray-500 text-sm">Organiza tu próximo enfrentamiento</p>
            </div>
            <CreateMatchForm
                currentPlayerId={playerId}
                availablePlayers={players}
            />
        </div>
    );
}
