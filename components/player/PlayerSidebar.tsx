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
  ChevronDown,
  Building2,
  LayoutDashboard,
  Dumbbell,
  Settings,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { PasalaLogo } from "@/components/ui/PasalaLogo";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ProximoEvento } from "@/components/player/ProximoEvento";
import { UltimoPartido } from "@/components/player/UltimoPartido";
import { DesafioActivo } from "@/components/player/DesafioActivo";
import { useNotificationsContext } from "@/contexts/player-notifications.context";

interface PlayerSidebarProps {
  playerId: string;
  displayName: string;
  location?: string | null;
  avatarSrc?: string | null;
  avatarInitials?: string;
  isCoach: boolean;
  isClubOwner: boolean;
  collapsed: boolean;
  onToggle: () => void;
  hasClubsWithCourts?: boolean;
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
    <span className="absolute top-1 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-1 ring-[var(--bg-sidebar)]" />
  );
}

// ── Clases para ítems expandidos ─────────────────────────────────────────────

const L1_BASE =
  "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium w-full transition-colors";
const L1_INACTIVE = "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]";
const L1_ACTIVE   = "bg-[var(--pill-red-bg)] text-[var(--pill-red-text)] font-semibold";
function l1Cls(active: boolean) {
  return `${L1_BASE} ${active ? L1_ACTIVE : L1_INACTIVE}`;
}

const L2_BASE =
  "flex items-center pl-9 pr-3 py-1.5 rounded-lg text-[13px] font-normal w-full transition-colors";
