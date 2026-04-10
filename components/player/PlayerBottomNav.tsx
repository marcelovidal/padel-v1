"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, Zap, Users, UserCircle } from "lucide-react";
import { useNotificationsContext } from "@/contexts/player-notifications.context";

function BottomNavDot({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-0.5 -right-1 h-2 w-2 rounded-full bg-red-500 ring-1 ring-white" />
  );
}

const ITEMS = [
  {
    href: "/player",
    label: "Resumen",
    icon: Home,
    exact: true,
    badge: (counts: ReturnType<typeof useNotificationsContext>["sectionCounts"]) => 0,
    activeFor: (p: string) => p === "/player",
  },
  {
    href: "/player/calendario",
    label: "Calendario",
    icon: Calendar,
    exact: false,
    badge: (counts: ReturnType<typeof useNotificationsContext>["sectionCounts"]) =>
      counts.calendario,
    activeFor: (p: string) =>
      p.startsWith("/player/calendario") || p.startsWith("/player/bookings"),
  },
  {
    href: "/player/matches",
    label: "Actividad",
    icon: Zap,
    exact: false,
    badge: (counts: ReturnType<typeof useNotificationsContext>["sectionCounts"]) =>
      counts.partidos + counts.eventos,
    activeFor: (p: string) =>
      p.startsWith("/player/matches") || p.startsWith("/player/events"),
  },
  {
    href: "/player/players",
    label: "Comunidad",
    icon: Users,
    exact: false,
    badge: (_counts: ReturnType<typeof useNotificationsContext>["sectionCounts"]) => 0,
    activeFor: (p: string) =>
      p.startsWith("/player/players") || p.startsWith("/player/entrenadores"),
  },
  {
    href: "/player/profile",
    label: "Perfil",
    icon: UserCircle,
    exact: false,
    badge: (_counts: ReturnType<typeof useNotificationsContext>["sectionCounts"]) => 0,
    activeFor: (p: string) =>
      p.startsWith("/player/profile") || p.startsWith("/player/coach"),
  },
] as const;

export function PlayerBottomNav() {
  const pathname = usePathname();
  const { sectionCounts } = useNotificationsContext();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex h-16">
        {ITEMS.map(({ href, label, icon: Icon, badge, activeFor }) => {
          const active = activeFor(pathname);
          const count = badge(sectionCounts);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 transition-colors ${
                active ? "text-blue-600" : "text-slate-400"
              }`}
            >
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
  );
}
