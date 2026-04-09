import { notFound } from "next/navigation";
import { requirePlayer } from "@/lib/auth";
import { CoachService } from "@/services/coach.service";
import { CoachBookingRequestForm } from "@/components/coach/CoachBookingRequestForm";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Badge } from "@/components/ui/Badge";
import { MapPin, GraduationCap, DollarSign, CalendarDays, ChevronLeft } from "lucide-react";
import { formatCityWithProvinceAbbr } from "@/lib/utils/location";
import Link from "next/link";

const ESPECIALIDAD_LABELS: Record<string, string> = {
  iniciacion:        "Iniciación",
  tecnica:           "Técnica",
  competicion:       "Competición",
  alto_rendimiento:  "Alto rendimiento",
  todos_los_niveles: "Todos los niveles",
};

const DAYS_ES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function pasalaLevel(index: number | null) {
  if (!index) return { label: "INICIAL",      className: "bg-slate-100 text-slate-700 border border-slate-200" };
  if (index >= 80) return { label: "ELITE",    className: "bg-amber-50 text-amber-700 border border-amber-200" };
  if (index >= 65) return { label: "PRO",      className: "bg-violet-50 text-violet-700 border border-violet-200" };
  if (index >= 50) return { label: "COMPETITIVO", className: "bg-blue-50 text-blue-700 border border-blue-200" };
  if (index >= 30) return { label: "AMATEUR",  className: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
  return { label: "INICIAL", className: "bg-slate-100 text-slate-700 border border-slate-200" };
}

export default async function PlayerCoachProfilePage({
  params,
}: {
  params: { coachId: string };
}) {
  await requirePlayer();

  const service = new CoachService();
  let coach;
  try {
    coach = await service.getPublicProfile(params.coachId);
  } catch {
    notFound();
  }

  const level = pasalaLevel(coach.pasala_index);

  const byDay = coach.availability.reduce<Record<number, typeof coach.availability>>(
    (acc, slot) => {
      if (!acc[slot.day_of_week]) acc[slot.day_of_week] = [];
      acc[slot.day_of_week].push(slot);
      return acc;
    },
    {}
  );

  return (
    <div className="container mx-auto max-w-2xl p-4 py-8 space-y-6">
      {/* Back */}
      <Link
        href="/player/players"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Volver al directorio
      </Link>

      {/* Hero */}
      <div className="rounded-[32px] border border-gray-100 bg-white p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <UserAvatar src={coach.avatar_url} initials={coach.display_name.slice(0, 2)} size="lg" />
        <div className="flex-1 text-center sm:text-left space-y-3">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-blue-600 flex items-center justify-center sm:justify-start gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" />
              Entrenador certificado PASALA
            </p>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight mt-1">{coach.display_name}</h1>
          </div>

          {(coach.city || coach.region_name) && (
            <p className="flex items-center justify-center sm:justify-start gap-1.5 text-sm text-gray-500">
              <MapPin className="h-4 w-4 text-gray-400" />
              {formatCityWithProvinceAbbr(coach.city, coach.region_code, coach.region_name)}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-1.5">
              <span className="text-xs font-black text-blue-700">
                PASALA {coach.pasala_index != null ? coach.pasala_index.toFixed(1) : "—"}
              </span>
            </div>
            <Badge className={level.className}>{level.label}</Badge>
            {coach.especialidad && (
              <Badge className="bg-purple-50 text-purple-700 border border-purple-200">
                {ESPECIALIDAD_LABELS[coach.especialidad] ?? coach.especialidad}
              </Badge>
            )}
          </div>

          {coach.tarifa_por_hora != null && (
            <p className="flex items-center justify-center sm:justify-start gap-1.5 text-sm font-bold text-gray-700">
              <DollarSign className="h-4 w-4 text-gray-400" />
              ${coach.tarifa_por_hora.toLocaleString("es-AR")} / hora
            </p>
          )}
        </div>
      </div>

      {/* Bio */}
      {coach.bio && (
        <div className="rounded-[28px] border border-gray-100 bg-white p-6">
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Sobre mí</h2>
          <p className="text-sm text-gray-700 leading-relaxed">{coach.bio}</p>
        </div>
      )}

      {/* Availability */}
      {coach.availability.length > 0 && (
        <div className="rounded-[28px] border border-gray-100 bg-white p-6">
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            Disponibilidad habitual
          </h2>
          <div className="space-y-3">
            {Object.entries(byDay)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([day, daySlots]) => (
                <div key={day} className="flex items-start gap-3">
                  <span className="w-20 shrink-0 text-xs font-bold text-gray-600">{DAYS_ES[Number(day)]}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {daySlots.map((slot, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-lg bg-blue-50 border border-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700"
                      >
                        {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                        <span className="ml-1 text-[10px] text-blue-400">· {slot.slot_duration_minutes}min</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Booking form */}
      <div className="rounded-[28px] border border-blue-100 bg-white p-6 space-y-4">
        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-blue-600 flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            Solicitar clase
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Elegí fecha y hora — {coach.display_name} confirmará a la brevedad.
          </p>
        </div>
        <CoachBookingRequestForm
          coachId={coach.id}
          coachName={coach.display_name}
          availability={coach.availability}
        />
      </div>
    </div>
  );
}
