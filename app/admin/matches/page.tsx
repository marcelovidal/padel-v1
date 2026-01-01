import { requireAdmin } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function MatchesPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Partidos</h1>
        <Link href="/admin/matches/new">
          <Button>Nuevo Partido</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Partidos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Próximamente...</p>
        </CardContent>
      </Card>
    </div>
  );
}


