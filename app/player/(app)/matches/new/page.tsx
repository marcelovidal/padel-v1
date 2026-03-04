import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePlayer } from "@/lib/auth";
import { PlayerRepository } from "@/repositories/player.repository";
import { CreateMatchForm } from "@/components/matches/CreateMatchForm";

type NewMatchSearchParams = {
  mode?: "club" | "direct";
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
  const [players, currentPlayer] = await Promise.all([playerRepo.findAllActive(), playerRepo.findById(player.id)]);

  const fromBooking = searchParams?.from_booking === "1";
  const mode = searchParams?.mode === "club" ? "club" : searchParams?.mode === "direct" ? "direct" : null;

  if (!fromBooking && mode === "club") {
    redirect("/player/bookings/new");
  }

  if (!fromBooking && mode === null) {
    return (
      <div className="container mx-auto max-w-3xl p-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Crear Partido</h1>
          <p className="text-sm text-gray-500">Un solo flujo para partido con o sin reserva de club.</p>
        </div>

        <section className="grid gap-4 md:grid-cols-2">
          <Link
            href="/player/matches/new?mode=club"
            className="rounded-2xl border border-blue-200 bg-blue-50 p-5 hover:bg-blue-100/60"
          >
            <p className="text-xs font-black uppercase tracking-wider text-blue-700">En un club</p>
            <h2 className="mt-1 text-lg font-bold text-gray-900">Reservar y crear partido</h2>
            <p className="mt-2 text-sm text-gray-600">
              Elige club, cancha y horario para luego completar los 4 jugadores.
            </p>
          </Link>

          <Link
            href="/player/matches/new?mode=direct"
            className="rounded-2xl border border-gray-200 bg-white p-5 hover:bg-gray-50"
          >
            <p className="text-xs font-black uppercase tracking-wider text-gray-500">Sin club</p>
            <h2 className="mt-1 text-lg font-bold text-gray-900">Solo crear partido</h2>
            <p className="mt-2 text-sm text-gray-600">
              Carga fecha, hora y jugadores para historial o partidos fuera de reserva.
            </p>
          </Link>
        </section>
      </div>
    );
  }

  const initialClub =
    searchParams?.club_id && searchParams?.club_name
      ? { id: String(searchParams.club_id), name: String(searchParams.club_name), claim_status: "claimed" as const }
      : null;

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Crear Nuevo Partido</h1>
        <p className="text-gray-500 text-sm">Organiza tu proximo enfrentamiento</p>
      </div>
      <CreateMatchForm
        currentPlayerId={player.id}
        currentPlayerLocation={{
          city: currentPlayer?.city || undefined,
          city_id: currentPlayer?.city_id || undefined,
          region_code: currentPlayer?.region_code || undefined,
          region_name: currentPlayer?.region_name || undefined,
        }}
        availablePlayers={players}
        initialDate={searchParams?.date ? String(searchParams.date) : undefined}
        initialTime={searchParams?.time ? String(searchParams.time) : undefined}
        initialClub={initialClub}
        fromBooking={fromBooking}
        bookingId={searchParams?.booking_id ? String(searchParams.booking_id) : undefined}
        clubRequired={fromBooking ? false : mode !== "direct"}
      />
    </div>
  );
}
