"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Calendar,
  Zap,
  Users,
  GraduationCap,
  UserCircle,
  LogOut,
  Plus,
  Trophy,
  Star,
  MapPin,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useNotificationsContext } from "@/contexts/player-notifications.context";

interface PlayerSidebarProps {
  displayName: string;
  /** "General Roca, RN" o similar — reemplaza el email en el header */
  location?: string | null;
  avatarSrc?: string | null;
  avatarInitials?: string;
  isCoach: boolean;
}

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-black leading-none text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}

/** Label de sección sin ruta propia */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400 select-none">
      {children}
    </p>
  );
}

const itemBase =
  "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors w-full";
const activeClass = "bg-blue-50 text-blue-700 font-semibold";
const inactiveClass = "text-slate-700 hover:bg-slate-100 font-medium";
const subItemBase =
  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[0.8125rem] transition-colors w-full";

export function PlayerSidebar({
  displayName,
  location,
  avatarSrc,
  avatarInitials,
  isCoach,
}: PlayerSidebarProps) {
  const pathname = usePathname();

  const {
    bellItems,
    bellUnread,
    loading,
    sectionCounts,
    refresh,
    markRead,
    markAllRead,
  } = useNotificationsContext();

  const actividadBadge = sectionCounts.partidos + sectionCounts.eventos;

  function cls(active: boolean, base = itemBase) {
    return `${base} ${active ? activeClass : inactiveClass}`;
  }

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-60 flex-col border-r border-slate-200 bg-white z-30">
      {/* ── Header ── */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <Link
            href="/player"
            className="font-black text-2xl text-blue-600 tracking-tighter italic leading-none"
          >
            PASALA
          </Link>
          <NotificationBell
            items={bellItems}
            totalUnread={bellUnread}
            loading={loading}
            onMarkRead={markRead}
            onMarkAllRead={markAllRead}
            onRefresh={refresh}
            dropdownAlign="left"
          />
        </div>
        <div className="flex items-center gap-3">
          <UserAvatar src={avatarSrc || null} initials={avatarInitials} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">{displayName}</p>
            {location && (
              <p className="flex items-center gap-1 text-xs text-slate-500 truncate mt-0.5">
                <MapPin className="w-3 h-3 shrink-0" />
                {location}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {/* Resumen */}
        <Link href="/player" className={cls(pathname === "/player")}>
          <Home className="w-4 h-4 shrink-0" />
          Resumen
        </Link>

        {/* Calendario */}
        <SectionLabel>Calendario</SectionLabel>
        <Link
          href="/player/calendario"
          className={cls(
            pathname.startsWith("/player/calendario") || pathname.startsWith("/player/bookings")
          )}
        >
          <Calendar className="w-4 h-4 shrink-0" />
          <span className="flex-1">Mis reservas</span>
          <NavBadge count={sectionCounts.calendario} />
        </Link>
        <Link
          href="/player/entrenadores"
          className={cls(false, subItemBase)}
        >
          Reservar clase
        </Link>

        {/* Actividad */}
        <SectionLabel>Actividad</SectionLabel>
        <Link
          href="/player/matches"
          className={cls(pathname.startsWith("/player/matches"))}
        >
          <Trophy className="w-4 h-4 shrink-0" />
          <span className="flex-1">Partidos</span>
          <NavBadge count={sectionCounts.partidos} />
        </Link>
        <Link
          href="/player/events"
          className={cls(pathname.startsWith("/player/events"))}
        >
          <Star className="w-4 h-4 shrink-0" />
          <span className="flex-1">Eventos</span>
          <NavBadge count={sectionCounts.eventos} />
        </Link>

        {/* Comunidad */}
        <SectionLabel>Comunidad</SectionLabel>
        <Link
          href="/player/players"
          className={cls(pathname.startsWith("/player/players"))}
        >
          <Users className="w-4 h-4 shrink-0" />
          Jugadores
        </Link>
        <Link
          href="/player/entrenadores"
          className={cls(pathname.startsWith("/player/entrenadores"))}
        >
          <GraduationCap className="w-4 h-4 shrink-0" />
          Entrenadores
        </Link>

        {/* Mi equipo — solo coaches */}
        {isCoach && (
          <>
            <SectionLabel>Equipo</SectionLabel>
            <Link
              href="/player/coach"
              className={cls(pathname.startsWith("/player/coach"))}
            >
              <GraduationCap className="w-4 h-4 shrink-0" />
              <span className="flex-1">Mi equipo</span>
              <NavBadge count={sectionCounts.coach} />
            </Link>
          </>
        )}

        {/* Perfil */}
        <SectionLabel>Cuenta</SectionLabel>
        <Link
          href="/player/profile"
          className={cls(pathname.startsWith("/player/profile"))}
        >
          <UserCircle className="w-4 h-4 shrink-0" />
          Perfil
        </Link>
      </nav>

      {/* ── Footer ── */}
      <div className="p-3 border-t border-slate-200 space-y-2">
        <Link
          href="/player/matches/new"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black uppercase tracking-widest text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Cargar partido
        </Link>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
