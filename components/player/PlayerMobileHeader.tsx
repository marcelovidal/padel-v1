"use client";

import Link from "next/link";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { PasalaLogo } from "@/components/ui/PasalaLogo";
import { useNotificationsContext } from "@/contexts/player-notifications.context";

export function PlayerMobileHeader() {
  const { bellItems, bellUnread, loading, refresh, markRead, markAllRead } =
    useNotificationsContext();

  return (
    <header className="md:hidden sticky top-0 z-20 bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between shrink-0">
      <Link href="/player">
        <PasalaLogo variant="light" size="md" />
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
