"use server";

import { createClient } from "@/lib/supabase/server";

export type NotificationTarget = "player" | "club" | "admin";
export type NotificationType =
  | "player_match_result_ready"
  | "player_claim_success"
  | "club_claim_requested"
  | "club_match_created"
  | "tournament_open_for_registration"
  | "league_open_for_registration"
  | "tournament_registration_requested"
  | "league_registration_requested"
  | "tournament_registration_confirmed"
  | "league_registration_confirmed"
  | "coach_invitation"
  | "coach_invitation_accepted"
  | "coach_challenge_assigned"
  | "coach_booking_request"
  | "coach_booking_confirmed"
  | "booking_confirmed"
  | "booking_cancelled"
  | "booking_requested"
  | "training_session_scheduled"
  | "coach_booking_cancelled"
  | "club_owner_request_approved"
  | "club_owner_request_rejected";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  entity_id: string | null;
  payload: {
    schema_version?: number;
    title?: string;
    message?: string;
    link?: string;
    cta_label?: string;
    [key: string]: unknown;
  } | null;
  priority: number;
  read_at: string | null;
  created_at: string;
}

export async function getNotificationsAction(input?: {
  limit?: number;
  target?: NotificationTarget;
}) {
  try {
    const supabase = await createClient();
    const sb = supabase as any;

    const { data, error } = await sb.rpc("notification_list", {
      p_limit: input?.limit ?? 10,
      p_target: input?.target ?? "player",
    });

    if (error) throw error;

    return {
      success: true as const,
      data: ((data || []) as NotificationItem[]).map((n) => ({
        ...n,
        payload: (n.payload || {}) as NotificationItem["payload"],
      })),
    };
  } catch (error: any) {
    return {
      success: false as const,
      error: error?.message || "No se pudieron cargar las notificaciones.",
      data: [] as NotificationItem[],
    };
  }
}

export async function getUnreadNotificationCountAction(input?: {
  target?: NotificationTarget;
}) {
  try {
    const supabase = await createClient();
    const sb = supabase as any;
    const { data, error } = await sb.rpc("notification_unread_count", {
      p_target: input?.target ?? "player",
    });

    if (error) throw error;

    return { success: true as const, count: Number(data || 0) };
  } catch (error: any) {
    return {
      success: false as const,
      error: error?.message || "No se pudo cargar el contador.",
      count: 0,
    };
  }
}

export async function markNotificationReadAction(input: { id: string }) {
  try {
    const supabase = await createClient();
    const sb = supabase as any;
    const { data, error } = await sb.rpc("notification_mark_read", {
      p_notification_id: input.id,
    });
    if (error) throw error;
    return { success: true as const, id: String(data) };
  } catch (error: any) {
    return {
      success: false as const,
      error: error?.message || "No se pudo marcar la notificacion como leida.",
    };
  }
}

export async function markAllNotificationsReadAction(input?: {
  target?: NotificationTarget;
}) {
  try {
    const supabase = await createClient();
    const sb = supabase as any;
    const { data, error } = await sb.rpc("notification_mark_all_read", {
      p_target: input?.target ?? "player",
    });
    if (error) throw error;
    return { success: true as const, count: Number(data || 0) };
  } catch (error: any) {
    return {
      success: false as const,
      error: error?.message || "No se pudieron marcar las notificaciones.",
      count: 0,
    };
  }
}

export async function createNotificationInternal(input: {
  userId?: string | null;
  clubId?: string | null;
  type: NotificationType;
  entityId?: string | null;
  payload?: Record<string, unknown>;
  priority?: number;
  dedupeKey?: string | null;
}) {
  const supabase = await createClient();
  const sb = supabase as any;
  const { data, error } = await sb.rpc("notification_create", {
    p_user_id: input.userId ?? null,
    p_club_id: input.clubId ?? null,
    p_type: input.type,
    p_entity_id: input.entityId ?? null,
    p_payload: input.payload ?? {},
    p_priority: input.priority ?? 0,
    p_dedupe_key: input.dedupeKey ?? null,
  });

  if (error) {
    throw error;
  }

  return (data as string | null) ?? null;
}
