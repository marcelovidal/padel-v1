"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  resolveTournamentRegistrationAction,
  resolveLeagueRegistrationAction,
} from "@/lib/actions/registrations.actions";

// Type defined inline to avoid pulling server-only modules into the client bundle
interface RegistrationRow {
  registration_id: string;
  player_id: string;
  player_name: string;
  player_category: number | null;
  player_city: string | null;
  teammate_player_id: string | null;
  teammate_name: string | null;
  teammate_category: number | null;
  teammate_city: string | null;
  status: "pending" | "confirmed" | "rejected";
  requested_at: string;
}

interface RegistrationsPanelProps {
  entityId: string;
  entityType: "tournament" | "league";
  registrations: RegistrationRow[];
}

function statusBadge(status: RegistrationRow["status"]) {
  if (status === "confirmed")
    return <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-800">Confirmado</span>;
  if (status === "pending")
    return <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-bold text-yellow-800">Pendiente</span>;
  return <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-800">Rechazado</span>;
}

export function RegistrationsPanel({ entityId, entityType, registrations }: RegistrationsPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const resolveAction = entityType === "tournament"
    ? resolveTournamentRegistrationAction
    : resolveLeagueRegistrationAction;

  const entityInputName = entityType === "tournament" ? "tournament_id" : "league_id";

  async function handleResolve(registrationId: string, status: "confirmed" | "rejected") {
    setLoading(registrationId + status);
    const fd = new FormData();
    fd.append("registration_id", registrationId);
    fd.append("status", status);
    fd.append(entityInputName, entityId);
    await resolveAction(fd);
    setLoading(null);
    router.refresh();
  }

  const pending = registrations.filter((r) => r.status === "pending");
  const rest = registrations.filter((r) => r.status !== "pending");

  if (registrations.length === 0) {
    return (
      <p className="text-sm text-gray-400">No hay solicitudes de inscripcion todavia.</p>
    );
  }

  return (
    <div className="space-y-2">
      {pending.length > 0 && (
        <p className="text-xs font-bold text-yellow-700 uppercase tracking-wide">
          {pending.length} pendiente{pending.length > 1 ? "s" : ""}
        </p>
      )}
      {registrations.map((reg) => (
        <div
          key={reg.registration_id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
        >
          <div>
            <p className="text-sm font-bold text-gray-900">
              {reg.teammate_name ? `${reg.player_name} / ${reg.teammate_name}` : reg.player_name}
            </p>
            <p className="text-xs text-gray-500">
              {reg.teammate_name ? "Solicitud en pareja" : "Solicitud individual"}
            </p>
            <p className="text-xs text-gray-500">
              {reg.player_category ? `Cat. ${reg.player_category}` : "Sin categoria"}
              {reg.player_city ? ` - ${reg.player_city}` : ""}
              {reg.teammate_name
                ? ` | ${reg.teammate_category ? `Cat. ${reg.teammate_category}` : "Sin categoria"}${
                    reg.teammate_city ? ` - ${reg.teammate_city}` : ""
                  }`
                : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {statusBadge(reg.status)}
            {reg.status === "pending" && (
              <>
                <button
                  type="button"
                  disabled={loading !== null}
                  onClick={() => handleResolve(reg.registration_id, "confirmed")}
                  className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {loading === reg.registration_id + "confirmed" ? "..." : "Confirmar"}
                </button>
                <button
                  type="button"
                  disabled={loading !== null}
                  onClick={() => handleResolve(reg.registration_id, "rejected")}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  {loading === reg.registration_id + "rejected" ? "..." : "Rechazar"}
                </button>
              </>
            )}
          </div>
        </div>
      ))}
      {rest.length > 0 && pending.length > 0 && (
        <p className="pt-1 text-xs font-bold text-gray-400 uppercase tracking-wide">Resueltas</p>
      )}
    </div>
  );
}

