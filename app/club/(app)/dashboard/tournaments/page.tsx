import Link from "next/link";
import { requireClub } from "@/lib/auth";
import { TournamentsService } from "@/services/tournaments.service";
import { createTournamentAction } from "@/lib/actions/tournaments.actions";

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
      <div>
        <h1 className="text-2xl font-bold">Torneos del Club</h1>
        <p className="text-sm text-gray-500">
          Crea torneos por categoria, arma grupos, genera fixture, programa partidos y carga resultados.
        </p>
      </div>

      {/* Guia rapida */}
      <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
        <p className="font-semibold">Flujo de un torneo</p>
        <ol className="ml-5 mt-1 list-decimal space-y-1">
          <li>Crear torneo con categoria objetivo y configurar si acepta categorias menores.</li>
          <li>Inscribir parejas con su categoria de inscripcion.</li>
          <li>Armar grupos automaticamente (o asignar manualmente).</li>
          <li>Generar fixture round-robin por grupo y agendar cada cruce.</li>
          <li>Cargar resultados para completar la tabla de grupos.</li>
          <li>Generar playoffs (top 2 de cada grupo) y agendar cruces eliminatorios.</li>
        </ol>
      </section>

      {/* Crear torneo */}
      <section className="rounded-2xl border bg-white p-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-gray-600">Nuevo torneo</h2>
        <form action={createTournamentAction} className="mt-3 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="club_id" value={club.id} />
          <input
            name="name"
            placeholder="Nombre del torneo"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            required
          />
          <input
            name="season_label"
            placeholder="Temporada (ej: Marzo 2026)"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700">Categoria objetivo</label>
            <input
              name="target_category_int"
              type="number"
              min={1}
              max={10}
              placeholder="Ej: 5"
              className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm"
              required
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" name="allow_lower_category" className="rounded" />
            Aceptar categorias menores (ej: 6ta en torneo de 5ta)
          </label>
          <input
            name="description"
            placeholder="Descripcion (opcional)"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm md:col-span-2"
          />
          <div className="md:col-span-2">
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              Crear torneo
            </button>
          </div>
        </form>
      </section>

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
