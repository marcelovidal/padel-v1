"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { NotificationItem, NotificationType } from "@/lib/actions/notification.actions";

export type NavSection = "partidos" | "reservas" | "coach" | "eventos";
export type SectionCounts = Record<NavSection, number>;

const SECTION_MAP: Partial<Record<NotificationType, NavSection>> = {
  player_match_result_ready:          "partidos",
  coach_invitation:                   "coach",
  coach_invitation_accepted:          "coach",
  coach_challenge_assigned:           "coach",
  coach_booking_request:              "reservas",
  coach_booking_confirmed:            "reservas",
  tournament_open_for_registration:   "eventos",
  league_open_for_registration:       "eventos",
  tournament_registration_confirmed:  "eventos",
  league_registration_confirmed:      "eventos",
  tournament_registration_requested:  "eventos",
  league_registration_requested:      "eventos",
};

const EMPTY_COUNTS: SectionCounts = {
  partidos: 0,
  reservas: 0,
  coach:    0,
  eventos:  0,
};

export function usePlayerNotifications() {
  const [items, setItems]   = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const supabase = createBrowserSupabase();
    const { data, error } = await (supabase as any).rpc("notification_list", {
      p_limit:  50,
      p_target: "player",
    });
    if (!error && Array.isArray(data)) {
      setItems(
        data.map((n: any) => ({
          ...n,
          payload: n.payload ?? {},
        })) as NotificationItem[]
      );
    }
    setLoading(false);
  }, []);

  // Carga inicial + polling cada 30s
  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  // Conteos de no leídas por sección
  const sectionCounts = items
    .filter((i) => !i.read_at)
    .reduce<SectionCounts>(
      (acc, item) => {
        const section = SECTION_MAP[item.type];
        if (section) acc[section]++;
        return acc;
      },
      { ...EMPTY_COUNTS }
    );

  const totalUnread = Object.values(sectionCounts).reduce((a, b) => a + b, 0);

  async function markRead(id: string) {
    const supabase = createBrowserSupabase();
    await (supabase as any).rpc("notification_mark_read", {
      p_notification_id: id,
    });
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
  }

  async function markAllRead() {
    const supabase = createBrowserSupabase();
    await (supabase as any).rpc("notification_mark_all_read", {
      p_target: "player",
    });
    setItems((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
    );
  }

  return { items, loading, sectionCounts, totalUnread, refresh, markRead, markAllRead };
}
