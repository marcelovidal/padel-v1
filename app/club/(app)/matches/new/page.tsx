import Link from "next/link";
import { requireClub } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClubCreateMatchWithPlayersForm } from "@/components/club/ClubCreateMatchWithPlayersForm";
import { PlayerService } from "@/services/player.service";

export default async function ClubNewMatchPage() {
  const { club } = await requireClub();
  const playerService = new PlayerService();
  const allPlayers = await playerService.searchPlayersWeighted("");

  const players = (allPlayers || []).map((p: any) => ({
    id: p.id,
    first_name: p.first_name || "",
    last_name: p.last_name || "",
    display_name: p.display_name || `${p.first_name || ""} ${p.last_name || ""}`.trim(),
    city: p.city || null,
    region_name: p.region_name || null,
  }));

  return (
    <div className="space-y-6 container mx-auto p-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Nuevo Partido</h1>
        <Link href="/club/matches">
          <Button variant="outline">Volver</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informacion del Partido</CardTitle>
          <CardDescription>
            El club queda predefinido segun tu perfil reclamado, y debes seleccionar los jugadores en esta misma pantalla.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClubCreateMatchWithPlayersForm clubName={club.name} players={players} />
        </CardContent>
      </Card>
    </div>
  );
}
