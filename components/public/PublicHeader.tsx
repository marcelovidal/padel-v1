"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  PublicCtaContext,
  getLoginHref,
  getRegisterClubHref,
  resolvePublicCtaHref,
} from "@/lib/auth/public-cta.shared";
import { PublicContactModal } from "@/components/public/PublicContactModal";
import { PasalaLogo } from "@/components/ui/PasalaLogo";

const NAV_ITEMS = [
  { href: "/", label: "Inicio" },
  { href: "/players", label: "Jugadores" },
  { href: "/clubs", label: "Clubes" },
  { href: "/pricing", label: "Precios" },
  { href: "/faq", label: "FAQ" },
];

const NAV_LINK_CLASS =
  "text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-brand-rojo";

const MOBILE_LINK_CLASS =
  "rounded-lg px-2 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-elevated)]";

const GHOST_BUTTON_CLASS =
  "rounded-xl border border-[var(--border-strong)] px-3 py-2 text-xs font-black uppercase tracking-wide text-[var(--text-secondary)] transition hover:bg-[var(--bg-elevated)]";

const PRIMARY_BUTTON_CLASS =
  "rounded-xl bg-brand-rojo px-4 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-brand-rojo-dark";

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
        <div className="border-b border-[var(--border-soft)] bg-[var(--bg-elevated)] backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Sesion iniciada
              </p>
              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                {ctaContext.displayName || ctaContext.email || "Usuario"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={primaryHref}
                className="inline-flex items-center justify-center rounded-lg bg-brand-rojo px-3 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-brand-rojo-dark"
              >
                Ir a mi seccion
              </Link>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-card)] px-3 py-2 text-xs font-black uppercase tracking-wide text-[var(--text-secondary)] transition hover:bg-[var(--bg-elevated)]"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Salir
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="border-b border-[var(--border-soft)] bg-[var(--bg-card)] backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-[var(--text-primary)]" aria-label="PASALA — Inicio">
            <PasalaLogo variant="auto" size="md" />
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className={NAV_LINK_CLASS}>
                {item.label}
              </Link>
            ))}
            <PublicContactModal buttonClassName={NAV_LINK_CLASS} />
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {isGuest && (
              <Link href={loginHref} className={GHOST_BUTTON_CLASS}>
                Iniciar sesion
              </Link>
            )}
            <Link href={clubHref} className={GHOST_BUTTON_CLASS}>
              Registrar club
            </Link>
            {isGuest && (
              <Link href={primaryHref} className={PRIMARY_BUTTON_CLASS}>
                Empezar
              </Link>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-strong)] text-[var(--text-secondary)] transition hover:bg-[var(--bg-elevated)] md:hidden"
            aria-label="Abrir menu"
          >
            <span className="text-lg">≡</span>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-[var(--border-soft)] bg-[var(--bg-card)] md:hidden">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-4 sm:px-6">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={MOBILE_LINK_CLASS}
              >
                {item.label}
              </Link>
            ))}
            <PublicContactModal
              onTriggerClick={() => setMobileOpen(false)}
              buttonClassName={`${MOBILE_LINK_CLASS} text-left`}
            />

            <div className="mt-2 grid grid-cols-3 gap-2">
              {isGuest && (
                <Link
                  href={loginHref}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg border border-[var(--border-strong)] px-3 py-2 text-center text-xs font-black uppercase tracking-wide text-[var(--text-secondary)]"
                >
                  Login
                </Link>
              )}
              <Link
                href={clubHref}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg border border-[var(--border-strong)] px-3 py-2 text-center text-xs font-black uppercase tracking-wide text-[var(--text-secondary)]"
              >
                Club
              </Link>
              <Link
                href={primaryHref}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg bg-brand-rojo px-3 py-2 text-center text-xs font-black uppercase tracking-wide text-white"
              >
                {isGuest ? "Empezar" : "Mi seccion"}
              </Link>
              {!isGuest && (
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--border-strong)] px-3 py-2 text-xs font-black uppercase tracking-wide text-[var(--text-secondary)]"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Salir
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
