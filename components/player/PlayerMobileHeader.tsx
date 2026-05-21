"use client";

import Link from "next/link";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { PasalaLogo } from "@/components/ui/PasalaLogo";
import { useNotificationsContext } from "@/contexts/player-notifications.context";

export function PlayerMobileHeader() {
  const { bellItems, bellUnread, loading, refresh, markRead, markAllRead } =
    useNotificationsContext();

  return (
    <header className="md:hidden sticky top-0 z-20 bg-[var(--bg-sidebar)] border-b border-[var(--border-soft)] px-4 h-14 flex items-center justify-between shrink-0">
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
      />
    </header>
  );
}
