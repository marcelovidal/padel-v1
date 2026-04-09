"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, StickyNote, Target, Dumbbell, TrendingUp, TrendingDown, Minus, Flame, Clock } from "lucide-react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Badge } from "@/components/ui/Badge";
import { addCoachNoteAction, addTrainingSessionAction } from "@/lib/actions/coach.actions";
import type { CoachStudentRow, CoachNote, CoachChallenge, TrainingSession } from "@/repositories/coach.repository";

interface Props {
  coachId: string;
  student: CoachStudentRow;
  notes: CoachNote[];
  sessions: TrainingSession[];
  challenges: CoachChallenge[];
}

const NOTE_TYPE_CONFIG: Record<CoachNote["note_type"], { label: string; className: string }> = {
  observacion: { label: "Observación", className: "bg-slate-100 text-slate-700 border border-slate-200" },
  objetivo:    { label: "Objetivo",    className: "bg-blue-50 text-blue-700 border border-blue-200" },
  alerta:      { label: "Alerta",      className: "bg-amber-50 text-amber-700 border border-amber-200" },
  logro:       { label: "Logro",       className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
};

const STATE_CONFIG = {
  en_forma:  { label: "En forma",  className: "bg-emerald-50 text-emerald-700 border border-emerald-200", icon: TrendingUp },
  estable:   { label: "Estable",   className: "bg-blue-50 text-blue-700 border border-blue-200",         icon: Minus },
  bajando:   { label: "Bajando",   className: "bg-amber-50 text-amber-700 border border-amber-200",      icon: TrendingDown },
  inactivo:  { label: "Inactivo",  className: "bg-slate-100 text-slate-600 border border-slate-200",     icon: Clock },
  en_racha:  { label: "En racha",  className: "bg-rose-50 text-rose-700 border border-rose-200",         icon: Flame },
};

export function CoachLegajo({ coachId, student, notes, sessions, challenges }: Props) {
  const [showNoteModal, setShowNoteModal]       = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);

  const state = STATE_CONFIG[student.player_state] ?? STATE_CONFIG.estable;
  const StateIcon = state.icon;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/player/coach?tab=jugadores"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a mis jugadores
      </Link>

      {/* Player header */}
      <div className="rounded-[28px] border border-gray-100 bg-white p-6 flex items-center gap-5">
        <UserAvatar src={student.avatar_url} initials={student.display_name.slice(0, 2)} size="lg" />
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-black text-gray-900">{student.display_name}</h2>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <Badge className={state.className + " inline-flex items-center gap-1"}>
              <StateIcon className="h-3 w-3" />
              {state.label}
            </Badge>
            {student.pasala_index != null && (
              <span className="text-sm font-bold text-gray-700">
                PASALA {student.pasala_index.toFixed(1)}
                {student.index_delta_30d != null && (
                  <span className={`ml-1 text-xs ${student.index_delta_30d > 0 ? "text-emerald-600" : student.index_delta_30d < 0 ? "text-red-500" : "text-gray-400"}`}>
                    {student.index_delta_30d > 0 ? "+" : ""}{student.index_delta_30d.toFixed(1)}
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
        <Link
          href={`/p/${student.id}`}
          target="_blank"
          className="shrink-0 inline-flex items-center justify-center h-9 px-4 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Ver perfil
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Challenges */}
        <section className="rounded-[28px] border border-gray-100 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" />
              Desafíos
            </h3>
          </div>
          {challenges.length === 0 ? (
            <p className="text-sm text-gray-400">Sin desafíos asignados.</p>
          ) : (
            <div className="space-y-2">
              {challenges.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.title}</p>
                    {c.deadline && (
                      <p className="text-[11px] text-gray-400">
                        Hasta {new Date(c.deadline).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
                      </p>
                    )}
                  </div>
                  <Badge className={c.status === "completed" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-blue-50 text-blue-700 border border-blue-200"}>
                    {c.status === "completed" ? "Completado" : "Activo"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Sessions */}
        <section className="rounded-[28px] border border-gray-100 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
              <Dumbbell className="h-3.5 w-3.5" />
              Sesiones
            </h3>
            <button
              onClick={() => setShowSessionModal(true)}
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar
            </button>
          </div>
          {sessions.length === 0 ? (
            <p className="text-sm text-gray-400">Sin sesiones registradas.</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 p-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {new Date(s.session_date).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                    {s.notes && <p className="text-[11px] text-gray-400 line-clamp-1">{s.notes}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    {s.duration_minutes && (
                      <p className="text-xs font-bold text-gray-600">{s.duration_minutes} min</p>
                    )}
                    <p className="text-[11px] text-gray-400">{s.session_type}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Notes */}
      <section className="rounded-[28px] border border-gray-100 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
            <StickyNote className="h-3.5 w-3.5" />
            Notas privadas
          </h3>
          <button
            onClick={() => setShowNoteModal(true)}
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar nota
          </button>
        </div>
        {notes.length === 0 ? (
          <p className="text-sm text-gray-400">Sin notas todavía. Solo vos podés verlas.</p>
        ) : (
          <div className="space-y-3">
            {notes.map((n) => {
              const cfg = NOTE_TYPE_CONFIG[n.note_type];
              return (
                <div key={n.id} className="rounded-2xl border border-gray-100 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className={cfg.className}>{cfg.label}</Badge>
                    <span className="text-[11px] text-gray-400">
                      {new Date(n.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{n.note}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {showNoteModal && (
        <AddNoteModal
          coachId={coachId}
          playerId={student.id}
          onClose={() => setShowNoteModal(false)}
        />
      )}

      {showSessionModal && (
        <AddSessionModal
          coachId={coachId}
          playerId={student.id}
          onClose={() => setShowSessionModal(false)}
        />
      )}
    </div>
  );
}

function AddNoteModal({
  coachId,
  playerId,
  onClose,
}: {
  coachId: string;
  playerId: string;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await addCoachNoteAction({
        coachId,
        playerId,
        note:     fd.get("note") as string,
        noteType: fd.get("note_type") as CoachNote["note_type"],
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        onClose();
      }
    });
  }

  return (
    <Modal title="Nueva nota" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Tipo</label>
          <select name="note_type" defaultValue="observacion" className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="observacion">Observación</option>
            <option value="objetivo">Objetivo</option>
            <option value="alerta">Alerta</option>
            <option value="logro">Logro</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Nota *</label>
          <textarea name="note" required rows={4} placeholder="Escribí tu nota..." className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <ModalFooter onClose={onClose} isPending={isPending} label="Guardar nota" />
      </form>
    </Modal>
  );
}

function AddSessionModal({
  coachId,
  playerId,
  onClose,
}: {
  coachId: string;
  playerId: string;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await addTrainingSessionAction({
        coachId,
        playerId,
        sessionDate:      fd.get("session_date") as string,
        durationMinutes:  fd.get("duration") ? Number(fd.get("duration")) : undefined,
        sessionType:      (fd.get("session_type") as "individual" | "grupal") ?? "individual",
        notes:            (fd.get("notes") as string) || undefined,
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        onClose();
      }
    });
  }

  return (
    <Modal title="Registrar sesión" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Fecha *</label>
          <input name="session_date" type="date" required defaultValue={new Date().toISOString().split("T")[0]} className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Duración (min)</label>
            <input name="duration" type="number" min={15} max={180} placeholder="60" className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Tipo</label>
            <select name="session_type" defaultValue="individual" className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              <option value="individual">Individual</option>
              <option value="grupal">Grupal</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Notas</label>
          <textarea name="notes" rows={2} placeholder="Aspectos trabajados, progreso..." className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <ModalFooter onClose={onClose} isPending={isPending} label="Registrar sesión" />
      </form>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <span className="text-lg leading-none">×</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalFooter({ onClose, isPending, label }: { onClose: () => void; isPending: boolean; label: string }) {
  return (
    <div className="flex gap-2 pt-2">
      <button type="button" onClick={onClose} className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
        Cancelar
      </button>
      <button type="submit" disabled={isPending} className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold transition-colors">
        {isPending ? "Guardando..." : label}
      </button>
    </div>
  );
}
