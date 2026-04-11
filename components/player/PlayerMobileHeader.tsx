"use client";

import Link from "next/link";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useNotificationsContext } from "@/contexts/player-notifications.context";

export function PlayerMobileHeader() {
  const { bellItems, bellUnread, loading, refresh, markRead, markAllRead } =
    useNotificationsContext();

  return (
    <header className="md:hidden sticky top-0 z-20 bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between shrink-0">
      <Link
        href="/player"
        className="font-black text-xl text-blue-600 tracking-tighter italic leading-none"
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
      />
    </header>
  );
}
