"use client";

import { createContext, useContext } from "react";
import {
  usePlayerNotifications,
  type SectionCounts,
} from "@/hooks/usePlayerNotifications";
import type { NotificationItem } from "@/lib/actions/notification.actions";

interface NotificationsContextValue {
  items: NotificationItem[];
  loading: boolean;
  sectionCounts: SectionCounts;
  totalUnread: number;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function PlayerNotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const value = usePlayerNotifications();
  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotificationsContext(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error(
      "useNotificationsContext debe usarse dentro de PlayerNotificationsProvider"
    );
  }
  return ctx;
}