const L2_INACTIVE = "text-[var(--text-muted)] hover:text-[var(--pill-red-text)]";
const L2_ACTIVE   = "text-[var(--pill-red-text)] font-medium";
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
          ? "bg-[var(--pill-red-bg)] text-[var(--pill-red-text)]"
          : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
      }`}
    >
      <Icon className="w-[18px] h-[18px]" />
      <NavDot count={badgeCount} />
    </Link>
  );
}

function Divider() {
  return <div className="my-1.5 border-t border-[var(--border-soft)]" />;
}

// ── Sección colapsable animada ─────────────────────────────────────────────────

function NavSection({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) {
  return (
    <div
      className="grid transition-[grid-template-rows] duration-200 ease-in-out"
      style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

// ── L1 colapsable (botón con chevron) ─────────────────────────────────────────

function L1Toggle({
  active,
  isOpen,
  icon: Icon,
  label,
  badge = 0,
  onClick,
}: {
  active: boolean;
  isOpen: boolean;
  icon: React.ElementType;
  label: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={l1Cls(active)}>
      <Icon className="w-[18px] h-[18px] shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      {badge > 0 && <NavBadge count={badge} />}
      <ChevronDown
        className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`}
      />
    </button>
  );
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
  playerId,
  displayName,
  location,
  avatarSrc,
  avatarInitials,
  isCoach,
  isClubOwner,
  collapsed,
  onToggle,
  hasClubsWithCourts = false,
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
  const onMiClub = pathname.startsWith("/player/mi-club");
  const onProfileEdit = pathname === `/player/players/${playerId}/edit`;
  const onCoach = pathname.startsWith("/player/coach");
  const onPerfil =
    pathname.startsWith("/player/profile") ||
    onCoach ||
    onMiClub ||
    onProfileEdit;

  type SectionKey = "actividad" | "comunidad" | "miclub" | "perfil";
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    actividad: onActividad,
    comunidad: onComunidad,
    miclub: onMiClub,
    perfil: onPerfil,
  });

  function toggleSection(key: SectionKey) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  useEffect(() => {
    setOpenSections((prev) => ({
      actividad: onActividad ? true : prev.actividad,
      comunidad: onComunidad ? true : prev.comunidad,
      miclub: onMiClub ? true : prev.miclub,
      perfil: onPerfil ? true : prev.perfil,
    }));
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const accion = resolveAccion(pathname);
  const { style: fadeStyle } = useFadeOnChange(accion.label);
  const AccionIcon = accion.icon;

  return (
    <aside
      className={`hidden md:flex fixed left-0 top-0 h-screen flex-col border-r border-[var(--border-soft)] bg-[var(--bg-sidebar)] z-30 overflow-hidden transition-[width] duration-200 ease-in-out ${
        collapsed ? "w-14" : "w-60"
      }`}
    >
      {/* ── Header ── */}
      {collapsed ? (
        <div className="flex flex-col items-center gap-2.5 py-3 px-1 border-b border-[var(--border-soft)]">
          <Link href="/player" title="PASALA — Inicio">
            <PasalaLogo iconOnly size="sm" />
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
        <div className="p-4 border-b border-[var(--border-soft)]">
          <div className="flex items-center justify-between mb-3">
            <Link href="/player" className="text-[var(--text-primary)]">
              <PasalaLogo variant="auto" size="md" />
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
              <p className="text-sm font-bold text-[var(--text-primary)] truncate">{displayName}</p>
              {location && (
                <p className="flex items-center gap-1 text-xs text-[var(--text-muted)] truncate mt-0.5">
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
              label="Mis Reservas"
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
            {isClubOwner && (
              <CollapsedNavItem
                href="/player/mi-club"
                icon={Building2}
                label="Mi club"
                active={onMiClub}
              />
            )}
            <CollapsedNavItem
              href="/player/profile"
              icon={UserCircle}
              label="Perfil"
              active={onPerfil}
            />
          </>
        ) : (
          /* ── Modo expandido: íconos + etiquetas + sub-ítems colapsables ── */
          <>
            <Link href="/player" className={l1Cls(pathname === "/player")}>
              <Home className="w-[18px] h-[18px] shrink-0" />
              Resumen
            </Link>

            <Divider />

            {/* Mis Reservas — sin sub-ítems, badge directo */}
            <Link href="/player/calendario" className={l1Cls(onCalendario)}>
              <Calendar className="w-[18px] h-[18px] shrink-0" />
              <span className="flex-1">Mis Reservas</span>
              <NavBadge count={sectionCounts.calendario} />
            </Link>

            {/* Actividad */}
            <L1Toggle
              active={onActividad}
              isOpen={openSections.actividad}
              icon={Zap}
              label="Actividad"
              badge={sectionCounts.partidos + sectionCounts.eventos}
              onClick={() => toggleSection("actividad")}
            />
            <NavSection isOpen={openSections.actividad}>
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
            </NavSection>

            {/* Comunidad */}
            <L1Toggle
              active={onComunidad}
              isOpen={openSections.comunidad}
              icon={Users}
              label="Comunidad"
              onClick={() => toggleSection("comunidad")}
            />
            <NavSection isOpen={openSections.comunidad}>
              <Link href="/player/players" className={l2Cls(pathname.startsWith("/player/players"))}>
                <Users className="w-[15px] h-[15px] shrink-0" />
                Jugadores
              </Link>
              <Link href="/player/entrenadores" className={l2Cls(pathname.startsWith("/player/entrenadores"))}>
                <GraduationCap className="w-[15px] h-[15px] shrink-0" />
                Entrenadores
              </Link>
            </NavSection>

            <Divider />

            {isCoach && (
              <Link href="/player/coach" className={l1Cls(pathname.startsWith("/player/coach"))}>
                <GraduationCap className="w-[18px] h-[18px] shrink-0" />
                <span className="flex-1">Mi equipo</span>
                <NavBadge count={sectionCounts.coach} />
              </Link>
            )}

            {/* Mi club */}
            {isClubOwner && (
              <>
                <L1Toggle
                  active={onMiClub}
                  isOpen={openSections.miclub}
                  icon={Building2}
                  label="Mi club"
                  onClick={() => toggleSection("miclub")}
                />
                <NavSection isOpen={openSections.miclub}>
                  <Link href="/player/mi-club" className={l2Cls(onMiClub && pathname === "/player/mi-club")}>
                    <LayoutDashboard className="w-[15px] h-[15px] shrink-0" />
                    Dashboard
                  </Link>
                  <Link href="/player/mi-club/dashboard/bookings" className={l2Cls(pathname.startsWith("/player/mi-club/dashboard/bookings"))}>
                    <Calendar className="w-[15px] h-[15px] shrink-0" />
                    Reservas
                  </Link>
                  <Link href="/player/mi-club/dashboard/courts" className={l2Cls(pathname.startsWith("/player/mi-club/dashboard/courts"))}>
                    <Dumbbell className="w-[15px] h-[15px] shrink-0" />
                    Canchas
                  </Link>
                  <Link href="/player/mi-club/dashboard/leagues" className={l2Cls(pathname.startsWith("/player/mi-club/dashboard/leagues"))}>
                    <Trophy className="w-[15px] h-[15px] shrink-0" />
                    Ligas
                  </Link>
                  <Link href="/player/mi-club/dashboard/tournaments" className={l2Cls(pathname.startsWith("/player/mi-club/dashboard/tournaments"))}>
                    <Star className="w-[15px] h-[15px] shrink-0" />
                    Torneos
                  </Link>
                  <Link href="/player/mi-club/jugadores" className={l2Cls(pathname.startsWith("/player/mi-club/jugadores"))}>
                    <Users className="w-[15px] h-[15px] shrink-0" />
                    Jugadores
                  </Link>
                  <Link href="/player/mi-club/ajustes" className={l2Cls(pathname.startsWith("/player/mi-club/ajustes"))}>
                    <Settings className="w-[15px] h-[15px] shrink-0" />
                    Ajustes
                  </Link>
                </NavSection>
              </>
            )}

            {/* Perfil */}
            <L1Toggle
              active={onPerfil}
              isOpen={openSections.perfil}
              icon={UserCircle}
              label="Perfil"
              onClick={() => toggleSection("perfil")}
            />
            <NavSection isOpen={openSections.perfil}>
              <Link href="/player/profile" className={l2Cls(pathname.startsWith("/player/profile") && !onProfileEdit)}>
                <UserCircle className="w-[15px] h-[15px] shrink-0" />
                Mi perfil
              </Link>
              <Link href={`/player/players/${playerId}/edit`} className={l2Cls(onProfileEdit)}>
                <UserCircle className="w-[15px] h-[15px] shrink-0" />
                Editar perfil
              </Link>
              <Link href="/player/coach" className={l2Cls(onCoach)}>
                <GraduationCap className="w-[15px] h-[15px] shrink-0" />
                {isCoach ? "Mi equipo" : "Perfil entrenador"}
              </Link>
              {!isClubOwner && (
                <Link href="/player/profile?access=club" className={l2Cls(false)}>
                  <Building2 className="w-[15px] h-[15px] shrink-0" />
                  Acceso club
                </Link>
              )}
            </NavSection>
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
      <div className="px-2 pb-2 pt-2 border-t border-[var(--border-soft)] space-y-1.5">
        {collapsed ? (
          /* Modo colapsado: solo ícono + */
          <>
            <Link
              href={hasClubsWithCourts ? "/player/bookings/new" : "/player/matches/new?mode=direct"}
              title={hasClubsWithCourts ? "Reservar y crear partido" : "Solo crear partido"}
              className="flex h-10 w-full items-center justify-center rounded-xl bg-[#E5352A] text-white hover:bg-[#B82820] transition-colors"
            >
              <Plus className="w-4 h-4" />
            </Link>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                title="Cerrar sesión"
                className="flex h-9 w-full items-center justify-center rounded-xl border border-[var(--border-strong)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          /* Modo expandido: botones completos */
          <>
            {accion.isDefault ? (
              hasClubsWithCourts ? (
                <>
                  <Link
                    href="/player/bookings/new"
                    className="flex w-full flex-col items-start rounded-lg bg-[#E5352A] px-3 py-2 hover:bg-[#B82820] transition-colors"
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest text-red-200 leading-none mb-0.5">
                      En un club
                    </span>
                    <span className="text-[12px] font-semibold text-white leading-none">
                      Reservar y crear partido
                    </span>
                  </Link>
                  <Link
                    href="/player/matches/new?mode=direct"
                    className="flex w-full flex-col items-start rounded-lg border border-[var(--border-soft)] bg-[var(--bg-card)] px-3 py-2 hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-faint)] leading-none mb-0.5">
                      Sin club
                    </span>
                    <span className="text-[12px] font-semibold text-[var(--text-primary)] leading-none">
                      Solo crear partido
                    </span>
                  </Link>
                </>
              ) : (
                /* El cartel rojo "Sin club" no aplica a un dueño de club:
                   para él la acción sigue disponible pero sin esa etiqueta. */
                <Link
                  href="/player/matches/new?mode=direct"
                  className={`flex w-full flex-col items-start rounded-lg px-3 py-2 transition-colors ${
                    isClubOwner
                      ? "border border-[var(--border-soft)] bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)]"
                      : "bg-[#E5352A] hover:bg-[#B82820]"
                  }`}
                >
                  {!isClubOwner && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-red-200 leading-none mb-0.5">
                      Sin club
                    </span>
                  )}
                  <span
                    className={`text-[12px] font-semibold leading-none ${
                      isClubOwner ? "text-[var(--text-primary)]" : "text-white"
                    }`}
                  >
                    Solo crear partido
                  </span>
                </Link>
              )
            ) : (
              <Link
                href={accion.href}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E5352A] px-4 py-2.5 text-sm font-black uppercase tracking-widest text-white hover:bg-[#B82820] transition-colors"
                style={fadeStyle}
              >
                <AccionIcon className="w-4 h-4 shrink-0" />
                {accion.label}
              </Link>
            )}
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-strong)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
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
          className={`flex w-full items-center rounded-xl px-2 py-1.5 text-[var(--text-faint)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-secondary)] transition-colors ${
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
