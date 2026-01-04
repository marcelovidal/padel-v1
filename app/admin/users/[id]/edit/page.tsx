import { notFound } from "next/navigation";
import { PlayerService } from "@/services/player.service";
import EditPlayerForm from "./edit-form";

type Props = {
  params: { id: string };
};

export default async function EditUserPage({ params }: Props) {
  const { id } = params;

  const service = new PlayerService();
  const player = await service.getPlayerById(id);

  if (!player) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Editar Jugador</h1>
      </div>

      <div className="max-w-3xl">
        {/* EditPlayerForm es cliente y maneja la acción server */}
        {/* Se le pasan los valores actuales para pre-fill */}
        <EditPlayerForm
          id={player.id}
          first_name={player.first_name || ""}
          last_name={player.last_name || ""}
          email={player.email || ""}
          phone={player.phone || ""}
          // TODO: avoid `as any` by ensuring `player` types include these fields
          position={(player.position as any) || "cualquiera"}
          status={(player.status as any) || "active"}
          category={(player.category as any) || "5"}
        />
      </div>
    </div>
  );
}
