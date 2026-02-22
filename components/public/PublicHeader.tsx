"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  PublicCtaContext,
  getLoginHref,
  getRegisterClubHref,
  resolvePublicCtaHref,
} from "@/lib/auth/public-cta.shared";
import { PublicContactModal } from "@/components/public/PublicContactModal";

const NAV_ITEMS = [
  { href: "/", label: "Inicio" },
  { href: "/players", label: "Jugadores" },
  { href: "/clubs", label: "Clubes" },
  { href: "/pricing", label: "Precios" },
  { href: "/faq", label: "FAQ" },
];

export function PublicHeader({ ctaContext }: { ctaContext: PublicCtaContext }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentPath = useMemo(() => {
    const query = searchParams.toString();
    return `${pathname}${query ? `?${query}` : ""}`;
  }, [pathname, searchParams]);

  const primaryHref = useMemo(
    () => resolvePublicCtaHref(ctaContext.state, currentPath),
    [ctaContext.state, currentPath]
  );
  const loginHref = useMemo(() => getLoginHref(currentPath), [currentPath]);
  const clubHref = getRegisterClubHref();

  const isGuest = !ctaContext.isAuthenticated;

  return (
    <header className="sticky top-0 z-40">
      {ctaContext.isAuthenticated && (
        <div className="border-b border-blue-100 bg-blue-50/90 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
                Sesion iniciada
              </p>
              <p className="truncate text-sm font-semibold text-slate-700">
                {ctaContext.displayName || ctaContext.email || "Usuario"}
              </p>
            </div>
            <Link
              href={primaryHref}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-blue-700"
            >
              Ir a mi seccion
            </Link>
          </div>
        </div>
      )}

      <div className="border-b border-slate-200/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-2xl font-black italic tracking-tight text-blue-600">
            PASALA
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-semibold text-slate-700 transition-colors hover:text-blue-700"
              >
                {item.label}
              </Link>
            ))}
            <PublicContactModal buttonClassName="text-sm font-semibold text-slate-700 transition-colors hover:text-blue-700" />
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {isGuest && (
              <Link
                href={loginHref}
                className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Iniciar sesion
              </Link>
            )}
            <Link
              href={clubHref}
              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Registrar club
            </Link>
            <Link
              href={primaryHref}
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-blue-700"
            >
              {isGuest ? "Empezar" : "Ir a mi seccion"}
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 text-slate-700 md:hidden"
            aria-label="Abrir menu"
          >
            <span className="text-lg">≡</span>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-4 sm:px-6">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-2 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {item.label}
              </Link>
            ))}
            <PublicContactModal
              onTriggerClick={() => setMobileOpen(false)}
              buttonClassName="rounded-lg px-2 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
            />

            <div className={`mt-2 grid gap-2 ${isGuest ? "grid-cols-3" : "grid-cols-2"}`}>
              {isGuest && (
                <Link
                  href={loginHref}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-center text-xs font-black uppercase tracking-wide text-slate-700"
                >
                  Login
                </Link>
              )}
              <Link
                href={clubHref}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-center text-xs font-black uppercase tracking-wide text-slate-700"
              >
                Club
              </Link>
              <Link
                href={primaryHref}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg bg-blue-600 px-3 py-2 text-center text-xs font-black uppercase tracking-wide text-white"
              >
                {isGuest ? "Empezar" : "Mi seccion"}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
