"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Home,
  Calendar,
  CalendarDays,
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
  ChevronLeft,
  ChevronRight,
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
  collapsed: boolean;
  onToggle: () => void;
}

// ── Badge expandido (texto con número) ───────────────────────────────────────

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-black leading-none text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}

// ── Badge colapsado (punto rojo sobre el ícono) ───────────────────────────────

function NavDot({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute top-1 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-1 ring-white" />
  );
}

// ── Clases para ítems expandidos ─────────────────────────────────────────────

const L1_BASE =
  "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium w-full transition-colors";
const L1_INACTIVE = "text-slate-900 hover:bg-slate-100";
const L1_ACTIVE   = "bg-blue-50 text-blue-700 font-semibold";
function l1Cls(active: boolean) {
  return `${L1_BASE} ${active ? L1_ACTIVE : L1_INACTIVE}`;
}

const L2_BASE =
  "flex items-center pl-9 pr-3 py-1.5 rounded-lg text-[13px] font-normal w-full transition-colors";
const L2_INACTIVE = "text-slate-600 hover:text-blue-600";
const L2_ACTIVE   = "text-blue-600 font-medium";
function l2Cls(active: boolean) {
  return `${L2_BASE} ${active ? L2_ACTIVE : L2_INACTIVE}`;
}

// ── Ítem de nav en modo colapsado ─────────────────────────────────────────────

