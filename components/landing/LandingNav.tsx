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

            {/* CTA / Avatar */}
            {isAuthenticated ? (
              <Link
                href={primaryHref}
                className="flex items-center gap-2 transition-opacity hover:opacity-80"
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
              <div className="flex items-center gap-2">
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
    </>
  );
}
