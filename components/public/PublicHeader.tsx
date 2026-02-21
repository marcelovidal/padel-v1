"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  PublicCtaState,
  getRegisterClubHref,
  resolvePublicCtaHref,
} from "@/lib/auth/public-cta.shared";

const NAV_ITEMS = [
  { href: "/players", label: "Jugadores" },
  { href: "/clubs", label: "Clubes" },
  { href: "/pricing", label: "Precios" },
  { href: "/faq", label: "FAQ" },
];

export function PublicHeader({ ctaState }: { ctaState: PublicCtaState }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentPath = useMemo(() => {
    const query = searchParams.toString();
    return `${pathname}${query ? `?${query}` : ""}`;
  }, [pathname, searchParams]);

  const primaryHref = useMemo(
    () => resolvePublicCtaHref(ctaState, currentPath),
    [ctaState, currentPath]
  );

  const clubHref = getRegisterClubHref();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur">
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
        </nav>

        <div className="hidden items-center gap-2 md:flex">
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
            Empezar
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

            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link
                href={clubHref}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-center text-xs font-black uppercase tracking-wide text-slate-700"
              >
                Registrar club
              </Link>
              <Link
                href={primaryHref}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg bg-blue-600 px-3 py-2 text-center text-xs font-black uppercase tracking-wide text-white"
              >
                Empezar
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

