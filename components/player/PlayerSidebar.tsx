"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  Share2,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ProximoEvento } from "@/components/player/ProximoEvento";
import { UltimoPartido } from "@/components/player/UltimoPartido";
import { DesafioActivo } from "@/components/player/DesafioActivo";
import { useNotificationsContext } from "@/contexts/player-notifications.context";

interface PlayerSidebarProps {
  displayName: string;
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

// ── Level 1: ítem principal con ícono ────────────────────────────────────────

const L1_BASE =
  "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium w-full transition-colors";
const L1_INACTIVE = "text-slate-900 hover:bg-slate-100";
const L1_ACTIVE   = "bg-blue-50 text-blue-700 font-semibold";

function l1Cls(active: boolean) {
  return `${L1_BASE} ${active ? L1_ACTIVE : L1_INACTIVE}`;
}

// ── Level 2: sub-ítem sin ícono, indentado ───────────────────────────────────

const L2_BASE =
  "flex items-center pl-9 pr-3 py-1.5 rounded-lg text-[13px] font-normal w-full transition-colors";
const L2_INACTIVE = "text-slate-600 hover:text-blue-600";
const L2_ACTIVE   = "text-blue-600 font-medium";

function l2Cls(active: boolean) {
  return `${L2_BASE} ${active ? L2_ACTIVE : L2_INACTIVE}`;
}

// ── Separador ────────────────────────────────────────────────────────────────

function Divider() {
  return <div className="my-1.5 border-t border-slate-200" />;
}

// ── Acciones contextuales por sección ────────────────────────────────────────

interface Accion {
  label: string;
  icon: React.ElementType;
  href: string;
}

const ACCION_FALLBACK: Accion = {
  label: "Cargar partido",
  icon: Plus,
  href: "/player/matches/new",
};

const ACCIONES: Array<{ match: (p: string) => boolean; accion: Accion }> = [
  {
    match: (p) => p === "/player",
    accion: { label: "Cargar partido", icon: Plus, href: "/player/matches/new" },
  },
  {
    match: (p) => p.startsWith("/player/calendario") || p.startsWith("/player/bookings"),
    accion: { label: "Nueva reserva", icon: Calendar, href: "/player/calendario?action=nueva-reserva" },
  },
  {
    match: (p) => p.startsWith("/player/matches"),
    accion: { label: "Cargar partido", icon: Plus, href: "/player/matches/new" },
  },
  {
    match: (p) => p.startsWith("/player/events"),
    accion: { label: "Ver torneos", icon: Star, href: "/player/events" },
  },
  {
    match: (p) => p.startsWith("/player/players"),
    accion: { label: "Invitar jugador", icon: Users, href: "/player/players?action=invitar" },
  },
  {
    match: (p) => p.startsWith("/player/entrenadores"),
    accion: { label: "Reservar clase", icon: GraduationCap, href: "/player/entrenadores" },
  },
  {
    match: (p) => p.startsWith("/player/coach"),
    accion: { label: "Nueva sesión", icon: GraduationCap, href: "/player/coach?tab=agenda&action=nueva" },
  },
  {
    match: (p) => p.startsWith("/player/profile"),
    accion: { label: "Compartir perfil", icon: Share2, href: "/player/profile" },
  },
];

function resolveAccion(pathname: string): Accion {
  return ACCIONES.find(({ match }) => match(pathname))?.accion ?? ACCION_FALLBACK;
}

// ── Hook: fade-in al cambiar label ───────────────────────────────────────────

function useFadeOnChange(value: string) {
  const [opacity, setOpacity] = useState(1);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current === value) return;
    setOpacity(0);
    const t = setTimeout(() => {
      prev.current = value;
      setOpacity(1);
    }, 100);
    return () => clearTimeout(t);
  }, [value]);

  return { opacity, style: { opacity, transition: "opacity 150ms ease" } as React.CSSProperties };
}

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

  const onCalendario =
    pathname.startsWith("/player/calendario") ||
    pathname.startsWith("/player/bookings");
  const onActividad =
    pathname.startsWith("/player/matches") ||
    pathname.startsWith("/player/events");
  const onComunidad =
    pathname.startsWith("/player/players") ||
    pathname.startsWith("/player/entrenadores");

  const accion = resolveAccion(pathname);
  const { style: fadeStyle } = useFadeOnChange(accion.label);
  const AccionIcon = accion.icon;

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
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">

        {/* Resumen */}
        <Link href="/player" className={l1Cls(pathname === "/player")}>
          <Home className="w-[18px] h-[18px] shrink-0" />
          Resumen
        </Link>

        <Divider />

        {/* Calendario (L1 con ruta propia) */}
        <Link href="/player/calendario" className={l1Cls(onCalendario)}>
          <Calendar className="w-[18px] h-[18px] shrink-0" />
          Calendario
        </Link>
        <Link href="/player/calendario" className={l2Cls(onCalendario && pathname === "/player/calendario")}>
          Mis reservas
          <NavBadge count={sectionCounts.calendario} />
        </Link>
        <Link href="/player/entrenadores" className={l2Cls(false)}>
          Reservar clase
        </Link>

        {/* Actividad (L1 con ruta primaria) */}
        <Link href="/player/matches" className={l1Cls(onActividad)}>
          <Zap className="w-[18px] h-[18px] shrink-0" />
          Actividad
        </Link>
        <Link href="/player/matches" className={l2Cls(pathname.startsWith("/player/matches"))}>
          <Trophy className="w-3.5 h-3.5 shrink-0" />
          Partidos
          <NavBadge count={sectionCounts.partidos} />
        </Link>
        <Link href="/player/events" className={l2Cls(pathname.startsWith("/player/events"))}>
          <Star className="w-3.5 h-3.5 shrink-0" />
          Eventos
          <NavBadge count={sectionCounts.eventos} />
        </Link>

        {/* Comunidad (L1 con ruta primaria) */}
        <Link href="/player/players" className={l1Cls(onComunidad)}>
          <Users className="w-[18px] h-[18px] shrink-0" />
          Comunidad
        </Link>
        <Link href="/player/players" className={l2Cls(pathname.startsWith("/player/players"))}>
          Jugadores
        </Link>
        <Link href="/player/entrenadores" className={l2Cls(pathname.startsWith("/player/entrenadores"))}>
          Entrenadores
        </Link>

        <Divider />

        {/* Mi equipo — solo coaches */}
        {isCoach && (
          <Link href="/player/coach" className={l1Cls(pathname.startsWith("/player/coach"))}>
            <GraduationCap className="w-[18px] h-[18px] shrink-0" />
            <span className="flex-1">Mi equipo</span>
            <NavBadge count={sectionCounts.coach} />
          </Link>
        )}

        {/* Perfil */}
        <Link href="/player/profile" className={l1Cls(pathname.startsWith("/player/profile"))}>
          <UserCircle className="w-[18px] h-[18px] shrink-0" />
          Perfil
        </Link>

      </nav>

      {/* ── Cards de actividad ── */}
      <ProximoEvento />
      <UltimoPartido />
      <DesafioActivo />

      {/* ── Footer ── */}
      <div className="px-3 pb-3 pt-2 border-t border-slate-200 space-y-2">
        <Link
          href={accion.href}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black uppercase tracking-widest text-white hover:bg-blue-700 transition-colors"
          style={fadeStyle}
        >
          <AccionIcon className="w-4 h-4 shrink-0" />
          {accion.label}
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
