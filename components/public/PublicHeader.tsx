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
        <div style={{ background: "#1565C0" }} className="border-b border-white/10">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/70">
                Sesión iniciada
              </p>
              <p className="truncate text-sm font-semibold text-white">
                {ctaContext.displayName || ctaContext.email || "Usuario"}
              </p>
            </div>
            <Link
              href={primaryHref}
              className="inline-flex items-center justify-center rounded-lg border border-white/30 px-3 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-white/10"
            >
              Ir a mi sección
            </Link>
          </div>
        </div>
      )}

      <div
        style={{ background: "#080808", borderBottom: "1px solid rgba(240,237,230,0.1)" }}
        className="backdrop-blur"
      >
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="font-serif text-2xl font-bold italic tracking-tight"
            style={{ color: "#F0EDE6" }}
          >
            PASALA
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-semibold transition-colors"
                style={{ color: "rgba(240,237,230,0.65)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#F0EDE6")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(240,237,230,0.65)")}
              >
                {item.label}
              </Link>
            ))}
            <PublicContactModal
              buttonClassName="text-sm font-semibold transition-colors"
              buttonStyle={{ color: "rgba(240,237,230,0.65)" }}
            />
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {isGuest && (
              <Link
                href={loginHref}
                className="rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-wide transition"
                style={{
                  borderColor: "rgba(240,237,230,0.2)",
                  color: "rgba(240,237,230,0.75)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(240,237,230,0.4)";
                  e.currentTarget.style.color = "#F0EDE6";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(240,237,230,0.2)";
                  e.currentTarget.style.color = "rgba(240,237,230,0.75)";
                }}
              >
                Iniciar sesión
              </Link>
            )}
            <Link
              href={clubHref}
              className="rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-wide transition"
              style={{
                borderColor: "rgba(240,237,230,0.2)",
                color: "rgba(240,237,230,0.75)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(240,237,230,0.4)";
                e.currentTarget.style.color = "#F0EDE6";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(240,237,230,0.2)";
                e.currentTarget.style.color = "rgba(240,237,230,0.75)";
              }}
            >
              Registrar club
            </Link>
            <Link
              href={primaryHref}
              className="rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:opacity-90"
              style={{ background: "#1565C0" }}
            >
              {isGuest ? "Empezar" : "Ir a mi sección"}
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border text-lg md:hidden"
            style={{ borderColor: "rgba(240,237,230,0.2)", color: "#F0EDE6" }}
            aria-label="Abrir menú"
          >
            {mobileOpen ? "✕" : "≡"}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div
          className="border-t md:hidden"
          style={{
            background: "#080808",
            borderColor: "rgba(240,237,230,0.1)",
          }}
        >
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-4 sm:px-6">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-2 py-2.5 text-sm font-semibold"
                style={{ color: "rgba(240,237,230,0.75)" }}
              >
                {item.label}
              </Link>
            ))}
            <PublicContactModal
              onTriggerClick={() => setMobileOpen(false)}
              buttonClassName="rounded-lg px-2 py-2.5 text-left text-sm font-semibold"
              buttonStyle={{ color: "rgba(240,237,230,0.75)" }}
            />

            <div className={`mt-3 grid gap-2 ${isGuest ? "grid-cols-3" : "grid-cols-2"}`}>
              {isGuest && (
                <Link
                  href={loginHref}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg border px-3 py-2 text-center text-xs font-black uppercase tracking-wide"
                  style={{ borderColor: "rgba(240,237,230,0.2)", color: "rgba(240,237,230,0.75)" }}
                >
                  Login
                </Link>
              )}
              <Link
                href={clubHref}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg border px-3 py-2 text-center text-xs font-black uppercase tracking-wide"
                style={{ borderColor: "rgba(240,237,230,0.2)", color: "rgba(240,237,230,0.75)" }}
              >
                Club
              </Link>
              <Link
                href={primaryHref}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2 text-center text-xs font-black uppercase tracking-wide text-white"
                style={{ background: "#1565C0" }}
              >
                {isGuest ? "Empezar" : "Mi sección"}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
