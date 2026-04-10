"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Home,
  Calendar,
  Zap,
  Users,
  GraduationCap,
  UserCircle,
  LogOut,
  Plus,
  ChevronDown,
  ChevronRight,
  Trophy,
  Star,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useNotificationsContext } from "@/contexts/player-notifications.context";

interface PlayerSidebarProps {
  displayName: string;
  email?: string | null;
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

const itemBase =
  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors w-full";
const activeClass = "bg-blue-50 text-blue-700 font-semibold";
const inactiveClass = "text-slate-700 hover:bg-slate-100 font-medium";

export function PlayerSidebar({
  displayName,
  email,
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

  const onCalendario =
    pathname.startsWith("/player/calendario") ||
    pathname.startsWith("/player/bookings");
  const onActividad =
    pathname.startsWith("/player/matches") ||
    pathname.startsWith("/player/events");
  const onComunidad =
    pathname.startsWith("/player/players") ||
    pathname.startsWith("/player/entrenadores");

  const [calendarioOpen, setCalendarioOpen] = useState(onCalendario);
  const [actividadOpen, setActividadOpen] = useState(onActividad);
  const [comunidadOpen, setComunidadOpen] = useState(onComunidad);

  function cls(active: boolean) {
    return `${itemBase} ${active ? activeClass : inactiveClass}`;
  }

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-60 flex-col border-r border-slate-200 bg-white z-30">
      {/* ── Header ── */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
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
          />
        </div>
        <div className="flex items-center gap-3">
          <UserAvatar src={avatarSrc || null} initials={avatarInitials} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">{displayName}</p>
            {email && (
              <p className="text-xs text-slate-500 truncate">{email}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {/* Resumen */}
        <Link href="/player" className={cls(pathname === "/player")}>
          <Home className="w-4 h-4 shrink-0" />
          Resumen
        </Link>

        {/* Calendario */}
        <div>
          <button
            onClick={() => setCalendarioOpen((o) => !o)}
            className={cls(onCalendario)}
          >
            <Calendar className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-left">Calendario</span>
            <NavBadge count={sectionCounts.calendario} />
            {calendarioOpen ? (
              <ChevronDown className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            )}
          </button>
          {calendarioOpen && (
            <div className="ml-7 mt-0.5 space-y-0.5">
              <Link
                href="/player/calendario"
                className={cls(pathname === "/player/calendario")}
                style={{ fontSize: "0.8125rem", padding: "0.5rem 0.75rem" }}
              >
                Mis reservas
              </Link>
              <Link
                href="/player/entrenadores"
                className={`${itemBase} ${inactiveClass}`}
                style={{ fontSize: "0.8125rem", padding: "0.5rem 0.75rem" }}
              >
                Reservar clase
              </Link>
            </div>
          )}
        </div>

        {/* Actividad */}
        <div>
          <button
            onClick={() => setActividadOpen((o) => !o)}
            className={cls(onActividad)}
          >
            <Zap className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-left">Actividad</span>
            <NavBadge count={actividadBadge} />
            {actividadOpen ? (
              <ChevronDown className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            )}
          </button>
          {actividadOpen && (
            <div className="ml-7 mt-0.5 space-y-0.5">
              <Link
                href="/player/matches"
                className={cls(pathname.startsWith("/player/matches"))}
                style={{ fontSize: "0.8125rem", padding: "0.5rem 0.75rem" }}
              >
                <Trophy className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1">Partidos</span>
                <NavBadge count={sectionCounts.partidos} />
              </Link>
              <Link
                href="/player/events"
                className={cls(pathname.startsWith("/player/events"))}
                style={{ fontSize: "0.8125rem", padding: "0.5rem 0.75rem" }}
              >
                <Star className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1">Eventos</span>
                <NavBadge count={sectionCounts.eventos} />
              </Link>
            </div>
          )}
        </div>

        {/* Comunidad */}
        <div>
          <button
            onClick={() => setComunidadOpen((o) => !o)}
            className={cls(onComunidad)}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-left">Comunidad</span>
            {comunidadOpen ? (
              <ChevronDown className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            )}
          </button>
          {comunidadOpen && (
            <div className="ml-7 mt-0.5 space-y-0.5">
              <Link
                href="/player/players"
                className={cls(pathname.startsWith("/player/players"))}
                style={{ fontSize: "0.8125rem", padding: "0.5rem 0.75rem" }}
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                Jugadores
              </Link>
              <Link
                href="/player/entrenadores"
                className={cls(pathname.startsWith("/player/entrenadores"))}
                style={{ fontSize: "0.8125rem", padding: "0.5rem 0.75rem" }}
              >
                <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                Entrenadores
              </Link>
            </div>
          )}
        </div>

        {/* Mi equipo — solo coaches */}
        {isCoach && (
          <Link
            href="/player/coach"
            className={cls(pathname.startsWith("/player/coach"))}
          >
            <GraduationCap className="w-4 h-4 shrink-0" />
            <span className="flex-1">Mi equipo</span>
            <NavBadge count={sectionCounts.coach} />
          </Link>
        )}

        {/* Perfil */}
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
