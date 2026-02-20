"use client";

import { useEffect, useState, useTransition } from "react";
import { GeoSelect } from "@/components/geo/GeoSelect";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { completeClubSignupOnboardingAction } from "@/lib/actions/portal-auth.actions";
import { ClubAccessType } from "@/types/database";

type GeoOption = { id: string; nombre: string };

type ClubCandidate = {
  id: string;
  name: string;
  city: string | null;
  region_name: string | null;
  claim_status: string;
};

async function uploadClubAvatar(supabase: ReturnType<typeof createBrowserSupabase>, userId: string, file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file);
  if (error) throw error;
  return path;
}

export default function ClubSignupWizard({
  onError,
  onInfo,
  externalError,
  externalInfo,
}: {
  onError: (value: string | null) => void;
  onInfo: (value: string | null) => void;
  externalError: string | null;
  externalInfo: string | null;
}) {
  const supabase = createBrowserSupabase();
  const [step, setStep] = useState(1);
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [regionCode, setRegionCode] = useState("");
  const [regionName, setRegionName] = useState("");
  const [city, setCity] = useState("");
  const [cityId, setCityId] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [accessType, setAccessType] = useState<ClubAccessType>("abierta");
  const [courtsCount, setCourtsCount] = useState("1");
  const [hasGlass, setHasGlass] = useState(false);
  const [hasSynthetic, setHasSynthetic] = useState(true);
  const [contactFirst, setContactFirst] = useState("");
  const [contactLast, setContactLast] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [result, setResult] = useState<{ clubId: string; candidates: ClubCandidate[] } | null>(null);

  const [provincias, setProvincias] = useState<GeoOption[]>([]);
  const [localidades, setLocalidades] = useState<GeoOption[]>([]);
  const [loadingGeo, setLoadingGeo] = useState(false);

  useEffect(() => {
    fetch("/api/geo/provincias")
      .then((res) => res.json())
      .then((data) => setProvincias(Array.isArray(data) ? data : []))
      .catch(() => setProvincias([]));
  }, []);

  useEffect(() => {
    if (!regionCode) return;
    setLoadingGeo(true);
    fetch(`/api/geo/localidades?provincia=${regionCode}`)
      .then((res) => res.json())
      .then((data) => setLocalidades(Array.isArray(data) ? data : []))
      .catch(() => setLocalidades([]))
      .finally(() => setLoadingGeo(false));
  }, [regionCode]);

  const canStep1 = name.trim().length >= 3 && !!regionCode && !!cityId && address.trim().length >= 3;
  const canStep2 = description.trim().length >= 8 && Number(courtsCount) >= 0;
  const canStep3 = contactFirst.trim().length >= 2 && contactLast.trim().length >= 2 && contactPhone.trim().length >= 8;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onError(null);
    onInfo(null);
    setResult(null);

    startTransition(async () => {
      const signUp = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            portal: "club",
            club_name: name.trim(),
            contact_name: `${contactFirst.trim()} ${contactLast.trim()}`.trim(),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/welcome?portal=club&mode=login")}`,
        },
      });

      if (signUp.error) {
        onError(signUp.error.message);
        return;
      }

      if (!signUp.data.session) {
        onInfo("Cuenta de club creada. Revisa tu email para confirmar e iniciar sesion.");
        return;
      }

      let avatarPath: string | null = null;
      if (avatarFile) {
        try {
          avatarPath = await uploadClubAvatar(supabase, signUp.data.session.user.id, avatarFile);
        } catch (error: any) {
          onError(`No pudimos subir el logo: ${error?.message || "error inesperado"}`);
          return;
        }
      }

      const onboarding = await completeClubSignupOnboardingAction({
        name: name.trim(),
        country_code: "AR",
        region_code: regionCode,
        region_name: regionName,
        city,
        city_id: cityId,
        address: address.trim(),
        description: description.trim(),
        access_type: accessType,
        courts_count: Number(courtsCount),
        has_glass: hasGlass,
        has_synthetic_grass: hasSynthetic,
        contact_first_name: contactFirst.trim(),
        contact_last_name: contactLast.trim(),
        contact_phone: contactPhone.trim(),
        avatar_url: avatarPath,
      });

      if (!onboarding.success) {
        onError(onboarding.error);
        return;
      }

      setResult({
        clubId: onboarding.clubId,
        candidates: onboarding.claimCandidates || [],
      });
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-gray-900">Crear cuenta club</h2>
        <span className="text-xs font-black uppercase tracking-widest text-gray-500">Paso {step} de 4</span>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <input className="w-full rounded-xl border border-gray-300 px-4 py-3" placeholder="Nombre del club*" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <GeoSelect
              label="Provincia*"
              placeholder="Elegi provincia"
              options={provincias}
              value={regionCode}
              onChange={(opt) => {
                setRegionCode(opt?.id || "");
                setRegionName(opt?.nombre || "");
                setCityId("");
                setCity("");
              }}
            />
            <GeoSelect
              label="Ciudad*"
              placeholder="Busca ciudad"
              options={localidades}
              value={cityId}
              isLoading={loadingGeo}
              disabled={!regionCode}
              onChange={(opt) => {
                setCityId(opt?.id || "");
                setCity(opt?.nombre || "");
              }}
            />
          </div>
          <input className="w-full rounded-xl border border-gray-300 px-4 py-3" placeholder="Direccion*" value={address} onChange={(e) => setAddress(e.target.value)} />
          <button type="button" disabled={!canStep1} onClick={() => setStep(2)} className="w-full rounded-xl bg-blue-600 px-4 py-3 text-white font-black disabled:opacity-60">
            Paso 2
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <textarea className="w-full rounded-xl border border-gray-300 px-4 py-3 min-h-24" placeholder="Descripcion del club*" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setAccessType("abierta")} className={`rounded-xl border-2 py-2 font-semibold ${accessType === "abierta" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"}`}>
              Abierta
            </button>
            <button type="button" onClick={() => setAccessType("cerrada")} className={`rounded-xl border-2 py-2 font-semibold ${accessType === "cerrada" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"}`}>
              Cerrada
            </button>
          </div>
          <input type="number" min={0} className="w-full rounded-xl border border-gray-300 px-4 py-3" placeholder="Cantidad de canchas*" value={courtsCount} onChange={(e) => setCourtsCount(e.target.value)} />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={hasGlass} onChange={(e) => setHasGlass(e.target.checked)} />
            Canchas con blindex
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={hasSynthetic} onChange={(e) => setHasSynthetic(e.target.checked)} />
            Cesped sintetico
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setStep(1)} className="rounded-xl border border-gray-300 px-4 py-3 font-bold text-gray-700">
              Volver
            </button>
            <button type="button" disabled={!canStep2} onClick={() => setStep(3)} className="rounded-xl bg-blue-600 px-4 py-3 font-black text-white disabled:opacity-60">
              Paso 3
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <input className="w-full rounded-xl border border-gray-300 px-4 py-3" placeholder="Nombre contacto*" value={contactFirst} onChange={(e) => setContactFirst(e.target.value)} />
          <input className="w-full rounded-xl border border-gray-300 px-4 py-3" placeholder="Apellido contacto*" value={contactLast} onChange={(e) => setContactLast(e.target.value)} />
          <input className="w-full rounded-xl border border-gray-300 px-4 py-3" placeholder="Celular contacto*" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Logo del club (opcional)</label>
            <input
              type="file"
              accept="image/*"
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setAvatarFile(file);
                setAvatarPreview(file ? URL.createObjectURL(file) : null);
              }}
            />
            {avatarPreview && (
              <img src={avatarPreview} alt="Preview logo club" className="h-20 w-20 rounded-xl border border-gray-200 object-cover" />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setStep(2)} className="rounded-xl border border-gray-300 px-4 py-3 font-bold text-gray-700">
              Volver
            </button>
            <button type="button" disabled={!canStep3} onClick={() => setStep(4)} className="rounded-xl bg-blue-600 px-4 py-3 font-black text-white disabled:opacity-60">
              Paso 4
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <input type="email" required className="w-full rounded-xl border border-gray-300 px-4 py-3" placeholder="Email*" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" required className="w-full rounded-xl border border-gray-300 px-4 py-3" placeholder="Contrasena*" value={password} onChange={(e) => setPassword(e.target.value)} />

          {externalError && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{externalError}</p>}
          {externalInfo && <p className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">{externalInfo}</p>}

          {result ? (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 space-y-2">
              {result.candidates.length > 0 ? (
                <p className="text-sm font-bold text-green-800">
                  Existe un posible club con el mismo nombre. Los administradores de la app se comunicaran con usted para verificar la informacion y aprobar su solicitud.
                </p>
              ) : (
                <p className="text-sm font-bold text-green-800">
                  Su solicitud de creacion de club en la aplicacion esta en proceso de validacion. Los administradores se pondran en contacto con usted para verificar la informacion y finalizar el proceso de publicacion del club. Gracias.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setStep(3)} className="rounded-xl border border-gray-300 px-4 py-3 font-bold text-gray-700">
                Volver
              </button>
              <button type="submit" disabled={pending} className="rounded-xl bg-blue-600 px-4 py-3 font-black text-white disabled:opacity-60">
                {pending ? "Creando..." : "Crear cuenta club"}
              </button>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
