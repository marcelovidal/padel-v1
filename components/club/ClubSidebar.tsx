"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Home,
  CalendarDays,
  Trophy,
  Users,
  UserCircle,
  Settings,
  LogOut,
  Plus,
  MapPin,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  GraduationCap,
  Medal,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/UserAvatar";

interface ClubSidebarProps {
  clubName: string;
  city?: string | null;
  avatarSrc?: string | null;
  pendingBookings?: number;
  collapsed: boolean;
  onToggle: () => void;
}

// ── Badge expandido ────────────────────────────────────────────────────────────

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-black leading-none text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}

// ── Badge colapsado (punto) ────────────────────────────────────────────────────

function NavDot({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute top-1 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-1 ring-white" />
  );
}

// ── Clases de ítems ────────────────────────────────────────────────────────────

const L1_BASE =
  "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium w-full transition-colors";
const L1_INACTIVE = "text-slate-900 hover:bg-slate-100";
const L1_ACTIVE = "bg-blue-50 text-blue-700 font-semibold";
function l1Cls(active: boolean) {
  return `${L1_BASE} ${active ? L1_ACTIVE : L1_INACTIVE}`;
}

const L2_BASE =
  "flex items-center pl-9 pr-3 py-1.5 rounded-lg text-[13px] font-normal w-full transition-colors";
const L2_INACTIVE = "text-slate-600 hover:text-blue-600";
const L2_ACTIVE = "text-blue-600 font-medium";
function l2Cls(active: boolean) {
  return `${L2_BASE} ${active ? L2_ACTIVE : L2_INACTIVE}`;
}

// ── Ítem colapsado ─────────────────────────────────────────────────────────────

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

// ── Acciones contextuales ──────────────────────────────────────────────────────

interface Accion {
  label: string;
  icon: React.ElementType;
  href: string;
  isDefault?: boolean;
}

const ACCION_FALLBACK: Accion = {
  label: "Panel general",
  icon: Home,
  href: "/club",
  isDefault: true,
};

const ACCIONES: Array<{ match: (p: string) => boolean; accion: Accion }> = [
  {
    match: (p) =>
      p.startsWith("/club/dashboard/bookings") ||
      p.startsWith("/club/dashboard/courts") ||
      p.startsWith("/club/dashboard/agenda"),
    accion: { label: "Nueva reserva", icon: BookOpen, href: "/club/matches/new" },
  },
  {
    match: (p) =>
      p.startsWith("/club/dashboard/leagues") ||
      p.startsWith("/club/dashboard/tournaments"),
    accion: {
      label: "Crear torneo",
      icon: Trophy,
      href: "/club/dashboard/tournaments/new",
    },
  },
  {
    match: (p) =>
      p.startsWith("/club/players") ||
      p.startsWith("/club/entrenadores") ||
      p.startsWith("/club/matches") ||
      p.startsWith("/club/dashboard/ranking"),
    accion: { label: "Agregar jugador", icon: Plus, href: "/club/players" },
  },
];

function resolveAccion(pathname: string): Accion {
  return ACCIONES.find(({ match }) => match(pathname))?.accion ?? ACCION_FALLBACK;
}

// ── Hook: fade al cambiar label ────────────────────────────────────────────────

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

// ── Componente principal ───────────────────────────────────────────────────────

