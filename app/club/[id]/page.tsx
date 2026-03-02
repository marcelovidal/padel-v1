import { notFound } from "next/navigation";
import Link from "next/link";
import { ClubService } from "@/services/club.service";

function formatSurfaceTypes(surfaceTypes: Record<string, boolean>) {
  const labels: Record<string, string> = {
    blindex: "Blindex",
    cesped_sintetico: "Cesped sintetico",
    cemento: "Cemento",
    ladrillo: "Ladrillo",
  };

  return Object.entries(surfaceTypes || {})
    .filter(([, enabled]) => !!enabled)
    .map(([key]) => labels[key] || key);
}

export default async function PublicClubProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const clubService = new ClubService();
  const club = await clubService.getPublicClubProfile(params.id);

  if (!club) notFound();

  const surfaces = formatSurfaceTypes(club.surface_types || {});

  return (
    <div className="mx-auto max-w-3xl p-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">Perfil Publico Club</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-900">{club.name}</h1>
        <p className="mt-2 text-sm text-gray-600">
          {[club.city, club.region_name || club.region_code, club.country_code].filter(Boolean).join(" - ")}
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Canchas declaradas</p>
            <p className="mt-1 text-2xl font-black text-gray-900">{club.courts_count ?? 0}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Estado</p>
            <p className="mt-1 text-sm font-bold text-gray-900">
              {club.claimed ? "Club reclamado" : "Club sin reclamar"}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Superficies</p>
          {surfaces.length === 0 ? (
            <p className="mt-2 text-sm text-gray-600">Sin datos de superficies cargadas.</p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {surfaces.map((surface) => (
                <span
                  key={surface}
                  className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700"
                >
                  {surface}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/clubs"
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
          >
            Ver mas clubes
          </Link>
          <Link
            href={`/welcome/claim/club?club_id=${club.id}`}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
          >
            Reclamar este club
          </Link>
        </div>
      </div>
    </div>
  );
}
