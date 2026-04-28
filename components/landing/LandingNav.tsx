"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase/client";

type LandingNavProps = {
  primaryHref: string;
  isAuthenticated: boolean;
  displayName: string | null;
  isClubOwner?: boolean;
};

function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
}

export function LandingNav({
  primaryHref,
  isAuthenticated,
  displayName,
  isClubOwner = false,
}: LandingNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isLanding = pathname === "/";

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  useEffect(() => {
    if (!isLanding) return;
    const handler = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, [isLanding]);

  const transparent = isLanding && !scrolled;
  const showSubBar = isAuthenticated && isLanding;
  const firstName = displayName?.split(" ")[0] ?? "";

  async function handleSignOut() {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <style>{`
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* Wrapper fixed — apila header + sub-barra sin calcular alturas */}
      <div className="fixed left-0 right-0 top-0 z-50">
        <header
          className="transition-colors duration-300"
          style={{
            backgroundColor: transparent ? "transparent" : "#ffffff",
            borderBottom:
              showSubBar
                ? "none"
                : transparent
                ? "none"
                : "1px solid #e7e5e4",
          }}
        >
          <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4 md:px-10 md:py-5">
            {/* Logo */}
            <Link
              href="/"
              className="transition-colors duration-300"
              style={{
                fontFamily: "Georgia, serif",
                fontStyle: "italic",
                fontSize: "22px",
                color: transparent ? "#ffffff" : "#1565C0",
                textDecoration: "none",
              }}
            >
              Pasala
            </Link>

            {/* Nav links */}
            <nav className="hidden items-center gap-8 md:flex">
              {[
                { href: "/#jugadores",    label: "Jugadores"    },
                { href: "/#clubes",       label: "Clubes"       },
                { href: "/#entrenadores", label: "Entrenadores" },
                { href: "/#contacto",     label: "Contacto"     },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`uppercase tracking-widest transition-colors duration-200 ${
                    transparent
                      ? "text-white/80 hover:text-white"
                      : "text-slate-700 hover:text-[#1565C0]"
                  }`}
                  style={{ fontSize: "11px" }}
                >
                  {label}
                </Link>
              ))}
            </nav>

            {/* CTA / Avatar — desktop only */}
            {isAuthenticated ? (
              <Link
                href={primaryHref}
                className="hidden md:flex items-center gap-2 transition-opacity hover:opacity-80"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                  {getInitials(displayName)}
                </span>
                <span
                  className="hidden text-sm font-medium md:block"
                  style={{ color: transparent ? "rgba(255,255,255,0.85)" : "#080808" }}
                >
                  {displayName?.split(" ")[0] ?? "Mi cuenta"}
                </span>
              </Link>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  href="/welcome"
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                    transparent
                      ? "bg-white text-[#1565C0] hover:bg-white/90"
                      : "bg-[#1565C0] text-white hover:bg-[#1244a0]"
                  }`}
                >
                  Registrate
                </Link>
                <Link
                  href="/player/login"
                  className={`rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
                    transparent
                      ? "border-white/50 text-white hover:border-white"
                      : "border-slate-300 text-slate-700 hover:border-[#1565C0] hover:text-[#1565C0]"
                  }`}
                >
                  Ingresá
                </Link>
              </div>
            )}

            {/* Hamburguesa — mobile only */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={`md:hidden flex items-center p-2 ${transparent ? "text-white" : "text-slate-800"}`}
              aria-label="Menú"
            >
              {menuOpen ? (
                <svg viewBox="0 0 24 24" className="w-6 h-6" stroke="currentColor" strokeWidth="2" fill="none">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-6 h-6" stroke="currentColor" strokeWidth="2" fill="none">
                  <path d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              )}
            </button>
          </div>
        </header>

        {/* Sub-barra de sesión — solo desktop, solo landing, solo autenticado */}
        {showSubBar && (
          <div
            className="hidden md:block"
            style={{
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              borderBottom: "1px solid rgba(0,0,0,0.06)",
              animation: "fadeSlideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
            }}
          >
            <div className="mx-auto flex max-w-[1440px] items-center justify-between px-8 py-2">
              {/* Saludo */}
              <span className="text-xs text-slate-500">
                Bienvenida, {firstName}
              </span>

              {/* Acciones */}
              <div className="flex items-center">
                <Link
                  href="/player"
                  className="text-xs text-slate-600 transition-colors hover:text-[#1565C0]"
                >
                  Mi perfil
                </Link>
                <span className="mx-3 text-stone-200">|</span>
                <Link
                  href="/player/matches/new"
                  className="text-xs text-slate-600 transition-colors hover:text-[#1565C0]"
                >
                  Cargar partido
                </Link>
                <span className="mx-3 text-stone-200">|</span>
                <Link
                  href="/player/bookings/new"
                  className="text-xs text-slate-600 transition-colors hover:text-[#1565C0]"
                >
                  Reservar cancha
                </Link>
                {isClubOwner && (
                  <>
                    <span className="mx-3 text-stone-200">|</span>
                    <Link
                      href="/player/mi-club"
                      className="text-xs text-slate-600 transition-colors hover:text-[#1565C0]"
                    >
                      Mi club
                    </Link>
                  </>
                )}
                <span className="mx-3 text-stone-200">|</span>
                <button
                  onClick={handleSignOut}
                  className="text-xs text-slate-400 transition-colors hover:text-red-500"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Menú fullscreen — mobile */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col md:hidden"
          style={{ background: "#0a1628", animation: "fadeIn 0.3s ease both" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "20px", color: "#ffffff" }}>
              Pasala
            </span>
            <button onClick={() => setMenuOpen(false)} className="p-2 text-white">
              <svg viewBox="0 0 24 24" className="w-6 h-6" stroke="currentColor" strokeWidth="2" fill="none">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Links */}
          <nav className="flex flex-col px-6 py-8 gap-2 flex-1">
            {(["JUGADORES", "CLUBES", "ENTRENADORES", "CONTACTO"] as const).map((item, i) => (
              <a
                key={item}
                href={`/#${item.toLowerCase()}`}
                onClick={() => setMenuOpen(false)}
                className="text-3xl font-normal text-white/80 hover:text-white py-3 border-b border-white/10 transition-colors"
                style={{ animation: `slideIn 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 0.06}s both` }}
              >
                {item}
              </a>
            ))}
          </nav>

          {/* Botones de acción al pie */}
          <div className="px-6 py-8 flex flex-col gap-3 border-t border-white/10">
            <Link href="/welcome" onClick={() => setMenuOpen(false)}>
              <span className="block w-full text-center bg-[#1565C0] text-white font-semibold py-4 rounded-full text-sm hover:bg-[#1244a0] transition-colors">
                Registrate gratis
              </span>
            </Link>
            <Link href="/player/login" onClick={() => setMenuOpen(false)}>
              <span className="block w-full text-center border border-white/30 text-white font-medium py-4 rounded-full text-sm hover:border-white/60 transition-colors">
                Ya tengo cuenta · Ingresá
              </span>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
