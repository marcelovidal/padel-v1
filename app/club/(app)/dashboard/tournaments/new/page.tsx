import Link from "next/link";
import { requireClub } from "@/lib/auth";
import { TournamentCreationWizard } from "@/components/tournaments/TournamentCreationWizard";

export default async function NewTournamentPage() {
  const { club } = await requireClub();

  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-4">
      <div>
        <Link
          href="/club/dashboard/tournaments"
          className="text-sm text-gray-400 hover:text-gray-700"
        >
          ← Torneos del Club
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Nuevo torneo</h1>
        <p className="text-sm text-gray-500">
          Completá los pasos para configurar tu torneo. Podés editar todos los datos después.
        </p>
      </div>

      <div className="rounded-2xl border bg-white p-6">
        <TournamentCreationWizard clubId={club.id} />
      </div>

      <details className="group rounded-2xl border border-blue-100 bg-blue-50">
        <summary className="flex cursor-pointer select-none list-none items-center justify-between p-4 hover:bg-blue-100/50">
          <span className="text-sm font-semibold text-blue-900">¿Cómo funciona un torneo?</span>
          <span className="text-xs text-blue-400 transition-transform group-open:rotate-180">▾</span>
        </summary>
        <div className="px-4 pb-4 text-sm text-blue-900">
          <ol className="ml-5 list-decimal space-y-1">
            <li>Crear torneo con categoria objetivo y configurar si acepta categorias menores.</li>
            <li>Inscribir parejas con su categoria de inscripcion.</li>
            <li>Armar grupos automaticamente (o asignar manualmente).</li>
            <li>Generar fixture round-robin por grupo y agendar cada cruce.</li>
            <li>Cargar resultados para completar la tabla de grupos.</li>
            <li>Generar playoffs (top 2 de cada grupo) y agendar cruces eliminatorios.</li>
          </ol>
        </div>
      </details>
    </div>
  );
}
