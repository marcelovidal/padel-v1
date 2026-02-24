import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { resolveAvatarSrc } from "@/lib/avatar-server.utils";
import { ClubService } from "@/services/club.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/UserAvatar";

function valueOrDash(value?: string | number | null) {
  if (value == null) return "-";
  if (typeof value === "string" && value.trim() === "") return "-";
  return String(value);
}

function boolLabel(value: boolean) {
  return value ? "Si" : "No";
}

function initialsFromName(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "CL";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
}

export default async function AdminClubPreviewPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdmin();
  const clubService = new ClubService();
  const club = await clubService.getClubById(params.id);

  if (!club) notFound();

  const avatarData = await resolveAvatarSrc({
    player: {
      avatar_url: club.avatar_url,
      display_name: club.name,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-blue-600">
            Modo vista previa (admin)
          </p>
          <h1 className="text-3xl font-bold mt-1">Preview de Club</h1>
          <p className="text-gray-600">
            Vista read-only para validar como se presenta el perfil y los datos del club.
          </p>
        </div>
        <Link
          href="/admin/club-claims?tab=approved"
          className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
        >
          Volver a Clubes
        </Link>
      </div>

      <Card className="border-blue-100 bg-blue-50/40">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-900">
            Esta vista no impersona sesion de club ni habilita acciones. Es una referencia visual y de contenido para soporte/QA.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Perfil publico del club (preview)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              <UserAvatar
                src={avatarData.src || null}
                initials={avatarData.initials || initialsFromName(club.name)}
                size="lg"
              />
              <div className="min-w-0">
                <h2 className="break-words text-2xl font-black text-gray-900">{club.name}</h2>
                <p className="text-sm text-gray-600">
                  {[club.city, club.region_name || club.region_code].filter(Boolean).join(" · ") ||
                    "Ubicacion no definida"}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-bold text-gray-700">
                    Estado: {club.claim_status}
                  </span>
                  <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-bold text-gray-700">
                    Acceso: {valueOrDash(club.access_type)}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-widest text-gray-500">
                Descripcion
              </p>
              <p className="whitespace-pre-wrap text-sm text-gray-800">
                {club.description?.trim() || "Sin descripcion cargada."}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-gray-100 bg-white p-4">
                <p className="mb-2 text-xs font-black uppercase tracking-widest text-gray-500">
                  Ubicacion
                </p>
                <ul className="space-y-1 text-sm text-gray-800">
                  <li>Pais: {valueOrDash(club.country_code)}</li>
                  <li>Provincia: {valueOrDash(club.region_name || club.region_code)}</li>
                  <li>Ciudad: {valueOrDash(club.city)}</li>
                  <li>Direccion: {valueOrDash(club.address)}</li>
                </ul>
              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-4">
                <p className="mb-2 text-xs font-black uppercase tracking-widest text-gray-500">
                  Infraestructura
                </p>
                <ul className="space-y-1 text-sm text-gray-800">
                  <li>Canchas: {valueOrDash(club.courts_count)}</li>
                  <li>Blindex: {boolLabel(!!club.has_glass)}</li>
                  <li>Cesped sintetico: {boolLabel(!!club.has_synthetic_grass)}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="font-bold text-gray-700">Nombre:</span>{" "}
                {valueOrDash([club.contact_first_name, club.contact_last_name].filter(Boolean).join(" "))}
              </p>
              <p>
                <span className="font-bold text-gray-700">Celular:</span>{" "}
                {valueOrDash(club.contact_phone)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estado de administracion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-800">
              <p>
                <span className="font-bold text-gray-700">Claim status:</span> {valueOrDash(club.claim_status)}
              </p>
              <p>
                <span className="font-bold text-gray-700">Claimed at:</span>{" "}
                {club.claimed_at ? new Date(club.claimed_at).toLocaleString("es-AR") : "-"}
              </p>
              <p>
                <span className="font-bold text-gray-700">Onboarding:</span>{" "}
                {club.onboarding_completed ? "Completo" : "Pendiente"}
              </p>
              <p>
                <span className="font-bold text-gray-700">Actualizado:</span>{" "}
                {club.updated_at ? new Date(club.updated_at).toLocaleString("es-AR") : "-"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Siguiente mejora (pendiente)</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-700">
              Dashboard preview admin del club (analitica) se mantiene pendiente para definir una estrategia segura sin romper las validaciones de ownership de la RPC.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
