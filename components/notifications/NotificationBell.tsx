"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics/gtag";
import {
  getNotificationsAction,
  getUnreadNotificationCountAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  type NotificationItem,
  type NotificationTarget,
} from "@/lib/actions/notification.actions";

function formatRelative(createdAt: string) {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return "recién";
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "recién";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

function fallbackTitleByType(type: NotificationItem["type"]) {
  switch (type) {
    case "player_match_result_ready":
      return "Resultado cargado";
    case "player_claim_success":
      return "Perfil reclamado";
    case "club_claim_requested":
      return "Nuevo reclamo de club";
    case "club_match_created":
      return "Nuevo partido en tu club";
    case "tournament_open_for_registration":
      return "Torneo abierto para inscripcion";
    case "league_open_for_registration":
      return "Liga abierta para inscripcion";
    case "tournament_registration_requested":
      return "Nueva solicitud de torneo";
    case "league_registration_requested":
      return "Nueva solicitud de liga";
    case "tournament_registration_confirmed":
      return "Inscripcion a torneo confirmada";
    case "league_registration_confirmed":
      return "Inscripcion a liga confirmada";
    default:
      return "Nueva notificacion";
  }
}

export function NotificationBell({ target }: { target: NotificationTarget }) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    const [listRes, countRes] = await Promise.all([
      getNotificationsAction({ target, limit: 10 }),
      getUnreadNotificationCountAction({ target }),
    ]);
    if (listRes.success) setItems(listRes.data);
    if (countRes.success) setUnreadCount(countRes.count);
  }, [target]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const unreadIds = useMemo(
    () => new Set(items.filter((i) => !i.read_at).map((i) => i.id)),
    [items]
  );

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      trackEvent("notification_bell_opened", { target });
      setLoading(true);
      try {
        await refresh();
      } finally {
        setLoading(false);
      }
    }
  }

  async function handleItemClick(item: NotificationItem) {
    if (unreadIds.has(item.id)) {
      const res = await markNotificationReadAction({ id: item.id });
      if (res.success) {
        setItems((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        trackEvent("notification_mark_read", { target, type: item.type });
      }
    }

    trackEvent("notification_clicked", {
      target,
      type: item.type,
      has_link: Boolean(item.payload?.link),
    });

    if (item.payload?.link && typeof item.payload.link === "string") {
      const shouldGoToRegistrations =
        item.type === "tournament_registration_requested" ||
        item.type === "league_registration_requested";
      let link = item.payload.link;
      if (shouldGoToRegistrations && !link.includes("#")) {
        link = `${link}#registrations`;
      }

      setOpen(false);
      const [pathname, hash] = link.split("#");
      if (typeof window !== "undefined" && pathname === window.location.pathname && hash) {
        const targetEl = document.getElementById(hash);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
      }
      router.push(link);
    }
  }

  async function handleMarkAllRead() {
    const res = await markAllNotificationsReadAction({ target });
    if (!res.success) return;
    if (res.count > 0) {
      setItems((prev) =>
        prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
      trackEvent("notification_mark_all_read", { target, count: res.count });
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={handleToggle}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 min-w-[18px] h-[18px] rounded-full bg-red-500 px-1 text-[10px] leading-[18px] text-white font-black text-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-[340px] max-w-[calc(100vw-1rem)] rounded-2xl border border-gray-200 bg-white shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div>
              <p className="text-sm font-black text-gray-900">Notificaciones</p>
              <p className="text-[11px] text-gray-500">
                {unreadCount > 0 ? `${unreadCount} sin leer` : "Sin pendientes"}
              </p>
            </div>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700"
              >
                Marcar todo
              </button>
            ) : null}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="px-4 py-6 text-sm text-gray-500">Cargando...</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <CheckCircle2 className="mx-auto mb-2 h-5 w-5 text-gray-300" />
                <p className="text-sm font-semibold text-gray-700">Todavia no hay novedades</p>
                <p className="text-xs text-gray-500 mt-1">
                  Cuando haya actividad relevante, la vas a ver aca.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {items.map((item) => {
                  const isUnread = !item.read_at;
                  const title =
                    (typeof item.payload?.title === "string" && item.payload.title) ||
                    fallbackTitleByType(item.type);
                  const message =
                    (typeof item.payload?.message === "string" && item.payload.message) || "";
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => void handleItemClick(item)}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                          isUnread ? "bg-blue-50/40" : "bg-white"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
                              isUnread ? "bg-blue-600" : "bg-gray-300"
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <p className="truncate text-sm font-bold text-gray-900">{title}</p>
                              <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                {formatRelative(item.created_at)}
                              </span>
                            </div>
                            {message ? (
                              <p className="mt-1 text-xs leading-relaxed text-gray-600">
                                {message}
                              </p>
                            ) : null}
                            {typeof item.payload?.cta_label === "string" ? (
                              <p className="mt-1 text-[11px] font-bold text-blue-600">
                                {item.payload.cta_label}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

