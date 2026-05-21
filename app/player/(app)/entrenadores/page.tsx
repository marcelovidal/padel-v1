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
  if (!index) return { label: "INICIAL",       className: "bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border-soft)]" };
  if (index >= 80) return { label: "ELITE",    className: "bg-amber-50 text-amber-700 border border-amber-200" };
  if (index >= 65) return { label: "PRO",      className: "bg-violet-50 text-violet-700 border border-violet-200" };
  if (index >= 50) return { label: "COMPETITIVO", className: "bg-blue-50 text-blue-700 border border-blue-200" };
  if (index >= 30) return { label: "AMATEUR",  className: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
  return { label: "INICIAL", className: "bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border-soft)]" };
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
        <h1 className="text-3xl font-black uppercase tracking-tighter text-[var(--text-primary)]">Entrenadores</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">Encontrá tu entrenador y reservá una clase</p>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-2">
        <select
          name="especialidad"
          defaultValue={searchParams.especialidad || ""}
          className="h-10 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] px-3 text-sm font-semibold text-[var(--text-primary)]"
        >
          <option value="">Especialidad</option>
          {Object.entries(ESPECIALIDAD_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <button
          type="submit"
          className="h-10 px-4 rounded-xl bg-brand-azul text-white text-xs font-black uppercase tracking-wide hover:bg-brand-azul/90"
        >
          Filtrar
        </button>
        {searchParams.especialidad && (
          <Link
            href="/player/entrenadores"
            className="h-10 px-4 rounded-xl border border-[var(--border-soft)] text-sm font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] flex items-center"
          >
            Limpiar
          </Link>
        )}
      </form>

      {/* Grid */}
      {coaches.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[var(--border-soft)] bg-[var(--bg-card)] p-16 text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--bg-elevated)]">
            <GraduationCap className="h-8 w-8 text-[var(--text-faint)]" />
          </div>
          <p className="font-bold text-[var(--text-primary)]">Sin entrenadores disponibles</p>
          <p className="text-sm text-[var(--text-muted)]">Probá con otro filtro</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {coaches.map((coach) => {
            const level = pasalaLevel(coach.pasala_index);
            return (
              <Link
                key={coach.id}
                href={`/player/entrenadores/${coach.id}`}
                className="rounded-[24px] border border-[var(--border-soft)] bg-[var(--bg-card)] p-5 hover:border-brand-azul/30 hover:shadow-sm transition-all space-y-4"
              >
                {/* Avatar + name */}
                <div className="flex items-center gap-3">
                  <UserAvatar
                    src={coach.avatar_url}
                    initials={coach.display_name.slice(0, 2)}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-[var(--text-primary)] truncate">{coach.display_name}</p>
                    {(coach.city || coach.region_name) && (
                      <p className="text-xs text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
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
                  <div className="rounded-lg border border-brand-azul/20 bg-[var(--pill-blue-bg)] px-2 py-0.5">
                    <span className="text-[11px] font-black text-brand-azul">
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
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span className="truncate">{coach.primary_club_name ?? ""}</span>
                  {coach.tarifa_por_hora != null && (
                    <span className="flex items-center gap-0.5 font-semibold text-[var(--text-primary)] shrink-0 ml-2">
                      <DollarSign className="h-3 w-3" />
                      {coach.tarifa_por_hora.toLocaleString("es-AR")}/h
                    </span>
                  )}
                </div>

                {/* CTA */}
                <div className="pt-1">
                  <span className="block w-full text-center py-2 rounded-xl bg-brand-azul text-white text-xs font-black uppercase tracking-widest">
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
