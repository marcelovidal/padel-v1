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
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
    if (next.every((d) => d !== "")) onComplete(next.join(""));
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) inputRefs.current[index - 1]?.focus();
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
    pasted.split("").forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    if (pasted.length === 6) onComplete(pasted);
  }

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="w-12 h-14 text-center text-2xl font-black rounded-xl border-2 border-[#E2E8F0] focus:border-[#2563EB] focus:outline-none transition-colors disabled:opacity-50 disabled:bg-gray-50"
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

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [signupPortal, setSignupPortal] = useState<PortalType>(initialPortal);
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

  function resetToLogin() {
    setMode("login");
    setLoginStep("default");
    setOtpDigits(Array(6).fill(""));
    setError(null);
    setInfo(null);
    setShowPassword(false);
  }

  // ── Auth handlers (lógica sin cambios) ──────────────────────────

  async function onPasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(mapLoginError(error.message)); return; }
      router.replace(nextPath);
      router.refresh();
    });
  }

  async function sendMagicLink() {
    if (!email) { setError("Ingresá tu email."); return; }
    setError(null);
    startTransition(async () => {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });
      if (error) { setError(error.message); return; }
      setLoginStep("magic-link-sent");
    });
  }

  async function sendOtp() {
    if (!email) { setError("Ingresá tu email."); return; }
    setError(null);
    startTransition(async () => {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) { setError(error.message); return; }
      setLoginStep("otp-input");
      setResendCooldown(60);
    });
  }

  async function verifyOtpCode(code: string) {
    setError(null);
    startTransition(async () => {
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
      if (error) {
        setError(mapLoginError(error.message));
        setOtpDigits(Array(6).fill(""));
        return;
      }
      router.replace(nextPath);
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
      if (error) { setError(error.message); return; }
      setResendCooldown(60);
      setOtpDigits(Array(6).fill(""));
    });
  }

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-8">

      {/* ── LOGIN ── */}
      {mode === "login" && (
        <>
          {/* Header */}
          {loginStep === "default" && (
            <div className="text-center mb-8">
              <h1 className="text-4xl font-black text-[#2563EB] tracking-tighter italic -skew-x-3 inline-block">
                PASALA
              </h1>
              <p className="text-sm text-[#64748B] mt-2 font-medium">Ingresá a tu cuenta</p>
            </div>
          )}

          {/* Step: default */}
          {loginStep === "default" && (
            <div className="space-y-3">
              {/* 1. Google — método más rápido */}
              <GoogleAuthButton label="Continuar con Google" nextPath={nextPath} />

              {/* Divisor */}
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-[#E2E8F0]" />
                <span className="text-xs text-[#94A3B8] font-medium">o con tu email</span>
                <div className="flex-1 h-px bg-[#E2E8F0]" />
              </div>

              {/* Email */}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full rounded-xl border border-[#E2E8F0] px-4 py-3 text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:outline-none transition-colors text-sm"
              />

              {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              {/* 2. Magic link — acción primaria */}
              <button
                type="button"
                disabled={pending}
                onClick={sendMagicLink}
                className="w-full min-h-[48px] rounded-xl bg-[#2563EB] text-white font-semibold text-sm hover:bg-[#1D4ED8] disabled:opacity-60 transition-colors"
              >
                {pending ? "Enviando..." : "Enviar link de acceso"}
              </button>

              {/* 3. Contraseña — texto link discreto */}
              {!showPassword ? (
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setShowPassword(true)}
                    className="text-sm text-[#64748B] hover:text-[#0F172A] transition-colors"
                  >
                    Ingresar con contraseña →
                  </button>
                </div>
              ) : (
                <form onSubmit={onPasswordSubmit} className="space-y-3 pt-1">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Contraseña"
                    // eslint-disable-next-line jsx-a11y/no-autofocus
                    autoFocus
                    className="w-full rounded-xl border border-[#E2E8F0] px-4 py-3 text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:outline-none transition-colors text-sm"
                  />
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowPassword(false)}
                      className="text-xs text-[#94A3B8] hover:text-[#64748B] transition-colors"
                    >
                      Cancelar
                    </button>
                    <Link
                      href={`/welcome/reset-password?next=${encodeURIComponent(nextPath)}`}
                      className="text-xs text-[#64748B] hover:text-[#2563EB] transition-colors"
                    >
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>
                  <button
                    type="submit"
                    disabled={pending}
                    className="w-full min-h-[48px] rounded-xl bg-[#0F172A] text-white font-semibold text-sm hover:bg-[#1E293B] disabled:opacity-60 transition-colors"
                  >
                    {pending ? "Ingresando..." : "Ingresar"}
                  </button>
                </form>
              )}

              {/* Footer */}
              <p className="text-center text-sm text-[#64748B] pt-4 border-t border-[#F1F5F9]">
                ¿No tenés cuenta?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("signup"); setError(null); setInfo(null); }}
                  className="font-semibold text-[#2563EB] hover:underline"
                >
                  Registrate
                </button>
              </p>
            </div>
          )}

          {/* Step: magic link enviado */}
          {loginStep === "magic-link-sent" && (
            <div className="space-y-5 py-2">
              <div className="text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto">
                  <svg className="w-7 h-7 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#0F172A]">Revisá tu email</h2>
                  <p className="text-sm text-[#64748B] mt-2 leading-relaxed">
                    Te enviamos un link a{" "}
                    <span className="font-semibold text-[#0F172A]">{email}</span>.
                    <br />
                    Hacé click en el link para ingresar.
                    <br />
                    <span className="text-xs text-[#94A3B8]">El link expira en 1 hora.</span>
                  </p>
                </div>
              </div>

              {/* Contingencia OTP */}
              <div className="border-t border-[#F1F5F9] pt-5 space-y-3">
                <p className="text-xs text-center text-[#94A3B8]">
                  ¿No te llegó el email o preferís un código?
                </p>
                <button
                  type="button"
                  disabled={pending}
                  onClick={sendOtp}
                  className="w-full min-h-[48px] rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] font-semibold text-sm hover:bg-[#F8FAFC] disabled:opacity-60 transition-colors"
                >
                  {pending ? "Enviando..." : "Enviar código de 6 dígitos"}
                </button>
              </div>

              {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 text-center">
                  {error}
                </p>
              )}

              <div className="text-center">
                <button
                  type="button"
                  onClick={resetToLogin}
                  className="text-sm text-[#94A3B8] hover:text-[#64748B] transition-colors"
                >
                  Volver
                </button>
              </div>
            </div>
          )}

          {/* Step: OTP input */}
          {loginStep === "otp-input" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-[#0F172A]">Ingresá el código</h2>
                <p className="text-sm text-[#64748B] mt-1">
                  Te enviamos un código a{" "}
                  <span className="font-semibold text-[#0F172A]">{email}</span>
                </p>
              </div>

              <OtpInput value={otpDigits} disabled={pending} onComplete={verifyOtpCode} />

              {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 text-center">
                  {error}
                </p>
              )}
              {pending && (
                <p className="text-center text-sm text-[#94A3B8]">Verificando...</p>
              )}

              <div className="text-center space-y-3">
                <button
                  type="button"
                  disabled={resendCooldown > 0 || pending}
                  onClick={resendCode}
                  className="text-sm font-semibold text-[#2563EB] hover:underline disabled:text-[#94A3B8] disabled:no-underline transition-colors"
                >
                  {resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : "Reenviar código"}
                </button>
                <br />
                <button
                  type="button"
                  onClick={resetToLogin}
                  className="text-sm text-[#94A3B8] hover:text-[#64748B] transition-colors"
                >
                  Volver
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── SIGNUP ── */}
      {mode === "signup" && (
        <div className="space-y-5">
          {/* Header con volver */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={resetToLogin}
              className="text-[#64748B] hover:text-[#0F172A] transition-colors"
              aria-label="Volver"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-lg font-bold text-[#0F172A]">Crear cuenta</h2>
          </div>

          {/* Selector player / club */}
          <div className="grid grid-cols-2 rounded-xl border border-[#E2E8F0] p-1">
            {(["player", "club"] as PortalType[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => { setSignupPortal(p); setError(null); setInfo(null); }}
                className={
                  "rounded-lg py-2.5 text-sm font-semibold transition " +
                  (signupPortal === p
                    ? "bg-[#0F172A] text-white"
                    : "text-[#64748B] hover:bg-[#F8FAFC]")
                }
              >
                {p === "player" ? "Jugador" : "Club"}
              </button>
            ))}
          </div>

          {signupPortal === "player" && (
            <PlayerSignupWizard
              nextPath={nextPath}
              onError={setError}
              onInfo={setInfo}
              externalError={error}
              externalInfo={info}
            />
          )}
          {signupPortal === "club" && (
            <ClubSignupWizard
              onError={setError}
              onInfo={setInfo}
              externalError={error}
              externalInfo={info}
            />
          )}
        </div>
      )}
    </div>
  );
}
