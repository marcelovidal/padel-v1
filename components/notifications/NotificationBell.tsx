"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics/gtag";
import type { NotificationItem } from "@/lib/actions/notification.actions";

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
    case "player_match_result_ready":       return "Resultado cargado";
    case "player_claim_success":            return "Perfil reclamado";
    case "club_claim_requested":            return "Nuevo reclamo de club";
    case "club_match_created":              return "Nuevo partido en tu club";
    case "tournament_open_for_registration":return "Torneo abierto para inscripcion";
    case "league_open_for_registration":    return "Liga abierta para inscripcion";
    case "tournament_registration_requested":return "Nueva solicitud de torneo";
    case "league_registration_requested":   return "Nueva solicitud de liga";
    case "tournament_registration_confirmed":return "Inscripcion a torneo confirmada";
    case "league_registration_confirmed":   return "Inscripcion a liga confirmada";
    case "coach_invitation":                return "Invitación de entrenador";
    case "coach_invitation_accepted":       return "Invitación aceptada";
    case "coach_challenge_assigned":        return "Nuevo desafío";
    case "coach_booking_request":           return "Nueva reserva de clase";
    case "coach_booking_confirmed":         return "Clase confirmada";
    default:                                return "Nueva notificacion";
  }
}

interface NotificationBellProps {
  items: NotificationItem[];
  totalUnread: number;
  loading: boolean;
  onMarkRead: (id: string) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
  onRefresh: () => Promise<void>;
  /** Alineación del dropdown. Default: "right" (se abre hacia la izquierda). */
  dropdownAlign?: "left" | "right";
}

export function NotificationBell({
  items,
  totalUnread,
  loading,
  onMarkRead,
  onMarkAllRead,
  onRefresh,
  dropdownAlign = "right",
}: NotificationBellProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const unreadIds = useMemo(
    () => new Set(items.filter((i) => !i.read_at).map((i) => i.id)),
    [items]
  );

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

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      trackEvent("notification_bell_opened", { target: "player" });
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
  }

  async function handleItemClick(item: NotificationItem) {
    if (unreadIds.has(item.id)) {
      await onMarkRead(item.id);
      trackEvent("notification_mark_read", { target: "player", type: item.type });
    }

    trackEvent("notification_clicked", {
      target: "player",
      type: item.type,
      has_link: Boolean(item.payload?.link),
    });

    if (item.payload?.link && typeof item.payload.link === "string") {
      let link = item.payload.link;
      const isRegistration =
        item.type === "tournament_registration_requested" ||
        item.type === "league_registration_requested";
      if (isRegistration && !link.includes("#")) {
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
    await onMarkAllRead();
    trackEvent("notification_mark_all_read", { target: "player", count: totalUnread });
  }

  const isLoading = loading || refreshing;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={handleToggle}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5" />
        {totalUnread > 0 ? (
          <span className="absolute -right-1 -top-1 min-w-[18px] h-[18px] rounded-full bg-red-500 px-1 text-[10px] leading-[18px] text-white font-black text-center">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className={`absolute mt-2 w-[340px] max-w-[calc(100vw-1rem)] rounded-2xl border border-gray-200 bg-white shadow-xl z-50 overflow-hidden ${dropdownAlign === "left" ? "left-0" : "right-0"}`}>
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div>
              <p className="text-sm font-black text-gray-900">Notificaciones</p>
              <p className="text-[11px] text-gray-500">
                {totalUnread > 0 ? `${totalUnread} sin leer` : "Sin pendientes"}
              </p>
            </div>
            {totalUnread > 0 ? (
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
            {isLoading ? (
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
