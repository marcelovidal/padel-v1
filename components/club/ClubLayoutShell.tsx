"use client";

import { useState, useEffect } from "react";
import { ClubSidebar } from "@/components/club/ClubSidebar";
import { ClubBottomNav } from "@/components/club/ClubBottomNav";
import { ClubMobileHeader } from "@/components/club/ClubMobileHeader";

interface ClubLayoutShellProps {
  children: React.ReactNode;
  clubName: string;
  city?: string | null;
  avatarSrc?: string | null;
  pendingBookings?: number;
}

export function ClubLayoutShell({
  children,
  clubName,
  city,
  avatarSrc,
  pendingBookings = 0,
}: ClubLayoutShellProps) {
  // SSR default: expanded. useEffect ajusta según localStorage / viewport.
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("padel:club:sidebar:collapsed");
    if (saved !== null) {
      setCollapsed(saved === "true");
    } else {
      // md (768–1023px): colapsado por defecto; lg+: expandido
      setCollapsed(window.innerWidth < 1024);
    }
  }, []);

  const handleToggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("padel:club:sidebar:collapsed", String(next));
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <ClubSidebar
        clubName={clubName}
        city={city}
        avatarSrc={avatarSrc}
        pendingBookings={pendingBookings}
        collapsed={collapsed}
        onToggle={handleToggle}
      />

      {/* Desktop: margin left dinámico según estado del sidebar */}
      <div
        className={`flex flex-col min-h-screen transition-[margin-left] duration-200 ease-in-out ${
          collapsed ? "md:ml-14" : "md:ml-60"
        }`}
      >
        <ClubMobileHeader />
        <main className="pt-6 pb-24 md:pb-6 px-6 xl:px-8">{children}</main>
      </div>

      <ClubBottomNav />
    </div>
  );
}