function CollapsedNavItem({
  href,
  icon: Icon,
  label,
  active,
  badgeCount = 0,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  badgeCount?: number;
}) {
  return (
    <Link
      href={href}
      title={label}
      className={`relative flex h-10 w-full items-center justify-center rounded-xl transition-colors ${
        active
          ? "bg-blue-50 text-blue-700"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      <Icon className="w-[18px] h-[18px]" />
      <NavDot count={badgeCount} />
    </Link>
  );
}

function Divider() {
  return <div className="my-1.5 border-t border-slate-200" />;
}

// ── Acciones contextuales ─────────────────────────────────────────────────────

interface Accion {
  label: string;
  icon: React.ElementType;
  href: string;
  isDefault?: boolean;
}

const ACCION_FALLBACK: Accion = {
  label: "Cargar partido",
  icon: Plus,
  href: "/player/matches/new",
  isDefault: true,
};

const ACCIONES: Array<{ match: (p: string) => boolean; accion: Accion }> = [
  {
    match: (p) => p === "/player",
    accion: { label: "Cargar partido", icon: Plus, href: "/player/matches/new", isDefault: true },
  },
  {
    match: (p) => p.startsWith("/player/calendario") || p.startsWith("/player/bookings"),
    accion: { label: "Nueva reserva", icon: Calendar, href: "/player/calendario?action=nueva-reserva" },
  },
  {
    match: (p) => p.startsWith("/player/matches"),
    accion: { label: "Cargar partido", icon: Plus, href: "/player/matches/new", isDefault: true },
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

// ── Hook: fade al cambiar label ───────────────────────────────────────────────

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
  return { style: { opacity, transition: "opacity 150ms ease" } as React.CSSProperties };
}

// ── Componente principal ──────────────────────────────────────────────────────

export function PlayerSidebar({
  displayName,
  location,
  avatarSrc,
  avatarInitials,
  isCoach,
  collapsed,
  onToggle,
}: PlayerSidebarProps) {
  const pathname = usePathname();

  const { bellItems, bellUnread, loading, sectionCounts, refresh, markRead, markAllRead } =
    useNotificationsContext();

  const onCalendario =
    pathname.startsWith("/player/calendario") || pathname.startsWith("/player/bookings");
  const onActividad =
    pathname.startsWith("/player/matches") || pathname.startsWith("/player/events");
  const onComunidad =
    pathname.startsWith("/player/players") || pathname.startsWith("/player/entrenadores");

  const accion = resolveAccion(pathname);
  const { style: fadeStyle } = useFadeOnChange(accion.label);
  const AccionIcon = accion.icon;

  return (
    <aside
      className={`hidden md:flex fixed left-0 top-0 h-screen flex-col border-r border-slate-200 bg-white z-30 overflow-hidden transition-[width] duration-200 ease-in-out ${
        collapsed ? "w-14" : "w-60"
      }`}
    >
      {/* ── Header ── */}
      {collapsed ? (
        <div className="flex flex-col items-center gap-2.5 py-3 px-1 border-b border-slate-200">
          <Link
            href="/player"
            title="PASALA — Inicio"
            className="font-black text-xl text-blue-600 tracking-tighter italic leading-none"
          >
            P
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
      ) : (
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
      )}

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {collapsed ? (
          /* ── Modo colapsado: solo íconos ── */
          <>
            <CollapsedNavItem href="/player" icon={Home} label="Resumen" active={pathname === "/player"} />
            <Divider />
            <CollapsedNavItem
              href="/player/calendario"
              icon={Calendar}
              label="Calendario"
              active={onCalendario}
              badgeCount={sectionCounts.calendario}
            />
            <CollapsedNavItem
              href="/player/matches"
              icon={Zap}
              label="Actividad"
              active={onActividad}
              badgeCount={sectionCounts.partidos + sectionCounts.eventos}
            />
            <CollapsedNavItem
              href="/player/players"
              icon={Users}
              label="Comunidad"
              active={onComunidad}
            />
            <Divider />
            {isCoach && (
              <CollapsedNavItem
                href="/player/coach"
                icon={GraduationCap}
                label="Mi equipo"
                active={pathname.startsWith("/player/coach")}
                badgeCount={sectionCounts.coach}
              />
            )}
            <CollapsedNavItem
              href="/player/profile"
              icon={UserCircle}
              label="Perfil"
              active={pathname.startsWith("/player/profile")}
            />
          </>
        ) : (
          /* ── Modo expandido: íconos + etiquetas + sub-ítems ── */
          <>
            <Link href="/player" className={l1Cls(pathname === "/player")}>
              <Home className="w-[18px] h-[18px] shrink-0" />
              Resumen
            </Link>

            <Divider />

            <Link href="/player/calendario" className={l1Cls(onCalendario)}>
              <Calendar className="w-[18px] h-[18px] shrink-0" />
              Calendario
            </Link>
            <Link
              href="/player/calendario"
              className={l2Cls(onCalendario && pathname === "/player/calendario")}
            >
              <CalendarDays className="w-[15px] h-[15px] shrink-0" />
              Mis reservas
              <NavBadge count={sectionCounts.calendario} />
            </Link>
            <Link href="/player/entrenadores" className={l2Cls(false)}>
              <GraduationCap className="w-[15px] h-[15px] shrink-0" />
              Reservar clase
            </Link>

            <Link href="/player/matches" className={l1Cls(onActividad)}>
              <Zap className="w-[18px] h-[18px] shrink-0" />
              Actividad
            </Link>
            <Link
              href="/player/matches"
              className={l2Cls(pathname.startsWith("/player/matches"))}
            >
              <Trophy className="w-3.5 h-3.5 shrink-0" />
              Partidos
              <NavBadge count={sectionCounts.partidos} />
            </Link>
            <Link
              href="/player/events"
              className={l2Cls(pathname.startsWith("/player/events"))}
            >
              <Star className="w-3.5 h-3.5 shrink-0" />
              Eventos
              <NavBadge count={sectionCounts.eventos} />
            </Link>

            <Link href="/player/players" className={l1Cls(onComunidad)}>
              <Users className="w-[18px] h-[18px] shrink-0" />
              Comunidad
            </Link>
            <Link
              href="/player/players"
              className={l2Cls(pathname.startsWith("/player/players"))}
            >
              <Users className="w-[15px] h-[15px] shrink-0" />
              Jugadores
            </Link>
            <Link
              href="/player/entrenadores"
              className={l2Cls(pathname.startsWith("/player/entrenadores"))}
            >
              <GraduationCap className="w-[15px] h-[15px] shrink-0" />
              Entrenadores
            </Link>

            <Divider />

            {isCoach && (
              <Link
                href="/player/coach"
                className={l1Cls(pathname.startsWith("/player/coach"))}
              >
                <GraduationCap className="w-[18px] h-[18px] shrink-0" />
                <span className="flex-1">Mi equipo</span>
                <NavBadge count={sectionCounts.coach} />
              </Link>
            )}

            <Link
              href="/player/profile"
              className={l1Cls(pathname.startsWith("/player/profile"))}
            >
              <UserCircle className="w-[18px] h-[18px] shrink-0" />
              Perfil
            </Link>
          </>
        )}
      </nav>

      {/* ── Cards de actividad (ocultas en collapsed, no desmontadas) ── */}
      <div className={collapsed ? "hidden" : ""}>
        <ProximoEvento />
        <UltimoPartido />
        <DesafioActivo />
      </div>

      {/* ── Footer ── */}
      <div className="px-2 pb-2 pt-2 border-t border-slate-200 space-y-1.5">
        {collapsed ? (
          /* Modo colapsado: solo ícono + */
          <>
            <Link
              href="/player/bookings/new"
              title="Reservar y crear partido"
              className="flex h-10 w-full items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </Link>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                title="Cerrar sesión"
                className="flex h-9 w-full items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          /* Modo expandido: botones completos */
          <>
            {accion.isDefault ? (
              <>
                <Link
                  href="/player/bookings/new"
                  className="flex w-full flex-col items-start rounded-lg bg-blue-600 px-3 py-2 hover:bg-blue-700 transition-colors"
                >
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-200 leading-none mb-0.5">
                    En un club
                  </span>
                  <span className="text-[12px] font-semibold text-white leading-none">
                    Reservar y crear partido
                  </span>
                </Link>
                <Link
                  href="/player/matches/new?mode=direct"
                  className="flex w-full flex-col items-start rounded-lg border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50 transition-colors"
                >
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-0.5">
                    Sin club
                  </span>
                  <span className="text-[12px] font-semibold text-slate-900 leading-none">
                    Solo crear partido
                  </span>
                </Link>
              </>
            ) : (
              <Link
                href={accion.href}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black uppercase tracking-widest text-white hover:bg-blue-700 transition-colors"
                style={fadeStyle}
              >
                <AccionIcon className="w-4 h-4 shrink-0" />
                {accion.label}
              </Link>
            )}
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </button>
            </form>
          </>
        )}

        {/* Toggle expandir / colapsar */}
        <button
          onClick={onToggle}
          title={collapsed ? "Expandir menú" : "Colapsar menú"}
          className={`flex w-full items-center rounded-xl px-2 py-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors ${
            collapsed ? "justify-center" : "gap-1.5"
          }`}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 shrink-0" />
              <span className="text-xs">Colapsar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
