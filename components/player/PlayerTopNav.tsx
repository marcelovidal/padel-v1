"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Home, Trophy, Users, UserCircle, LogOut, Plus, Menu, X, CalendarDays, Star, GraduationCap } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useNotificationsContext } from "@/contexts/player-notifications.context";
import type { NavSection } from "@/hooks/usePlayerNotifications";

interface PlayerTopNavProps {
    displayName: string;
    email?: string | null;
    avatarSrc?: string | null;
    avatarInitials?: string;
    isCoach?: boolean;
}

interface NavItem {
    href: string;
    label: string;
    icon: React.ElementType;
    section?: NavSection;
}

const BASE_NAV_ITEMS: NavItem[] = [
    { href: "/player",          label: "Resumen",  icon: Home },
    { href: "/player/matches",  label: "Partidos", icon: Trophy,      section: "partidos" },
    { href: "/player/events",   label: "Eventos",  icon: Star,        section: "eventos" },
    { href: "/player/calendario", label: "Calendario", icon: CalendarDays, section: "calendario" },
    { href: "/player/players",      label: "Jugadores",    icon: Users },
    { href: "/player/entrenadores", label: "Entrenadores", icon: GraduationCap },
    { href: "/player/profile",  label: "Perfil",   icon: UserCircle },
];

const COACH_NAV_ITEM: NavItem = {
    href: "/player/coach",
    label: "Mi equipo",
    icon: GraduationCap,
    section: "coach",
};

function NavBadge({ count }: { count: number }) {
    if (count <= 0) return null;
    return (
        <span className="ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black leading-none text-white">
            {count > 9 ? "9+" : count}
        </span>
    );
}

export function PlayerTopNav({ displayName, email, avatarSrc, avatarInitials, isCoach }: PlayerTopNavProps) {
    const [open, setOpen] = useState(false);
    const navItems = isCoach ? [...BASE_NAV_ITEMS, COACH_NAV_ITEM] : BASE_NAV_ITEMS;

    const { bellItems, bellUnread, loading, sectionCounts, refresh, markRead, markAllRead } =
        useNotificationsContext();

    return (
        <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <Link href="/player" className="font-black text-2xl text-blue-600 tracking-tighter italic">
                        PASALA
                    </Link>
                    <nav className="hidden lg:flex gap-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const badge = item.section ? sectionCounts[item.section] : 0;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                >
                                    <Icon className="w-4 h-4" />
                                    {item.label}
                                    <NavBadge count={badge} />
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="flex items-center gap-3">
                    <NotificationBell
                        items={bellItems}
                        totalUnread={bellUnread}
                        loading={loading}
                        onMarkRead={markRead}
                        onMarkAllRead={markAllRead}
                        onRefresh={refresh}
                    />
                    <div className="hidden md:flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
                        <UserAvatar src={avatarSrc || null} initials={avatarInitials} size="xs" />
                        <div className="min-w-0 max-w-[180px]">
                            <p className="truncate text-xs font-bold text-gray-800 leading-none">
                                {displayName}
                            </p>
                        </div>
                    </div>
                    <Link href="/player/matches/new" className="hidden md:inline-flex">
                        <Button className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest px-4">
                            <Plus className="w-4 h-4 mr-1" />
                            Cargar partido
                        </Button>
                    </Link>
                    <button
                        onClick={() => setOpen((prev) => !prev)}
                        className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                        aria-label={open ? "Cerrar menú" : "Abrir menú"}
                    >
                        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {open && (
                <div className="border-t bg-white">
                    <div className="container mx-auto px-4 py-4 space-y-4">
                        <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
                            <UserAvatar src={avatarSrc || null} initials={avatarInitials} size="sm" />
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-gray-900 truncate">{displayName}</p>
                                <p className="text-xs text-gray-500 truncate">{email || ""}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const badge = item.section ? sectionCounts[item.section] : 0;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setOpen(false)}
                                        className="inline-flex items-center gap-2 px-3 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                    >
                                        <Icon className="w-4 h-4" />
                                        {item.label}
                                        <NavBadge count={badge} />
                                    </Link>
                                );
                            })}
                        </div>

                        <Link
                            href="/player/matches/new"
                            onClick={() => setOpen(false)}
                            className="md:hidden inline-flex w-full items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 text-white text-sm font-black uppercase tracking-widest"
                        >
                            <Plus className="w-4 h-4" />
                            Cargar partido
                        </Link>

                        <form action="/auth/signout" method="post">
                            <button className="inline-flex w-full items-center justify-center gap-2 px-4 py-3 rounded-xl border border-red-200 text-red-600 text-sm font-bold hover:bg-red-50 transition-colors">
                                <LogOut className="w-4 h-4" />
                                Cerrar sesión
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </header>
    );
}
