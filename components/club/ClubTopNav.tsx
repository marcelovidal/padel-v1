"use client";

import Link from "next/link";
import { useState } from "react";
import { Building2, CalendarDays, Home, LogOut, Menu, UserCircle, Users, X } from "lucide-react";
import { UserAvatar } from "@/components/ui/UserAvatar";

interface ClubTopNavProps {
  clubName: string;
  email?: string | null;
  avatarSrc?: string | null;
}

const navItems = [
  { href: "/club", label: "Resumen", icon: Home },
  { href: "/club/matches", label: "Partidos", icon: CalendarDays },
  { href: "/club/players", label: "Jugadores", icon: Users },
  { href: "/club/profile", label: "Perfil", icon: UserCircle },
];

function initialsFromName(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "CL";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
}

export function ClubTopNav({ clubName, email, avatarSrc }: ClubTopNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/club" className="font-black text-2xl text-blue-600 tracking-tighter italic">
            PASALA
          </Link>
          <nav className="hidden lg:flex gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <button
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          aria-label={open ? "Cerrar menu" : "Abrir menu"}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t bg-white">
          <div className="container mx-auto px-4 py-4 space-y-4">
            <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
              <UserAvatar src={avatarSrc || null} initials={initialsFromName(clubName)} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{clubName}</p>
                <p className="text-xs text-gray-500 truncate">{email || ""}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center gap-2 px-3 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <Link
              href="/welcome"
              onClick={() => setOpen(false)}
              className="inline-flex w-full items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Building2 className="w-4 h-4" />
              Cambiar portal
            </Link>

            <form action="/auth/signout" method="post">
              <button className="inline-flex w-full items-center justify-center gap-2 px-4 py-3 rounded-xl border border-red-200 text-red-600 text-sm font-bold hover:bg-red-50 transition-colors">
                <LogOut className="w-4 h-4" />
                Cerrar sesion
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
