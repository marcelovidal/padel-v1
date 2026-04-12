import { requireClub } from "@/lib/auth";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { GraduationCap } from "lucide-react";

const ESPECIALIDAD_LABEL: Record<string, string> = {
  iniciacion: "Iniciación",
  tecnica: "Técnica",
  competicion: "Competición",
  alto_rendimiento: "Alto rendimiento",
  todos_los_niveles: "Todos los niveles",
};

const DAY_LABEL = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export default async function ClubEntrenadoresPage() {
  const { club } = await requireClub();
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Coach profiles con primary_club_id = club.id
  const { data: coaches } = await (supabase as any)
    .from("coach_profiles")
    .select(
      `id, especialidad, activo,
       player:players(id, display_name, avatar_url, pasala_index),
       coach_availability(day_of_week, activo)`
    )
    .eq("primary_club_id", club.id)
    .eq("activo", true)
    .order("created_at");

  // Alumnos activos por coach
  const coachIds: string[] = (coaches ?? []).map((c: any) => c.id);
  let alumnosCounts: Record<string, number> = {};

  if (coachIds.length > 0) {
    const { data: alumnosRows } = await (supabase as any)
      .from("coach_players")
      .select("coach_id")
      .in("coach_id", coachIds)
      .eq("status", "active");

    for (const row of alumnosRows ?? []) {
      alumnosCounts[row.coach_id] = (alumnosCounts[row.coach_id] ?? 0) + 1;
    }
  }

  const list = coaches ?? [];

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900">Entrenadores</h1>
        <p className="mt-1 text-sm text-slate-500">
          Entrenadores que tienen este club como su club principal.
        </p>
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <GraduationCap className="w-10 h-10 text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-500">
            Ningún entrenador ha registrado este club como su club principal.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((coach: any) => {
            const player = coach.player;
            const initials = (player?.display_name ?? "?")
              .trim()
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((w: string) => w[0])
              .join("")
              .toUpperCase();

            const activeDays: number[] = (coach.coach_availability ?? [])
              .filter((a: any) => a.activo)
              .map((a: any) => a.day_of_week)
              .sort((a: number, b: number) => a - b);

            const alumnos = alumnosCounts[coach.id] ?? 0;

            return (
              <div
                key={coach.id}
                className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <UserAvatar
                    src={player?.avatar_url ?? null}
                    initials={initials}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {player?.display_name ?? "—"}
                    </p>
                    {coach.especialidad && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {ESPECIALIDAD_LABEL[coach.especialidad] ?? coach.especialidad}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Índice PASALA:{" "}
                    <span className="font-semibold text-slate-900">
                      {player?.pasala_index != null ? player.pasala_index : "—"}
                    </span>
                  </span>
                  <span>
                    Alumnos activos:{" "}
                    <span className="font-semibold text-slate-900">{alumnos}</span>
                  </span>
                </div>

                {activeDays.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Disponibilidad
                    </p>
                    <div className="flex gap-1 flex-wrap">
                      {activeDays.map((d) => (
                        <span
                          key={d}
                          className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700"
                        >
                          {DAY_LABEL[d]}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
