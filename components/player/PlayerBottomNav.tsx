"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  Calendar,
  Zap,
  Users,
  UserCircle,
  Trophy,
  Star,
  GraduationCap,
  ChevronRight,
  X,
} from "lucide-react";
import { useNotificationsContext } from "@/contexts/player-notifications.context";

function BottomNavDot({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-0.5 -right-1 h-2 w-2 rounded-full bg-red-500 ring-1 ring-white" />
  );
}

const SHEET_ITEMS = {
  actividad: [
    { href: "/player/matches", label: "Partidos", icon: Trophy },
    { href: "/player/events", label: "Eventos", icon: Star },
  ],
  comunidad: [
    { href: "/player/players", label: "Jugadores", icon: Users },
    { href: "/player/entrenadores", label: "Entrenadores", icon: GraduationCap },
  ],
} as const;

type BottomNavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  badge: (counts: ReturnType<typeof useNotificationsContext>["sectionCounts"]) => number;
  activeFor: (pathname: string) => boolean;
  sheetKey?: keyof typeof SHEET_ITEMS;
};

const ITEMS: BottomNavItem[] = [
  {
    href: "/player",
    label: "Resumen",
    icon: Home,
    badge: (counts: ReturnType<typeof useNotificationsContext>["sectionCounts"]) => 0,
    activeFor: (p: string) => p === "/player",
  },
  {
    href: "/player/calendario",
    label: "Calendario",
    icon: Calendar,
    badge: (counts: ReturnType<typeof useNotificationsContext>["sectionCounts"]) =>
      counts.calendario,
    activeFor: (p: string) =>
      p.startsWith("/player/calendario") || p.startsWith("/player/bookings"),
  },
  {
    href: "/player/matches",
    label: "Actividad",
    icon: Zap,
    sheetKey: "actividad",
    badge: (counts: ReturnType<typeof useNotificationsContext>["sectionCounts"]) =>
      counts.partidos + counts.eventos,
    activeFor: (p: string) =>
      p.startsWith("/player/matches") || p.startsWith("/player/events"),
  },
  {
    href: "/player/players",
    label: "Comunidad",
    icon: Users,
    sheetKey: "comunidad",
    badge: (_counts: ReturnType<typeof useNotificationsContext>["sectionCounts"]) => 0,
    activeFor: (p: string) =>
      p.startsWith("/player/players") || p.startsWith("/player/entrenadores"),
  },
  {
    href: "/player/profile",
    label: "Perfil",
    icon: UserCircle,
    badge: (_counts: ReturnType<typeof useNotificationsContext>["sectionCounts"]) => 0,
    activeFor: (p: string) =>
      p.startsWith("/player/profile") || p.startsWith("/player/coach"),
  },
] as const;

export function PlayerBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { sectionCounts } = useNotificationsContext();
  const [openSheet, setOpenSheet] = useState<keyof typeof SHEET_ITEMS | null>(null);

  useEffect(() => {
    setOpenSheet(null);
  }, [pathname]);

  const sheetOptions = openSheet ? SHEET_ITEMS[openSheet] : [];

  return (
    <>
      {openSheet && (
        <div
          className="md:hidden fixed inset-0 z-40 flex items-end"
          onClick={() => setOpenSheet(null)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative w-full rounded-t-[28px] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
          >
            <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-200" />
            <div className="flex items-center justify-between px-5 pb-3 pt-4">
              <p className="text-base font-black text-slate-900">
                {openSheet === "actividad" ? "Actividad" : "Comunidad"}
              </p>
              <button
                type="button"
                onClick={() => setOpenSheet(null)}
                className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="border-t border-slate-100 px-4 pt-3">
              <div className="space-y-2">
                {sheetOptions.map(({ href, label, icon: Icon }) => (
                  <button
                    key={href}
                    type="button"
                    onClick={() => {
                      setOpenSheet(null);
                      router.push(href);
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-blue-200 hover:bg-blue-50"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="flex-1 text-sm font-semibold text-slate-900">{label}</span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex h-16">
          {ITEMS.map(({ href, label, icon: Icon, badge, activeFor, sheetKey }) => {
            const active = activeFor(pathname);
            const count = badge(sectionCounts);
            const className = `flex flex-1 flex-col items-center justify-center gap-1 transition-colors ${
              active ? "text-blue-600" : "text-slate-400"
            }`;

            if (sheetKey) {
              return (
                <button
                  key={href}
                  type="button"
                  onClick={() => setOpenSheet(sheetKey)}
                  className={className}
                >
                  <div className="relative">
                    <Icon className="w-5 h-5" />
                    <BottomNavDot count={count} />
                  </div>
                  <span className="text-[10px] font-semibold leading-none">{label}</span>
                </button>
              );
            }

            return (
              <Link key={href} href={href} className={className}>
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  <BottomNavDot count={count} />
                </div>
                <span className="text-[10px] font-semibold leading-none">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