export function ClubSidebar({
  clubName,
  city,
  avatarSrc,
  pendingBookings = 0,
  collapsed,
  onToggle,
}: ClubSidebarProps) {
  const pathname = usePathname();

  const onGestion =
    pathname.startsWith("/club/dashboard/bookings") ||
    pathname.startsWith("/club/dashboard/courts") ||
    pathname.startsWith("/club/dashboard/agenda");

  const onCompetencia =
    pathname.startsWith("/club/dashboard/leagues") ||
    pathname.startsWith("/club/dashboard/tournaments");

  const onComunidad =
    pathname.startsWith("/club/players") ||
    pathname.startsWith("/club/entrenadores") ||
    pathname.startsWith("/club/matches") ||
    pathname.startsWith("/club/dashboard/ranking");

  const accion = resolveAccion(pathname);
  const { style: fadeStyle } = useFadeOnChange(accion.label);
  const AccionIcon = accion.icon;

  const initials = clubName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "CL";

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
            href="/club"
            title="PASALA — Club"
            className="font-black text-xl text-blue-600 tracking-tighter italic leading-none"
          >
            P
          </Link>
        </div>
      ) : (
        <div className="p-4 border-b border-slate-200">
          <div className="mb-3">
            <Link
              href="/club"
              className="font-black text-2xl text-blue-600 tracking-tighter italic leading-none"
            >
              PASALA
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <UserAvatar src={avatarSrc || null} initials={initials} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{clubName}</p>
              {city && (
                <p className="flex items-center gap-1 text-xs text-slate-500 truncate mt-0.5">
                  <MapPin className="w-3 h-3 shrink-0" />
                  {city}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {collapsed ? (
          <>
            <CollapsedNavItem
              href="/club"
              icon={Home}
              label="Resumen"
              active={pathname === "/club"}
            />
            <Divider />
            <CollapsedNavItem
              href="/club/dashboard/bookings"
              icon={CalendarDays}
              label="Gestión"
              active={onGestion}
              badgeCount={pendingBookings}
            />
            <CollapsedNavItem
              href="/club/dashboard/leagues"
              icon={Trophy}
              label="Competencia"
              active={onCompetencia}
            />
            <CollapsedNavItem
              href="/club/players"
              icon={Users}
              label="Comunidad"
              active={onComunidad}
            />
            <Divider />
            <CollapsedNavItem
              href="/club/profile"
              icon={UserCircle}
              label="Perfil"
              active={pathname.startsWith("/club/profile")}
            />
            <CollapsedNavItem
              href="/club/dashboard/settings"
              icon={Settings}
              label="Ajustes"
              active={pathname.startsWith("/club/dashboard/settings")}
            />
          </>
        ) : (
          <>
            <Link href="/club" className={l1Cls(pathname === "/club")}>
              <Home className="w-[18px] h-[18px] shrink-0" />
              Resumen
            </Link>

            <Divider />

            {/* Gestión */}
            <Link href="/club/dashboard/bookings" className={l1Cls(onGestion)}>
              <CalendarDays className="w-[18px] h-[18px] shrink-0" />
              Gestión
            </Link>
            <Link
              href="/club/dashboard/bookings"
              className={l2Cls(pathname.startsWith("/club/dashboard/bookings"))}
            >
              Reservas
              <NavBadge count={pendingBookings} />
            </Link>
            <Link
              href="/club/dashboard/courts"
              className={l2Cls(pathname.startsWith("/club/dashboard/courts"))}
            >
              Canchas
            </Link>
            <Link
              href="/club/dashboard/agenda"
              className={l2Cls(pathname.startsWith("/club/dashboard/agenda"))}
            >
              Agenda
            </Link>

            {/* Competencia */}
            <Link href="/club/dashboard/leagues" className={l1Cls(onCompetencia)}>
              <Trophy className="w-[18px] h-[18px] shrink-0" />
              Competencia
            </Link>
            <Link
              href="/club/dashboard/leagues"
              className={l2Cls(pathname.startsWith("/club/dashboard/leagues"))}
            >
              <Trophy className="w-3.5 h-3.5 shrink-0" />
              Ligas
            </Link>
            <Link
              href="/club/dashboard/tournaments"
              className={l2Cls(pathname.startsWith("/club/dashboard/tournaments"))}
            >
              <Medal className="w-3.5 h-3.5 shrink-0" />
              Torneos
            </Link>

            {/* Comunidad */}
            <Link href="/club/players" className={l1Cls(onComunidad)}>
              <Users className="w-[18px] h-[18px] shrink-0" />
              Comunidad
            </Link>
            <Link
              href="/club/players"
              className={l2Cls(pathname.startsWith("/club/players"))}
            >
              Jugadores
            </Link>
            <Link
              href="/club/entrenadores"
              className={l2Cls(pathname.startsWith("/club/entrenadores"))}
            >
              <GraduationCap className="w-3.5 h-3.5 shrink-0" />
              Entrenadores
            </Link>
            <Link
              href="/club/matches"
              className={l2Cls(pathname.startsWith("/club/matches"))}
            >
              Partidos
            </Link>
            <Link
              href="/club/dashboard/ranking"
              className={l2Cls(pathname.startsWith("/club/dashboard/ranking"))}
            >
              Ranking
            </Link>

            <Divider />

            <Link
              href="/club/profile"
              className={l1Cls(pathname.startsWith("/club/profile"))}
            >
              <UserCircle className="w-[18px] h-[18px] shrink-0" />
              Perfil
            </Link>
            <Link
              href="/club/dashboard/settings"
              className={l1Cls(pathname.startsWith("/club/dashboard/settings"))}
            >
              <Settings className="w-[18px] h-[18px] shrink-0" />
              Ajustes
            </Link>
          </>
        )}
      </nav>

      {/* ── Footer ── */}
      <div className="px-2 pb-2 pt-2 border-t border-slate-200 space-y-1.5">
        {collapsed ? (
          <>
            <Link
              href={accion.href}
              title={accion.label}
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
          <>
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
          </>
        )}

        {/* Toggle colapso */}
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
