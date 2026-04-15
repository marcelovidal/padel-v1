import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  approveClubOwnerRequestAction,
  rejectClubOwnerRequestAction,
} from "@/lib/actions/club-owner.actions";

export default async function ClubOwnerRequestsPage() {
  await requireAdmin();

  const supabase = await createClient();
  const sb = supabase as any;

  const { data: requests } = await sb
    .from("club_owner_requests")
    .select(
      `id, status, requested_at, resolved_at, club_name_requested,
       club_id,
       clubs ( name ),
       player_id,
       players ( display_name, first_name, last_name )`
    )
    .order("requested_at", { ascending: false });

  const pending = (requests || []).filter((r: any) => r.status === "pending");
  const resolved = (requests || []).filter((r: any) => r.status !== "pending");

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function playerName(r: any) {
    const p = r.players;
    if (!p) return r.player_id;
    return `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.display_name || r.player_id;
  }

  function clubName(r: any) {
    return r.clubs?.name || r.club_name_requested || "—";
  }

  const statusLabel: Record<string, string> = {
    pending: "Pendiente",
    approved: "Aprobado",
    rejected: "Rechazado",
  };

  const statusColor: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Solicitudes de dueño de club</h1>
        <p className="text-sm text-gray-500 mt-1">
          Revisá y aprobá o rechazá cada solicitud.
        </p>
      </div>

      {/* Pendientes */}
      <section className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">
          Pendientes ({pending.length})
        </h2>

        {pending.length === 0 ? (
          <p className="text-sm text-gray-500">No hay solicitudes pendientes.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((r: any) => (
              <div
                key={r.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 flex flex-col md:flex-row md:items-center gap-4"
              >
                <div className="flex-1 space-y-1">
                  <p className="font-bold text-gray-900">{playerName(r)}</p>
                  <p className="text-sm text-gray-600">
                    Club:{" "}
                    <span className="font-semibold text-gray-900">{clubName(r)}</span>
                    {!r.club_id && (
                      <span className="ml-2 text-xs text-amber-600 font-medium">(club no registrado)</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">Solicitado el {fmtDate(r.requested_at)}</p>
                </div>

                <div className="flex gap-2">
                  <form
                    action={async (fd: FormData) => {
                      "use server";
                      await approveClubOwnerRequestAction(fd);
                    }}
                  >
                    <input type="hidden" name="request_id" value={r.id} />
                    <input type="hidden" name="player_id" value={r.player_id} />
                    <input type="hidden" name="club_id" value={r.club_id || ""} />
                    <button
                      type="submit"
                      className="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 transition-colors"
                    >
                      Aprobar
                    </button>
                  </form>
                  <form
                    action={async (fd: FormData) => {
                      "use server";
                      await rejectClubOwnerRequestAction(fd);
                    }}
                  >
                    <input type="hidden" name="request_id" value={r.id} />
                    <input type="hidden" name="player_id" value={r.player_id} />
                    <button
                      type="submit"
                      className="rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50 transition-colors"
                    >
                      Rechazar
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Historial */}
      {resolved.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">
            Historial ({resolved.length})
          </h2>
          <div className="space-y-2">
            {resolved.map((r: any) => (
              <div
                key={r.id}
                className="rounded-xl border border-gray-100 bg-white px-4 py-3 flex items-center gap-4"
              >
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {playerName(r)} — {clubName(r)}
                  </p>
                  <p className="text-xs text-gray-400">
                    Solicitado {fmtDate(r.created_at)}
                    {r.resolved_at && ` · Resuelto ${fmtDate(r.resolved_at)}`}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${statusColor[r.status] || "bg-gray-100 text-gray-600"}`}
                >
                  {statusLabel[r.status] || r.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
