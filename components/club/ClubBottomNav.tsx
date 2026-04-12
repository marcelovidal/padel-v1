"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, Trophy, Users, Settings } from "lucide-react";

const ITEMS = [
  {
    href: "/club",
    label: "Resumen",
    icon: Home,
    activeFor: (p: string) => p === "/club",
  },
  {
    href: "/club/dashboard/bookings",
    label: "Gestión",
    icon: CalendarDays,
    activeFor: (p: string) =>
      p.startsWith("/club/dashboard/bookings") ||
      p.startsWith("/club/dashboard/courts") ||
      p.startsWith("/club/dashboard/agenda"),
  },
  {
    href: "/club/dashboard/leagues",
    label: "Competencia",
    icon: Trophy,
    activeFor: (p: string) =>
      p.startsWith("/club/dashboard/leagues") ||
      p.startsWith("/club/dashboard/tournaments"),
  },
  {
    href: "/club/players",
    label: "Comunidad",
    icon: Users,
    activeFor: (p: string) =>
      p.startsWith("/club/players") ||
      p.startsWith("/club/entrenadores") ||
      p.startsWith("/club/matches") ||
      p.startsWith("/club/dashboard/ranking"),
  },
  {
    href: "/club/dashboard/settings",
    label: "Club",
    icon: Settings,
    activeFor: (p: string) =>
      p.startsWith("/club/dashboard/settings") ||
      p.startsWith("/club/profile"),
  },
] as const;

export function ClubBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex h-16">
        {ITEMS.map(({ href, label, icon: Icon, activeFor }) => {
          const active = activeFor(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 transition-colors ${
                active ? "text-blue-600" : "text-slate-400"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-semibold leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
