import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClubService } from "@/services/club.service";
import { ClubClaimRequestForm } from "@/components/clubs/ClubClaimRequestForm";

export default async function ClubClaimPage({
  searchParams,
}: {
  searchParams: { club_id?: string; next?: string };
}) {
  const clubId = (searchParams.club_id || "").trim();
  const nextPath = searchParams.next || "/player";

  if (!clubId) {
    return (
      <div className="min-h-screen bg-gray-50 px-6 py-12">
        <div className="max-w-xl mx-auto bg-white rounded-3xl border border-gray-100 p-8 text-center space-y-4">
          <h1 className="text-2xl font-black text-gray-900">No encontramos el club a reclamar</h1>
          <p className="text-gray-600">Vuelve al link del partido o al inicio para intentarlo otra vez.</p>
          <Link href="/welcome" className="inline-block text-blue-600 font-bold hover:text-blue-700">
            Ir a bienvenida
          </Link>
        </div>
      </div>
    );
  }

  const selfParams = new URLSearchParams();
  selfParams.set("club_id", clubId);
  if (searchParams.next) selfParams.set("next", searchParams.next);
  const selfPath = `/welcome/claim/club?${selfParams.toString()}`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/welcome?next=${encodeURIComponent(selfPath)}`);
  }

  const { data: player } = await (supabase
    .from("players")
    .select("id,onboarding_completed,phone")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle() as any);

  if (!player || !player.onboarding_completed) {
    redirect(`/welcome/onboarding?next=${encodeURIComponent(selfPath)}`);
  }

  const clubService = new ClubService();
  const club = await clubService.getClubById(clubId);

  if (!club) {
    return (
      <div className="min-h-screen bg-gray-50 px-6 py-12">
        <div className="max-w-xl mx-auto bg-white rounded-3xl border border-gray-100 p-8 text-center space-y-4">
          <h1 className="text-2xl font-black text-gray-900">No encontramos ese club</h1>
          <p className="text-gray-600">El club puede haber sido eliminado o no estar disponible.</p>
          <Link href={nextPath} className="inline-block text-blue-600 font-bold hover:text-blue-700">
            Volver
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-3xl border border-gray-100 p-8 space-y-4">
          <p className="text-xs font-black uppercase tracking-widest text-blue-600">Claim de club</p>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Solicitar reclamo del club</h1>
          <p className="text-gray-600 font-medium">
            Si gestionas este club, envia tu solicitud y el equipo de PASALA la revisa antes de aprobarla.
          </p>
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-lg font-bold text-gray-900">{club.name}</p>
            <p className="text-sm text-gray-500">
              {club.city || "Sin ciudad"}
              {club.region_name ? ` (${club.region_name})` : club.region_code ? ` (${club.region_code})` : ""}
            </p>
            <div className="mt-2">
              {club.claim_status === "unclaimed" && (
                <span className="inline-flex items-center text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                  Reclamable
                </span>
              )}
              {club.claim_status === "pending" && (
                <span className="inline-flex items-center text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                  Solicitud en revision
                </span>
              )}
              {club.claim_status === "claimed" && (
                <span className="inline-flex items-center text-[10px] font-black uppercase tracking-widest text-gray-700 bg-gray-100 border border-gray-200 rounded-full px-2 py-0.5">
                  Ya reclamado
                </span>
              )}
            </div>
          </div>
        </div>

        {club.claim_status === "claimed" ? (
          <div className="bg-white rounded-3xl border border-gray-100 p-8 space-y-4 text-center">
            <p className="text-gray-700 font-medium">Este club ya tiene un administrador asignado.</p>
            <Link href={nextPath} className="inline-block rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700">
              Volver
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-gray-100 p-8">
            <ClubClaimRequestForm
              clubId={club.id}
              clubName={club.name}
              defaultPhone={player?.phone || ""}
              nextPath={nextPath}
            />
          </div>
        )}
      </div>
    </div>
  );
}
