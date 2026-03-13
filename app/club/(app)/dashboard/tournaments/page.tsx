import Link from "next/link";
import { requireClub } from "@/lib/auth";
import { TournamentsService } from "@/services/tournaments.service";

function statusLabel(status: "draft" | "active" | "finished") {
  if (status === "draft") return "Borrador";
  if (status === "active") return "Activo";
  return "Finalizado";
}

export default async function ClubTournamentsPage() {
  const { club } = await requireClub();
  const service = new TournamentsService();
  const tournaments = await service.listClubTournaments(club.id);

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Torneos del Club</h1>
          <p className="text-sm text-gray-500">
            Crea torneos por categoria, arma grupos, genera fixture, programa partidos y carga resultados.
          </p>
        </div>
        <Link
          href="/club/dashboard/tournaments/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + Nuevo torneo
        </Link>
      </div>

      {/* Guia rapida */}
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

      {/* Lista de torneos */}
      <section className="rounded-2xl border bg-white p-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-gray-600">Torneos registrados</h2>
        {tournaments.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">Todavia no creaste torneos para este club.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {tournaments.map((t) => (
              <div key={t.id} className="rounded-xl border border-gray-100 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-gray-900">{t.name}</p>
                    <p className="text-sm text-gray-500">
                      {t.season_label || "Sin temporada"} · Categoria {t.target_category_int}
                      {t.allow_lower_category ? " (acepta menores)" : ""} · {statusLabel(t.status)}
                    </p>
                  </div>
                  <Link
                    href={`/club/dashboard/tournaments/${t.id}`}
                    className="rounded-lg border border-blue-200 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                  >
                    Administrar
                  </Link>
                </div>
                {t.description ? <p className="mt-2 text-sm text-gray-700">{t.description}</p> : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
