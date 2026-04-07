"use client";

import { useState, useTransition } from "react";
import { Target, Plus, CheckCircle, X, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { addCoachChallengeAction, updateChallengeStatusAction } from "@/lib/actions/coach.actions";
import type { CoachProfile, CoachChallenge, CoachStudentRow } from "@/repositories/coach.repository";

interface Props {
  challenges: CoachChallenge[];
  students: CoachStudentRow[];
  coachProfile: CoachProfile | null;
}

export function CoachChallenges({ challenges, students, coachProfile }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [isPending, startTransition] = useTransition();

  const active    = challenges.filter((c) => c.status === "active");
  const completed = challenges.filter((c) => c.status === "completed");

  function handleComplete(challengeId: string) {
    startTransition(async () => {
      await updateChallengeStatusAction(challengeId, "completed");
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wide transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Nuevo desafío
        </button>
      </div>

      {active.length === 0 && completed.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-12 text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gray-50">
            <Target className="h-8 w-8 text-gray-300" />
          </div>
          <p className="font-bold text-gray-900">Sin desafíos activos</p>
          <p className="text-sm text-gray-500">Asigná objetivos a tus alumnos para motivarlos.</p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">Activos</h2>
              <div className="space-y-2">
                {active.map((c) => {
                  const student = students.find((s) => s.id === c.player_id);
                  return (
                    <ChallengeRow
                      key={c.id}
                      challenge={c}
                      student={student}
                      onComplete={() => handleComplete(c.id)}
                      isPending={isPending}
                    />
                  );
                })}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">Completados</h2>
              <div className="space-y-2">
                {completed.slice(0, 5).map((c) => {
                  const student = students.find((s) => s.id === c.player_id);
                  return (
                    <ChallengeRow
                      key={c.id}
                      challenge={c}
                      student={student}
                      onComplete={() => {}}
                      isPending={false}
                    />
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      {showModal && coachProfile && (
        <AddChallengeModal
          coachId={coachProfile.id}
          students={students}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

function ChallengeRow({
  challenge,
  student,
  onComplete,
  isPending,
}: {
  challenge: CoachChallenge;
  student: CoachStudentRow | undefined;
  onComplete: () => void;
  isPending: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-4">
      <div className="flex items-center gap-3 min-w-0">
        {student && (
          <UserAvatar src={student.avatar_url} initials={student.display_name.slice(0, 2)} size="xs" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{challenge.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {student && <span className="text-[11px] text-gray-500">{student.display_name}</span>}
            {challenge.deadline && (
              <span className="inline-flex items-center gap-0.5 text-[11px] text-gray-400">
                <Calendar className="h-2.5 w-2.5" />
                {new Date(challenge.deadline).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge
          className={challenge.status === "completed"
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : "bg-blue-50 text-blue-700 border border-blue-200"}
        >
          {challenge.status === "completed" ? "Completado" : "Activo"}
        </Badge>
        {challenge.status === "active" && (
          <button
            onClick={onComplete}
            disabled={isPending}
            title="Marcar como completado"
            className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
          >
            <CheckCircle className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function AddChallengeModal({
  coachId,
  students,
  onClose,
}: {
  coachId: string;
  students: CoachStudentRow[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await addCoachChallengeAction({
        coachId,
        playerId:      fd.get("player_id") as string,
        title:         fd.get("title") as string,
        description:   (fd.get("description") as string) || undefined,
        targetMetric:  (fd.get("target_metric") as string) || undefined,
        deadline:      (fd.get("deadline") as string) || undefined,
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        onClose();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-gray-900">Nuevo desafío</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Jugador</label>
            <select name="player_id" required className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              <option value="">Seleccioná un jugador</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.display_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Título *</label>
            <input name="title" required placeholder="Ej: Mejorar el remate" className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Descripción</label>
            <textarea name="description" rows={2} placeholder="Detalle del desafío..." className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Fecha límite</label>
            <input name="deadline" type="date" className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isPending} className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold transition-colors">
              {isPending ? "Guardando..." : "Crear desafío"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
