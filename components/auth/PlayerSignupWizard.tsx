"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GeoSelect } from "@/components/geo/GeoSelect";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { completePlayerSignupOnboardingAction } from "@/lib/actions/portal-auth.actions";
import { useGeoLocation } from "@/hooks/useGeoLocation";

type PlayerPosition = "drive" | "reves" | "cualquiera";

type PlayerCandidate = {
  id: string;
  display_name: string;
  city: string | null;
  region_name: string | null;
};

type GeoOption = { id: string; nombre: string };

async function uploadPlayerAvatar(supabase: ReturnType<typeof createBrowserSupabase>, userId: string, file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file);
  if (error) throw error;
  return path;
}

export default function PlayerSignupWizard({
  nextPath,
  onError,
  onInfo,
  externalError,
  externalInfo,
}: {
  nextPath: string;
  onError: (value: string | null) => void;
  onInfo: (value: string | null) => void;
  externalError: string | null;
  externalInfo: string | null;
}) {
  const router = useRouter();
  const supabase = createBrowserSupabase();
  const [step, setStep] = useState(1);
  const [pending, startTransition] = useTransition();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nick, setNick] = useState("");
  const [phone, setPhone] = useState("");
  const [regionCode, setRegionCode] = useState("");
  const [regionName, setRegionName] = useState("");
  const [cityId, setCityId] = useState("");
  const [city, setCity] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [position, setPosition] = useState<PlayerPosition>("cualquiera");
  const [category, setCategory] = useState(7);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<{ success: boolean; candidates: PlayerCandidate[] } | null>(null);

  const [provincias, setProvincias] = useState<GeoOption[]>([]);
  const [provinciasError, setProvinciasError] = useState(false);
  const [localidades, setLocalidades] = useState<GeoOption[]>([]);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [geoHint, setGeoHint] = useState<string | null>(null);
  const [pendingCity, setPendingCity] = useState<GeoOption | null>(null);

  const { detect: detectLocation, status: geoStatus, error: geoError } = useGeoLocation();

  function loadProvincias() {
    setProvinciasError(false);
    fetch("/api/geo/provincias")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setProvincias(data);
        } else {
          setProvinciasError(true);
        }
      })
      .catch(() => setProvinciasError(true));
  }

  useEffect(() => { loadProvincias(); }, []);

  useEffect(() => {
    if (!regionCode) return;
    setLoadingGeo(true);
    fetch(`/api/geo/localidades?provincia=${regionCode}`)
      .then((res) => res.json())
      .then((data) => setLocalidades(Array.isArray(data) ? data : []))
      .catch(() => setLocalidades([]))
      .finally(() => setLoadingGeo(false));
  }, [regionCode]);

  // When localidades finish loading after GPS detection, auto-select the detected city.
  // We match by ID first, then by name as fallback (municipio IDs may differ from localidad IDs).
  useEffect(() => {
    if (!pendingCity || loadingGeo || localidades.length === 0) return;
    const match =
      localidades.find((l) => l.id === pendingCity.id) ||
      localidades.find((l) => l.nombre.toLowerCase() === pendingCity.nombre.toLowerCase());
    if (match) {
      setCityId(match.id);
      setCity(match.nombre);
    }
    setPendingCity(null);
  }, [localidades, loadingGeo, pendingCity]);

  async function handleDetectLocation() {
    setGeoHint(null);
    const result = await detectLocation();
    if (!result) return;

    if (result.provincia) {
      setRegionCode(result.provincia.id);
      setRegionName(result.provincia.nombre);
      setCityId("");
      setCity("");
    }

    if (result.ciudad) {
      // localidades se recarga por el useEffect de regionCode.
      // Guardamos la ciudad detectada para setearla una vez que carguen.
      setPendingCity(result.ciudad);
      setGeoHint(`Ubicación detectada: ${result.ciudad.nombre}, ${result.provincia?.nombre}. Podés cambiarlo si no es correcto.`);
    }
  }

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 80 }, (_, i) => current - i - 10);
  }, []);

  // Geo is valid if either: dropdown resolved (regionCode + cityId)
  // OR fallback text mode (regionName + city both filled manually)
  const geoValid = (!!regionCode && !!cityId) || (regionName.trim().length >= 2 && city.trim().length >= 2);

  const canStep1 =
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 2 &&
    nick.trim().length >= 2 &&
    phone.trim().length >= 8 &&
    geoValid;

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
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
            portal: "player",
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });

      if (signUp.error) {
        onError(signUp.error.message);
        return;
      }

      if (!signUp.data.session) {
        onInfo("Cuenta creada. Revisa tu email para confirmar e iniciar sesion.");
        return;
      }

      let avatarPath: string | null = null;
      if (avatarFile) {
        try {
          avatarPath = await uploadPlayerAvatar(supabase, signUp.data.session.user.id, avatarFile);
        } catch (error: any) {
          onError(`No pudimos subir el avatar: ${error?.message || "error inesperado"}`);
          return;
        }
      }

      const onboarding = await completePlayerSignupOnboardingAction({
        display_name: nick.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        position,
        category,
        country_code: "AR",
        region_code: regionCode,
        region_name: regionName,
        city,
        city_id: cityId,
        birth_year: birthYear ? Number(birthYear) : null,
        avatar_url: avatarPath,
      });

      if (!onboarding.success) {
        onError(onboarding.error);
        return;
      }

      setResult({ success: true, candidates: onboarding.claimCandidates || [] });
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-gray-900">Crear cuenta jugador</h2>
        <span className="text-xs font-black uppercase tracking-widest text-gray-500">Paso {step} de 3</span>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="rounded-xl border border-gray-300 px-4 py-3" placeholder="Nombre*" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <input className="rounded-xl border border-gray-300 px-4 py-3" placeholder="Apellido*" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <input className="w-full rounded-xl border border-gray-300 px-4 py-3" placeholder="Nick*" value={nick} onChange={(e) => setNick(e.target.value)} />
          <input className="w-full rounded-xl border border-gray-300 px-4 py-3" placeholder="Celular (WhatsApp)*" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={geoStatus === "loading"}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60 transition-colors"
            >
              {geoStatus === "loading" ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Detectando ubicacion...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                  </svg>
                  Usar mi ubicacion
                </>
              )}
            </button>
            {geoHint && (
              <p className="text-xs text-blue-600 font-medium px-1">{geoHint}</p>
            )}
            {geoError && (
              <p className="text-xs text-amber-600 font-medium px-1">{geoError}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {provinciasError ? (
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Provincia* <span className="text-xs text-amber-600 font-normal">(ingresá manualmente)</span>
                </label>
                <div className="flex gap-1">
                  <input
                    className="flex-1 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Ej: Río Negro"
                    value={regionName}
                    onChange={(e) => {
                      setRegionName(e.target.value);
                      setRegionCode("");
                      setCityId("");
                      setCity("");
                    }}
                  />
                  <button type="button" onClick={loadProvincias} className="rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50">
                    ↺
                  </button>
                </div>
              </div>
            ) : (
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
            )}

            {/* City: dropdown if province resolved via API, text input otherwise */}
            {!provinciasError && regionCode ? (
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
            ) : (
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Ciudad* {provinciasError && <span className="text-xs text-amber-600 font-normal">(ingresá manualmente)</span>}
                </label>
                <input
                  className="w-full rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Ej: General Roca"
                  value={city}
                  disabled={!provinciasError && !regionCode && !regionName}
                  onChange={(e) => {
                    setCity(e.target.value);
                    setCityId("");
                  }}
                />
              </div>
            )}
          </div>

          {provinciasError && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              El servicio de ubicaciones no esta disponible ahora. Escribi tu provincia y ciudad — el sistema las verificara automaticamente cuando te logues.
            </p>
          )}
          <select className="w-full rounded-xl border border-gray-300 px-4 py-3" value={birthYear} onChange={(e) => setBirthYear(e.target.value)}>
            <option value="">Año de nacimiento (opcional)</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <button type="button" disabled={!canStep1} onClick={() => setStep(2)} className="w-full rounded-xl bg-blue-600 px-4 py-3 text-white font-black disabled:opacity-60">
            Paso 2
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-bold text-gray-700">Posicion*</p>
            <div className="grid grid-cols-3 gap-2">
              {(["drive", "reves", "cualquiera"] as PlayerPosition[]).map((pos) => (
                <button
                  type="button"
                  key={pos}
                  onClick={() => setPosition(pos)}
                  className={`rounded-xl border-2 py-2 font-semibold capitalize ${position === pos ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"}`}
                >
                  {pos === "cualquiera" ? "Ambas" : pos}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-bold text-gray-700">Categoria*</p>
            <div className="grid grid-cols-7 gap-2">
              {[7, 6, 5, 4, 3, 2, 1].map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`rounded-xl border-2 py-2 font-black ${category === cat ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 text-gray-600"}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Avatar (opcional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setAvatarFile(file);
                setAvatarPreview(file ? URL.createObjectURL(file) : null);
              }}
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
            />
            {avatarPreview && <img src={avatarPreview} alt="Preview avatar" className="h-20 w-20 rounded-full border border-gray-200 object-cover" />}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setStep(1)} className="rounded-xl border border-gray-300 px-4 py-3 font-bold text-gray-700">
              Volver
            </button>
            <button type="button" onClick={() => setStep(3)} className="rounded-xl bg-blue-600 px-4 py-3 font-black text-white">
              Paso 3
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <input type="email" required className="w-full rounded-xl border border-gray-300 px-4 py-3" placeholder="Email*" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" required className="w-full rounded-xl border border-gray-300 px-4 py-3" placeholder="Contrasena*" value={password} onChange={(e) => setPassword(e.target.value)} />

          {externalError && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{externalError}</p>}
          {externalInfo && <p className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">{externalInfo}</p>}

          {result?.success ? (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 space-y-2">
              <p className="text-sm font-bold text-green-800">Perfil creado correctamente.</p>
              {result.candidates.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-green-900 font-semibold">Detectamos perfiles similares cargados por otros jugadores:</p>
                  <ul className="space-y-1">
                    {result.candidates.map((candidate) => (
                      <li key={candidate.id} className="text-xs text-green-900">
                        {candidate.display_name}
                        {candidate.city ? ` - ${candidate.city}` : ""}
                        {candidate.region_name ? ` (${candidate.region_name})` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  router.replace(nextPath);
                  router.refresh();
                }}
                className="w-full rounded-xl bg-green-600 px-4 py-2.5 text-white text-sm font-black"
              >
                Ir a PASALA
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setStep(2)} className="rounded-xl border border-gray-300 px-4 py-3 font-bold text-gray-700">
                Volver
              </button>
              <button type="submit" disabled={pending} className="rounded-xl bg-blue-600 px-4 py-3 font-black text-white disabled:opacity-60">
                {pending ? "Creando..." : "Crear cuenta jugador"}
              </button>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
