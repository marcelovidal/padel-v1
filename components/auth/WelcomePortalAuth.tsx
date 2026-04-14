"use client";

import Link from "next/link";
import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton";
import PlayerSignupWizard from "@/components/auth/PlayerSignupWizard";
import ClubSignupWizard from "@/components/auth/ClubSignupWizard";

type PortalType = "player" | "club";
type AuthMode = "login" | "signup";
type LoginStep = "default" | "magic-link-sent" | "otp-input";

function cn(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

function resolvePortalNextPath(portal: PortalType, nextPath?: string) {
  if (portal === "club") {
    if (!nextPath || nextPath === "/player") return "/club";
    return nextPath;
  }
  return nextPath || "/player";
}

function mapLoginError(message: string) {
  const raw = message.toLowerCase();
  if (raw.includes("invalid login credentials")) return "Email o contraseña incorrectos.";
  if (raw.includes("invalid otp") || raw.includes("token is invalid")) return "Código incorrecto.";
  if (raw.includes("otp expired") || raw.includes("token has expired")) return "El código expiró. Solicitá uno nuevo.";
  if (raw.includes("for security purposes")) return "Demasiados intentos. Esperá unos minutos.";
  return message;
}

function OtpInput({
  value,
  disabled,
  onComplete,
}: {
  value: string[];
  disabled?: boolean;
  onComplete: (code: string) => void;
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [digits, setDigits] = useState<string[]>(value);

  useEffect(() => {
    setDigits(value);
    if (value.every((d) => d === "")) {
      inputRefs.current[0]?.focus();
    }
  }, [value]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  function handleChange(index: number, val: string) {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (next.every((d) => d !== "")) {
      onComplete(next.join(""));
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
      const next = [...digits];
      next[index] = "";
      setDigits(next);
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = Array(6).fill("") as string[];
    pasted.split("").forEach((ch, i) => {
      next[i] = ch;
    });
    setDigits(next);
    const lastIdx = Math.min(pasted.length, 5);
    inputRefs.current[lastIdx]?.focus();
    if (pasted.length === 6) {
      onComplete(pasted);
    }
  }

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="w-12 h-14 text-center text-2xl font-black rounded-xl border-2 border-gray-300 focus:border-blue-500 focus:outline-none transition-colors disabled:opacity-50 disabled:bg-gray-50"
        />
      ))}
    </div>
  );
}

