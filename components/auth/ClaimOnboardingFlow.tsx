"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { finalizeClaimFlowAction } from "@/lib/actions/claim.actions";
import { GeoSelect } from "@/components/geo/GeoSelect";
import AvatarUploader from "@/components/player/AvatarUploader";

type ClaimOnboardingFlowProps = {
  targetPlayerId: string;
  matchId?: string;
  nextPath?: string;
  targetName: string;
  targetCity?: string | null;
  initialAuthenticated: boolean;
};

type AuthMode = "login" | "signup";
type Position = "drive" | "reves" | "cualquiera";

function normalize(input?: string | null) {
  return (input || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export default function ClaimOnboardingFlow({
  targetPlayerId,
  matchId,
  nextPath = "/player",
  targetName,
  targetCity,
  initialAuthenticated,
}: ClaimOnboardingFlowProps) {
  const router = useRouter();
  const supabase = createBrowserSupabase();
  const [step, setStep] = useState(1);
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuthenticated);
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authInfo, setAuthInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState<Position>("cualquiera");
  const [category, setCategory] = useState<number>(7);
  const [regionCode, setRegionCode] = useState("");
  const [regionName, setRegionName] = useState("");
  const [cityId, setCityId] = useState("");
  const [city, setCity] = useState("");
  const [birthYear, setBirthYear] = useState<string>("");
  const [avatarPath, setAvatarPath] = useState<string | null>(null);

  const [provincias, setProvincias] = useState<any[]>([]);
  const [localidades, setLocalidades] = useState<any[]>([]);
  const [loadingGeo, setLoadingGeo] = useState(false);

  useEffect(() => {
    fetch("/api/geo/provincias")
      .then((res) => res.json())
      .then((data) => setProvincias(data))
      .catch(() => setProvincias([]));
  }, []);

  useEffect(() => {
    if (!regionCode) {
      setLocalidades([]);
      return;
    }

    setLoadingGeo(true);
    fetch(`/api/geo/localidades?provincia=${regionCode}`)
      .then((res) => res.json())
      .then((data) => setLocalidades(data))
      .catch(() => setLocalidades([]))
      .finally(() => setLoadingGeo(false));
  }, [regionCode]);

  const currentYear = new Date().getFullYear();
  const years = useMemo(
    () => Array.from({ length: 80 }, (_, i) => String(currentYear - i - 10)),
    [currentYear]
  );

  const canStep1 = firstName.trim().length >= 2 && lastName.trim().length >= 2 && displayName.trim().length >= 2 && phone.trim().length >= 8;
  const canStep2 = !!regionCode && !!cityId && !!position && !!category;

  const targetNameNormalized = normalize(targetName);
  const fullNameNormalized = normalize(`${firstName} ${lastName}`);
  const nameMatches = !targetNameNormalized || targetNameNormalized.includes(fullNameNormalized) || fullNameNormalized.includes(targetNameNormalized);
  const cityMatches = !targetCity || normalize(targetCity) === normalize(city);
  const canConfirmClaim = isAuthenticated && nameMatches && cityMatches;

  async function handleAuth() {
    setAuthError(null);
    setAuthInfo(null);

    if (!authEmail || !authPassword) {
      setAuthError("Completá email y contraseña.");
      return;
    }

    if (authMode === "signup") {
      const result = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname + window.location.search)}`,
        },
      });

      if (result.error) {
        const msg = result.error.message || "";
        if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("registered")) {
          setAuthError("Ese mail ya está registrado. Podés iniciar sesión con ese mail o usar otro.");
          setAuthMode("login");
          return;
        }
        setAuthError(msg);
        return;
      }

      if (!result.data.session) {
        setAuthInfo("Te enviamos un email de confirmación. Confirmá tu cuenta y volvemos a este paso.");
        return;
      }

      await supabase.auth.updateUser({
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        },
      });
      setIsAuthenticated(true);
      return;
    }

    const result = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    });

    if (result.error) {
      setAuthError(result.error.message);
      return;
    }

    await supabase.auth.updateUser({
      data: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
      },
    });
    setIsAuthenticated(true);
  }

  function handleFinalize() {
    setError(null);
    startTransition(async () => {
      const result = await finalizeClaimFlowAction({
        targetPlayerId,
        matchId: matchId || null,
        next: nextPath,
        onboarding: {
          display_name: displayName.trim(),
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
        },
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.replace(result.redirectTo);
      router.refresh();
    });
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-8 space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">Alta + reclamo guiado</p>
        <p className="text-sm font-bold text-gray-700">Paso {step} de 4</p>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-3xl font-black text-gray-900">Vamos a crear tu perfil en PASALA.</h3>
          <p className="text-gray-600">Si sos {targetName}, completá tus datos para continuar.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className="w-full rounded-xl border border-gray-200 px-4 py-3" placeholder="Nombre*" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <input className="w-full rounded-xl border border-gray-200 px-4 py-3" placeholder="Apellido*" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <input className="w-full rounded-xl border border-gray-200 px-4 py-3" placeholder="Nombre visible / Nick*" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          <input className="w-full rounded-xl border border-gray-200 px-4 py-3" placeholder="Celular (WhatsApp)*" value={phone} onChange={(e) => setPhone(e.target.value)} />

          <button
            type="button"
            disabled={!canStep1}
            onClick={() => setStep(2)}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-black py-3 rounded-2xl"
          >
            Paso 2
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h3 className="text-3xl font-black text-gray-900">Tu perfil de juego.</h3>
          <p className="text-gray-600">Necesitamos estos datos para completar tu ficha.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <GeoSelect
              label="Provincia*"
              placeholder="Elegí tu provincia"
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
              placeholder="Buscá tu ciudad"
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

          <div className="space-y-2">
            <p className="text-sm font-bold text-gray-800">Posición*</p>
            <div className="grid grid-cols-3 gap-2">
              {(["drive", "reves", "cualquiera"] as Position[]).map((pos) => (
                <button
                  type="button"
                  key={pos}
                  onClick={() => setPosition(pos)}
                  className={`rounded-xl border-2 py-3 font-semibold capitalize ${position === pos ? "border-blue-600 text-blue-700 bg-blue-50" : "border-gray-200 text-gray-500"}`}
                >
                  {pos === "cualquiera" ? "Ambas" : pos}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-bold text-gray-800">Categoría*</p>
            <div className="grid grid-cols-7 gap-2">
              {[7, 6, 5, 4, 3, 2, 1].map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`rounded-xl border-2 py-2 font-bold ${category === cat ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 text-gray-600"}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-bold text-gray-800 mb-2">Año de nacimiento</p>
            <select
              className="w-full rounded-xl border border-gray-200 px-4 py-3"
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
            >
              <option value="">Seleccionar...</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setStep(1)} className="w-full border border-gray-300 text-gray-700 font-bold py-3 rounded-2xl">
              Volver
            </button>
            <button
              type="button"
              disabled={!canStep2}
              onClick={() => setStep(3)}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-black py-3 rounded-2xl"
            >
              Paso 3
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h3 className="text-3xl font-black text-gray-900">Foto de perfil (opcional)</h3>
          <p className="text-gray-600">Podés subirla ahora o más tarde desde tu perfil.</p>

          <div className="py-2">
            <AvatarUploader
              onUploadComplete={(path) => {
                setAvatarPath(path);
              }}
            />
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            {avatarPath ? "Foto cargada. Continuamos con tu acceso." : "Si preferís, podés continuar sin foto por ahora."}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setStep(2)} className="w-full border border-gray-300 text-gray-700 font-bold py-3 rounded-2xl">
              Volver
            </button>
            <button type="button" onClick={() => setStep(4)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-2xl">
              Paso 4
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h3 className="text-3xl font-black text-gray-900">Acceso y confirmación final</h3>

          {!isAuthenticated ? (
            <>
              <p className="text-gray-600">
                Completá tu email y contraseña. Si el mail ya existe, te damos opción de iniciar sesión.
              </p>

              <div className="grid grid-cols-2 gap-2 rounded-xl border border-gray-200 p-1">
                <button
                  type="button"
                  onClick={() => setAuthMode("signup")}
                  className={`rounded-lg py-2 text-sm font-bold ${authMode === "signup" ? "bg-blue-600 text-white" : "text-gray-600"}`}
                >
                  Crear cuenta
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode("login")}
                  className={`rounded-lg py-2 text-sm font-bold ${authMode === "login" ? "bg-blue-600 text-white" : "text-gray-600"}`}
                >
                  Iniciar sesión
                </button>
              </div>

              <input
                className="w-full rounded-xl border border-gray-200 px-4 py-3"
                placeholder="Email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                type="email"
              />
              <input
                className="w-full rounded-xl border border-gray-200 px-4 py-3"
                placeholder="Contraseña"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                type="password"
              />

              {authError && <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">{authError}</div>}
              {authInfo && <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-700">{authInfo}</div>}

              <button
                type="button"
                onClick={handleAuth}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-2xl"
              >
                {authMode === "signup" ? "Crear cuenta y continuar" : "Ingresar y continuar"}
              </button>
            </>
          ) : (
            <>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-2">
                <p className="text-sm text-gray-700">
                  Confirmá que sos <span className="font-black text-gray-900">{targetName}</span>
                  {targetCity ? ` de ${targetCity}` : ""}.
                </p>
                {!nameMatches && (
                  <p className="text-sm text-red-700">
                    El nombre/apellido ingresado no coincide con el perfil objetivo.
                  </p>
                )}
                {!cityMatches && (
                  <p className="text-sm text-red-700">
                    La ciudad ingresada no coincide con la del perfil objetivo.
                  </p>
                )}
              </div>

              {error && <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => router.replace("/welcome")}
                  className="w-full border border-gray-300 text-gray-700 font-bold py-3 rounded-2xl"
                >
                  No es mi perfil
                </button>
                <button
                  type="button"
                  disabled={!canConfirmClaim || isPending}
                  onClick={handleFinalize}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-black py-3 rounded-2xl"
                >
                  {isPending ? "Validando..." : "Confirmar y reclamar perfil"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
