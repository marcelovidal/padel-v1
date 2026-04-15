"use client";

import { useState, useEffect } from "react";
import { PlayerSidebar } from "@/components/player/PlayerSidebar";
import { PlayerBottomNav } from "@/components/player/PlayerBottomNav";
import { PlayerMobileHeader } from "@/components/player/PlayerMobileHeader";

interface PlayerLayoutShellProps {
  children: React.ReactNode;
  playerId: string;
  displayName: string;
  location: string | null;
  avatarSrc: string | null;
  avatarInitials: string;
  isCoach: boolean;
  isClubOwner: boolean;
}

export function PlayerLayoutShell({
  children,
  playerId,
  displayName,
  location,
  avatarSrc,
  avatarInitials,
  isCoach,
  isClubOwner,
}: PlayerLayoutShellProps) {
  // SSR default: expanded (md:ml-60). useEffect ajusta según localStorage / viewport.
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("padel:sidebar:collapsed");
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
      localStorage.setItem("padel:sidebar:collapsed", String(next));
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PlayerSidebar
        playerId={playerId}
        displayName={displayName}
        location={location}
        avatarSrc={avatarSrc}
        avatarInitials={avatarInitials}
        isCoach={isCoach}
        isClubOwner={isClubOwner}
        collapsed={collapsed}
        onToggle={handleToggle}
      />

      {/* Desktop: margin left dinámico según estado del sidebar */}
      <div
        className={`flex flex-col min-h-screen transition-[margin-left] duration-200 ease-in-out ${
          collapsed ? "md:ml-14" : "md:ml-60"
        }`}
      >
        <PlayerMobileHeader />
        <main className="pt-6 pb-24 md:pb-6 px-6 xl:px-8">{children}</main>
      </div>

      <PlayerBottomNav playerId={playerId} isCoach={isCoach} isClubOwner={isClubOwner} />
    </div>
  );
}
