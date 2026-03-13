"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { UserAvatar } from "@/components/ui/UserAvatar";

type PlayerLevel = "ROOKIE" | "AMATEUR" | "COMPETITIVO" | "PRO" | "ELITE";
type PlayerActivity = "muy_activo" | "activo" | "ocasional" | "inactivo" | "nuevo";
type PlayerPosition = "drive" | "reves" | "cualquiera" | null;

interface ClubPlayerProfileModalProps {
  playerId: string;
  displayName: string;
  avatarSrc: string | null;
  avatarInitials?: string;
  locationLabel: string;
  category: number | null;
  position: PlayerPosition;
  pasalaIndex: number | null;
  level: PlayerLevel;
  winRate: number;
  played: number;
  currentStreak: string;
  activityLevel: PlayerActivity;
}

function levelClass(level: PlayerLevel) {
  if (level === "ELITE") return "bg-amber-50 text-amber-700 border border-amber-200";
  if (level === "PRO") return "bg-violet-50 text-violet-700 border border-violet-200";
  if (level === "COMPETITIVO") return "bg-blue-50 text-blue-700 border border-blue-200";
  if (level === "AMATEUR") return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  return "bg-slate-100 text-slate-700 border border-slate-200";
}

function levelLabel(level: PlayerLevel) {
  if (level === "ROOKIE") return "INICIAL";
  return level;
}

function activityMeta(activity: PlayerActivity) {
  if (activity === "muy_activo") {
    return { label: "Muy activo", className: "bg-rose-50 text-rose-700 border border-rose-200" };
  }
  if (activity === "activo") {
    return { label: "Activo", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
  }
  if (activity === "ocasional") {
    return { label: "Ocasional", className: "bg-amber-50 text-amber-700 border border-amber-200" };
  }
  if (activity === "inactivo") {
    return { label: "Inactivo", className: "bg-slate-100 text-slate-700 border border-slate-200" };
  }
  return { label: "Nuevo", className: "bg-cyan-50 text-cyan-700 border border-cyan-200" };
}

function positionLabel(position: PlayerPosition) {
  if (position === "drive") return "Drive";
  if (position === "reves") return "Reves";
  if (position === "cualquiera") return "Ambas";
  return "Sin definir";
}

function categoryLabel(category: number | null) {
  if (!category) return "-";
  return `Cat. ${category}ta`;
}

function pasalaProgress(value: number | null) {
  const score = Number(value ?? 0);
  return Math.max(0, Math.min(100, Number.isFinite(score) ? score : 0));
}

export function ClubPlayerProfileModal({
  playerId,
  displayName,
  avatarSrc,
  avatarInitials,
  locationLabel,
  category,
  position,
  pasalaIndex,
  level,
  winRate,
  played,
  currentStreak,
  activityLevel,
}: ClubPlayerProfileModalProps) {
  const [open, setOpen] = useState(false);
  const activity = activityMeta(activityLevel);
  const pasala = pasalaProgress(pasalaIndex);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 items-center justify-center whitespace-nowrap rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-700 hover:border-gray-300"
      >
        Ver perfil
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Perfil de ${displayName}`}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <UserAvatar src={avatarSrc} initials={avatarInitials} size="lg" />
                <div>
                  <h3 className="text-lg font-black text-gray-900">{displayName}</h3>
                  <p className="text-sm text-gray-500">{locationLabel || "Sin ubicacion"}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-sm font-black text-gray-600 hover:bg-gray-50"
                aria-label="Cerrar modal"
              >
                x
              </button>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge className="border border-gray-200 bg-gray-100 text-gray-700">{categoryLabel(category)}</Badge>
              <Badge className="border border-gray-200 bg-white text-gray-700">{positionLabel(position)}</Badge>
              <Badge className={levelClass(level)}>{levelLabel(level)}</Badge>
              <Badge className={activity.className}>{activity.label}</Badge>
            </div>

            <div className="mb-4 rounded-2xl border border-gray-100 p-3">
              <div className="mb-1 flex items-center justify-between text-xs font-bold text-gray-700">
                <span>Indice PASALA</span>
                <span>{pasalaIndex == null ? "-" : pasalaIndex.toFixed(1)} / 100</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${pasala}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-2xl border border-gray-100 bg-gray-50 p-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide text-gray-500">Win rate</p>
                <p className="text-sm font-bold text-gray-900">{Number(winRate || 0).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide text-gray-500">Partidos</p>
                <p className="text-sm font-bold text-gray-900">{played || 0}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide text-gray-500">Racha</p>
                <p className="text-sm font-bold text-gray-900">{currentStreak || "-"}</p>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Link
                href={`/p/${playerId}`}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 hover:border-gray-300"
              >
                Ir al perfil publico
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
