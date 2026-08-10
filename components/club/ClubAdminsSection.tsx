"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PlayerSearchSelect } from "@/components/players/PlayerSearchSelect";
import { addClubAdminAction, removeClubAdminAction } from "@/lib/actions/club-admins.actions";
import type { ClubAdminRow } from "@/repositories/club-admins.repository";

interface PlayerOption {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name?: string | null;
  city?: string | null;
  city_id?: string | null;
  region_code?: string | null;
  region_name?: string | null;
}

interface ClubAdminsSectionProps {
  admins: ClubAdminRow[];
  availablePlayers: PlayerOption[];
  /** null cuando la migracion de club_admins todavia no se aplico */
  loadError?: string | null;
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function ClubAdminsSection({ admins, availablePlayers, loadError }: ClubAdminsSectionProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingAdd, setPendingAdd] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<ClubAdminRow | null>(null);

  // Ref y no state: el submit de la server action no debe esperar un re-render.
  const submittingRef = useRef(false);

  const adminIds = useMemo(() => new Set(admins.map((a) => a.player_id)), [admins]);
  const selectablePlayers = useMemo(
    () => availablePlayers.filter((p) => !adminIds.has(p.id)),
    [availablePlayers, adminIds]
  );

  const isOnlyAdmin = admins.length <= 1;

  const handleAdd = async () => {
    if (!selectedId || submittingRef.current) return;
    submittingRef.current = true;
    setPendingAdd(true);
    setError(null);

    const formData = new FormData();
    formData.set("player_id", selectedId);

    try {
      const result = await addClubAdminAction(formData);
      if (result?.success) {
        setSelectedId("");
        router.refresh();
      } else {
        setError(result?.error || "No pudimos agregar al administrador.");
      }
    } catch {
      setError("Error inesperado al agregar al administrador.");
    } finally {
      submittingRef.current = false;
      setPendingAdd(false);
    }
  };

  const handleRemove = async (admin: ClubAdminRow) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setRemovingId(admin.player_id);
    setError(null);

    const formData = new FormData();
    formData.set("player_id", admin.player_id);

    try {
      const result = await removeClubAdminAction(formData);
      if (result?.success) {
        setConfirmTarget(null);
        router.refresh();
      } else {
        setError(result?.error || "No pudimos quitar al administrador.");
        setConfirmTarget(null);
      }
    } catch {
      setError("Error inesperado al quitar al administrador.");
      setConfirmTarget(null);
    } finally {
      submittingRef.current = false;
      setRemovingId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-5 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Administradores</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Todos tienen los mismos permisos y pueden agregar o quitar a cualquiera. Nadie puede
          quitarse a sí mismo.
        </p>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-[var(--pill-amber-bg)] bg-[var(--pill-amber-bg)] px-4 py-3">
          <p className="text-sm font-medium text-[var(--pill-amber-text)]">{loadError}</p>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-[var(--pill-red-bg)] bg-[var(--pill-red-bg)] px-4 py-3">
          <p className="text-sm font-medium text-[var(--pill-red-text)]">{error}</p>
        </div>
      ) : null}

      {/* Lista */}
      <ul className="divide-y divide-[var(--border-soft)] rounded-xl border border-[var(--border-soft)]">
        {admins.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">
            Todavía no hay administradores cargados.
          </li>
        ) : (
          admins.map((admin) => {
            const disabled = admin.is_self || isOnlyAdmin;
            const disabledReason = admin.is_self
              ? "No podés quitarte a vos mismo"
              : "El club no puede quedarse sin administradores";

            return (
              <li key={admin.player_id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--bg-pill-soft)] text-xs font-bold text-[var(--text-secondary)]">
                  {admin.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={admin.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initialsOf(admin.display_name)
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold text-[var(--text-primary)]">
                      {admin.display_name}
                    </p>
                    {admin.is_self ? (
                      <span className="rounded-full bg-[var(--pill-blue-bg)] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--pill-blue-text)]">
                        Vos
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-[var(--text-muted)]">
                    {admin.city || "Sin ciudad"}
                    {admin.added_by_name ? ` · Agregado por ${admin.added_by_name}` : ""}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setConfirmTarget(admin)}
                  disabled={disabled || removingId === admin.player_id}
                  title={disabled ? disabledReason : undefined}
                  className="shrink-0 rounded-lg border border-[var(--border-strong)] px-3 py-1.5 text-xs font-bold text-brand-rojo transition-colors hover:bg-[var(--pill-red-bg)] disabled:cursor-not-allowed disabled:border-[var(--border-soft)] disabled:text-[var(--text-faint)] disabled:hover:bg-transparent"
                >
                  {removingId === admin.player_id ? "Quitando..." : "Quitar"}
                </button>
              </li>
            );
          })
        )}
      </ul>

      {/* Alta */}
      <div className="space-y-2">
        <label className="block text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
          Agregar administrador
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex-1">
            <PlayerSearchSelect
              name="player_id"
              placeholder="Buscá por nombre, apellido o ciudad"
              required={false}
              selectedId={selectedId}
              onSelectId={setSelectedId}
              players={selectablePlayers}
            />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!selectedId || pendingAdd}
            className="shrink-0 rounded-xl bg-brand-azul px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[var(--color-azul-dark)] disabled:opacity-50"
          >
            {pendingAdd ? "Agregando..." : "Agregar"}
          </button>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          El jugador va a ver &quot;Mi club&quot; en su menú apenas lo agregues.
        </p>
      </div>

      {/* Confirmacion */}
      {confirmTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--bg-card)] p-6 shadow-xl">
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              ¿Quitar a {confirmTarget.display_name}?
            </h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Va a perder el acceso al panel del club y le vamos a avisar por notificación. Podés
              volver a agregarlo cuando quieras.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
              <button
                type="button"
                onClick={() => void handleRemove(confirmTarget)}
                disabled={removingId === confirmTarget.player_id}
                className="flex-1 rounded-xl bg-brand-rojo px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-rojo-dark disabled:opacity-50"
              >
                {removingId === confirmTarget.player_id ? "Quitando..." : "Quitar"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmTarget(null)}
                className="flex-1 rounded-xl border border-[var(--border-strong)] px-4 py-2.5 text-sm font-bold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-elevated)]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
