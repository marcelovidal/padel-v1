import { requirePlayer } from "@/lib/auth";
import { CoachService } from "@/services/coach.service";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Badge } from "@/components/ui/Badge";
import { MapPin, GraduationCap, DollarSign } from "lucide-react";
import { formatCityWithProvinceAbbr } from "@/lib/utils/location";
import Link from "next/link";

const ESPECIALIDAD_LABELS: Record<string, string> = {
  iniciacion:        "Iniciación",
  tecnica:           "Técnica",
  competicion:       "Competición",
  alto_rendimiento:  "Alto rendimiento",
  todos_los_niveles: "Todos los niveles",
};

function pasalaLevel(index: number | null) {
  if (!index) return { label: "INICIAL",       className: "bg-slate-100 text-slate-700 border border-slate-200" };
  if (index >= 80) return { label: "ELITE",    className: "bg-amber-50 text-amber-700 border border-amber-200" };
  if (index >= 65) return { label: "PRO",      className: "bg-violet-50 text-violet-700 border border-violet-200" };
  if (index >= 50) return { label: "COMPETITIVO", className: "bg-blue-50 text-blue-700 border border-blue-200" };
  if (index >= 30) return { label: "AMATEUR",  className: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
  return { label: "INICIAL", className: "bg-slate-100 text-slate-700 border border-slate-200" };
}

export default async function EntrenadoresPage({
  searchParams,
}: {
  searchParams: { especialidad?: string; city?: string };
}) {
  await requirePlayer();

  const coachService = new CoachService();
  const { coaches } = await coachService.getAvailableCoaches({
    especialidad: searchParams.especialidad || undefined,
    limit: 48,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tighter text-gray-900">Entrenadores</h1>
        <p className="text-sm text-gray-500 mt-0.5">Encontrá tu entrenador y reservá una clase</p>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-2">
        <select
          name="especialidad"
          defaultValue={searchParams.especialidad || ""}
          className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700"
        >
          <option value="">Especialidad</option>
          {Object.entries(ESPECIALIDAD_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <button
          type="submit"
          className="h-10 px-4 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-wide hover:bg-blue-700"
        >
          Filtrar
        </button>
        {searchParams.especialidad && (
          <Link
            href="/player/entrenadores"
            className="h-10 px-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 flex items-center"
          >
            Limpiar
          </Link>
        )}
      </form>

      {/* Grid */}
      {coaches.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-16 text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gray-50">
            <GraduationCap className="h-8 w-8 text-gray-300" />
          </div>
          <p className="font-bold text-gray-900">Sin entrenadores disponibles</p>
          <p className="text-sm text-gray-500">Probá con otro filtro</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {coaches.map((coach) => {
            const level = pasalaLevel(coach.pasala_index);
            return (
              <Link
                key={coach.id}
                href={`/player/entrenadores/${coach.id}`}
                className="rounded-[24px] border border-gray-100 bg-white p-5 hover:border-blue-200 hover:shadow-sm transition-all space-y-4"
              >
                {/* Avatar + name */}
                <div className="flex items-center gap-3">
                  <UserAvatar
                    src={coach.avatar_url}
                    initials={coach.display_name.slice(0, 2)}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">{coach.display_name}</p>
                    {(coach.city || coach.region_name) && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {formatCityWithProvinceAbbr(coach.city, coach.region_code, coach.region_name)}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-1.5">
                  <div className="rounded-lg border border-blue-100 bg-blue-50 px-2 py-0.5">
                    <span className="text-[11px] font-black text-blue-700">
                      PASALA {coach.pasala_index != null ? coach.pasala_index.toFixed(1) : "—"}
                    </span>
                  </div>
                  <Badge className={level.className}>{level.label}</Badge>
                  {coach.especialidad && (
                    <Badge className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px]">
                      {ESPECIALIDAD_LABELS[coach.especialidad] ?? coach.especialidad}
                    </Badge>
                  )}
                </div>

                {/* Club + tarifa */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="truncate">{coach.primary_club_name ?? ""}</span>
                  {coach.tarifa_por_hora != null && (
                    <span className="flex items-center gap-0.5 font-semibold text-gray-700 shrink-0 ml-2">
                      <DollarSign className="h-3 w-3" />
                      {coach.tarifa_por_hora.toLocaleString("es-AR")}/h
                    </span>
                  )}
                </div>

                {/* CTA */}
                <div className="pt-1">
                  <span className="block w-full text-center py-2 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest">
                    Ver perfil y reservar
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