export default function WelcomePortalAuth({
  nextPath = "/player",
  initialPortal = "player",
  initialMode = "login",
}: {
  nextPath?: string;
  initialPortal?: PortalType;
  initialMode?: AuthMode;
}) {
  const router = useRouter();
  const supabase = createBrowserSupabase();
  const [portal, setPortal] = useState<PortalType>(initialPortal);
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [loginStep, setLoginStep] = useState<LoginStep>("default");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(""));
  const [resendCooldown, setResendCooldown] = useState(0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const targetPath = resolvePortalNextPath(portal, nextPath);

  function resetLoginState() {
    setLoginStep("default");
    setOtpDigits(Array(6).fill(""));
    setError(null);
    setInfo(null);
    setShowPassword(false);
  }

  async function onPasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(mapLoginError(error.message));
        return;
      }
      router.replace(targetPath);
      router.refresh();
    });
  }

  async function sendMagicLink() {
    if (!email) {
      setError("Ingresá tu email.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(targetPath)}`,
        },
      });
      if (error) {
        setError(error.message);
        return;
      }
      setLoginStep("magic-link-sent");
    });
  }

  async function sendOtp() {
    if (!email) {
      setError("Ingresá tu email.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) {
        setError(error.message);
        return;
      }
      setLoginStep("otp-input");
      setResendCooldown(60);
    });
  }

  async function verifyOtpCode(code: string) {
    setError(null);
    startTransition(async () => {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email",
      });
      if (error) {
        setError(mapLoginError(error.message));
        setOtpDigits(Array(6).fill(""));
        return;
      }
      router.replace(targetPath);
      router.refresh();
    });
  }

  async function resendCode() {
    if (resendCooldown > 0 || pending) return;
    setError(null);
    startTransition(async () => {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) {
        setError(error.message);
        return;
      }
      setResendCooldown(60);
      setOtpDigits(Array(6).fill(""));
    });
  }

  return (
    <div className="rounded-3xl border border-gray-100 bg-white/95 shadow-xl p-6 md:p-8">
      {/* Portal / mode toggles */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 rounded-2xl border border-gray-200 p-1">
          {(["player", "club"] as PortalType[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setPortal(p);
                resetLoginState();
              }}
              className={cn(
                "rounded-xl py-3 text-sm font-black uppercase tracking-wide transition",
                portal === p ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
              )}
            >
              {p === "player" ? "Jugador" : "Club"}
            </button>
          ))}
        </div>

        {loginStep === "default" && (
          <div className="grid grid-cols-2 rounded-2xl border border-gray-200 p-1">
            {(["login", "signup"] as AuthMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError(null);
                  setInfo(null);
                }}
                className={cn(
                  "rounded-xl py-2.5 text-sm font-bold transition",
                  mode === m ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-50"
                )}
              >
                {m === "login" ? "Iniciar sesion" : "Crear cuenta"}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        {/* ── LOGIN: default step ── */}
        {mode === "login" && loginStep === "default" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-black text-gray-900">
              {portal === "player" ? "Ingreso de jugadores" : "Ingreso de clubes"}
            </h2>

            {/* Google — primer método, más prominente */}
            <GoogleAuthButton
              label={portal === "player" ? "Continuar con Google" : "Continuar con Google"}
              nextPath={targetPath}
            />

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">o con email</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors"
            />

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="button"
              disabled={pending}
              onClick={sendMagicLink}
              className="w-full rounded-xl border-2 border-blue-600 text-blue-600 font-bold py-3 hover:bg-blue-50 transition disabled:opacity-60"
            >
              {pending ? "Enviando..." : "Enviar link de acceso"}
            </button>

            <button
              type="button"
              disabled={pending}
              onClick={sendOtp}
              className="w-full rounded-xl border-2 border-gray-300 text-gray-700 font-bold py-3 hover:bg-gray-50 transition disabled:opacity-60"
            >
              {pending ? "Enviando..." : "Enviar código por email"}
            </button>

            {/* Contraseña — acceso avanzado colapsable */}
            {!showPassword ? (
              <button
                type="button"
                onClick={() => setShowPassword(true)}
                className="w-full text-sm text-gray-400 hover:text-gray-600 font-semibold py-2 transition"
              >
                Ingresar con contraseña
              </button>
            ) : (
              <form onSubmit={onPasswordSubmit} className="space-y-3">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña"
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors"
                />
                <div className="text-right">
                  <Link
                    href={`/welcome/reset-password?next=${encodeURIComponent(targetPath)}`}
                    className="text-sm font-semibold text-gray-500 hover:text-blue-700 transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <button
                  type="submit"
                  disabled={pending}
                  className="w-full rounded-xl bg-gray-900 px-4 py-3 text-white font-black hover:bg-gray-800 disabled:opacity-60 transition"
                >
                  {pending ? "Ingresando..." : "Ingresar"}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ── LOGIN: magic link enviado ── */}
        {mode === "login" && loginStep === "magic-link-sent" && (
          <div className="text-center space-y-4 py-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-black text-gray-900">Revisá tu email</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Te enviamos un link a{" "}
              <span className="font-bold text-gray-900">{email}</span>.
              <br />
              Hacé click en el link para ingresar.
              <br />
              <span className="text-gray-400 text-xs">El link expira en 1 hora.</span>
            </p>
            <button
              type="button"
              onClick={resetLoginState}
              className="text-sm text-blue-600 font-semibold hover:underline"
            >
              Volver
            </button>
          </div>
        )}

        {/* ── LOGIN: OTP input ── */}
        {mode === "login" && loginStep === "otp-input" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-black text-gray-900">Ingresá el código</h2>
              <p className="text-sm text-gray-500 mt-1">
                Te enviamos un código a{" "}
                <span className="font-semibold text-gray-700">{email}</span>
              </p>
            </div>

            <OtpInput value={otpDigits} disabled={pending} onComplete={verifyOtpCode} />

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 text-center">
                {error}
              </p>
            )}

            {pending && (
              <p className="text-center text-sm text-gray-400">Verificando...</p>
            )}

            <div className="text-center">
              <button
                type="button"
                disabled={resendCooldown > 0 || pending}
                onClick={resendCode}
                className="text-sm font-semibold text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline transition-colors"
              >
                {resendCooldown > 0
                  ? `Reenviar código en ${resendCooldown}s`
                  : "Reenviar código"}
              </button>
            </div>

            <button
              type="button"
              onClick={resetLoginState}
              className="w-full text-sm text-gray-400 hover:text-gray-600 font-semibold py-2 transition"
            >
              Volver
            </button>
          </div>
        )}

        {/* ── SIGNUP flows (sin cambios) ── */}
        {mode === "signup" && portal === "player" && (
          <PlayerSignupWizard
            nextPath={nextPath}
            onError={setError}
            onInfo={setInfo}
            externalError={error}
            externalInfo={info}
          />
        )}

        {mode === "signup" && portal === "club" && (
          <ClubSignupWizard
            onError={setError}
            onInfo={setInfo}
            externalError={error}
            externalInfo={info}
          />
        )}
      </div>
    </div>
  );
}
