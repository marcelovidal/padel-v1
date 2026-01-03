import { notFound } from "next/navigation";
import { MatchService } from "@/services/match.service";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResultForm } from "./result-form";

export default async function MatchResultPage({
  params,
}: {
  params: { id: string };
}) {
  const matchService = new MatchService();
  const match = await matchService.getMatchById(params.id);

  if (!match) {
    notFound();
  }

  const existingResult = match.match_results;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">
          {existingResult ? "Editar Resultado" : "Cargar Resultado"}
        </h1>
        <Link href={`/admin/matches/${match.id}`}>
          <Button variant="outline">Volver</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resultado del Partido</CardTitle>
          <CardDescription>
            {match.club_name} - {new Date(match.match_at).toLocaleDateString("es-ES")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResultForm matchId={match.id} existingResult={existingResult} />
        </CardContent>
      </Card>
    </div>
  );
}

