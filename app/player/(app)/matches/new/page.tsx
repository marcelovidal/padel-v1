import { requirePlayer } from "@/lib/auth";
import { PlayerRepository } from "@/repositories/player.repository";
import { CreateMatchForm } from "@/components/matches/CreateMatchForm";

type NewMatchSearchParams = {
  from_booking?: string;
  booking_id?: string;
  date?: string;
  time?: string;
  club_id?: string;
  club_name?: string;
};

export default async function CreateMatchPage({
  searchParams,
}: {
  searchParams?: NewMatchSearchParams;
}) {
    const { player } = await requirePlayer();
    const playerRepo = new PlayerRepository();
    const [players, currentPlayer] = await Promise.all([
        playerRepo.findAllActive(),
        playerRepo.findById(player.id)
    ]);
    const fromBooking = searchParams?.from_booking === "1";
    const initialClub =
      searchParams?.club_id && searchParams?.club_name
        ? { id: String(searchParams.club_id), name: String(searchParams.club_name), claim_status: "claimed" as const }
        : null;

    return (
        <div className="container mx-auto p-4 max-w-2xl">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Crear Nuevo Partido</h1>
                <p className="text-gray-500 text-sm">Organiza tu próximo enfrentamiento</p>
            </div>
            <CreateMatchForm
                currentPlayerId={player.id}
                currentPlayerLocation={{
                    city: currentPlayer?.city || undefined,
                    city_id: currentPlayer?.city_id || undefined,
                    region_code: currentPlayer?.region_code || undefined,
                    region_name: currentPlayer?.region_name || undefined
                }}
                availablePlayers={players}
                initialDate={searchParams?.date ? String(searchParams.date) : undefined}
                initialTime={searchParams?.time ? String(searchParams.time) : undefined}
                initialClub={initialClub}
                fromBooking={fromBooking}
                bookingId={searchParams?.booking_id ? String(searchParams.booking_id) : undefined}
            />
        </div>
    );
}
