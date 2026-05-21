"use client";

import { useState, useTransition } from "react";
import { toggleBookingsEnabled } from "./actions";

interface FeatureFlagsPanelProps {
  bookingsEnabled: boolean;
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-[#E5352A]" : "bg-gray-200"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export function FeatureFlagsPanel({ bookingsEnabled: initialValue }: FeatureFlagsPanelProps) {
  const [bookingsEnabled, setBookingsEnabled] = useState(initialValue);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function handleToggle(next: boolean) {
    setBookingsEnabled(next);
    setFeedback(null);
    startTransition(async () => {
      try {
        await toggleBookingsEnabled(next);
        setFeedback(next ? "Reservas activadas." : "Reservas desactivadas.");
      } catch {
        setBookingsEnabled(!next); // revert
        setFeedback("Error al guardar. Reintentá.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-6 py-4">
        <p className="text-sm font-black uppercase tracking-widest text-gray-500">Feature flags</p>
      </div>

      <div className="divide-y divide-gray-100">
        {/* Reservas */}
        <div className="flex items-center justify-between px-6 py-5">
          <div className="space-y-0.5">
            <p className="text-sm font-bold text-gray-900">Reservas de canchas</p>
            <p className="text-xs text-gray-500">
              Activa el botón &quot;Reservar y crear partido&quot; en el sidebar y el flujo de selección en{" "}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[11px]">/player/matches/new</code>.
              Solo visible si además hay canchas activas en la DB.
            </p>
          </div>
          <div className="ml-6 flex shrink-0 flex-col items-end gap-1.5">
            <Toggle
              checked={bookingsEnabled}
              onChange={handleToggle}
              disabled={isPending}
            />
            <span
              className={`text-[11px] font-semibold ${
                bookingsEnabled ? "text-[#E5352A]" : "text-gray-400"
              }`}
            >
              {bookingsEnabled ? "Activo" : "Inactivo"}
            </span>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="border-t border-gray-100 px-6 py-3">
          <p className="text-xs font-semibold text-gray-600">{feedback}</p>
        </div>
      )}
    </div>
  );
}
