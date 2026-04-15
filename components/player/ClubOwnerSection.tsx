"use client";

import { useState } from "react";
import Link from "next/link";
import { ClubOwnerRequestModal } from "@/components/player/ClubOwnerRequestModal";

type ClubOwnerStatus = "none" | "pending" | "active";

interface ClubOwnerSectionProps {
  status: ClubOwnerStatus;
  clubName?: string | null;
  requestedClubName?: string | null;
  requestedAt?: string | null;
  initialOpen?: boolean;
}

export function ClubOwnerSection({
  status,
  clubName,
  requestedClubName,
  requestedAt,
  initialOpen = false,
}: ClubOwnerSectionProps) {
  const [showModal, setShowModal] = useState(initialOpen);

  if (status === "active") {
    return (
      <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Mi club</h3>
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-700">
            Club activo
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-gray-900">{clubName}</p>
          <Link
            href="/player/mi-club"
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            Ir a mi club
          </Link>
        </div>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Mi club</h3>
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
            Solicitud en revisión
          </span>
        </div>
        <p className="text-sm text-gray-600">
          Club solicitado:{" "}
          <span className="font-semibold text-gray-900">{requestedClubName || "—"}</span>
        </p>
        {requestedAt && (
          <p className="text-xs text-gray-400">
            Enviada el{" "}
            {new Date(requestedAt).toLocaleDateString("es-AR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        )}
        <p className="text-xs text-gray-400">Te notificamos cuando esté aprobada.</p>
      </div>
    );
  }

  // status === "none"
  return (
    <>
      <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">
          ¿Sos dueño de un club?
        </h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          Gestioná tu club, canchas, torneos y reservas desde PASALA.
        </p>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="w-full rounded-xl border-2 border-blue-600 py-3 text-sm font-bold text-blue-600 hover:bg-blue-50 transition-colors"
        >
          Solicitar acceso de club
        </button>
      </div>

      {showModal && <ClubOwnerRequestModal onClose={() => setShowModal(false)} />}
    </>
  );
}
