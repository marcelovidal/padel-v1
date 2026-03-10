"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import {
  getAssessmentCompletionSnapshotAction,
  saveAssessmentProgressAction,
} from "@/lib/actions/assessment.actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Database } from "@/types/database";

type Assessment = Database["public"]["Tables"]["player_match_assessments"]["Row"];

const steps = [
  {
    key: "volea",
    label: "Volea",
    question: "¿Cómo te sentiste en la red hoy?",
    description: "Pensá en tu control, timing y precisión al volear",
  },
  {
    key: "globo",
    label: "Globo",
    question: "¿Tus globos cumplieron su función?",
    description: "Altura, profundidad y momento en que los usaste",
  },
  {
    key: "remate",
    label: "Remate",
    question: "¿Cuándo tuviste la chance, la aprovechaste?",
    description: "Potencia, dirección y efectividad de tus remates",
  },
  {
    key: "bandeja",
    label: "Bandeja",
    question: "¿La bandeja fue tu aliada hoy?",
    description: "Control, colocación y consistencia",
  },
  {
    key: "vibora",
    label: "Víbora",
    question: "¿Pudiste ejecutar bien la víbora?",
    description: "Técnica, timing y resultado del golpe",
  },
  {
    key: "bajada_pared",
    label: "Bajada de pared",
    question: "¿Leíste bien las paredes?",
    description: "Anticipación, salida y control tras el rebote",
  },
  {
    key: "saque",
    label: "Saque",
    question: "¿Arrancaste los puntos con el pie derecho?",
    description: "Consistencia, colocación y variedad en el saque",
  },
  {
    key: "recepcion_saque",
    label: "Recepción de saque",
    question: "¿Cómo respondiste al saque rival?",
    description: "Posicionamiento, lectura y calidad de tu respuesta",
  },
] as const;

type StepKey = (typeof steps)[number]["key"];
type WizardValues = Record<StepKey, number | null>;

const feedbackByValue: Record<number, string> = {
  1: "Identificarlo es el primer paso para mejorar.",
  2: "Vas por buen camino, seguí trabajándolo.",
  3: "Sólido. Con práctica podés llevarlo más arriba.",
  4: "Muy bien. Ese golpe es una fortaleza tuya.",
  5: "Excelente. Ese golpe es tu arma.",
};

const sliderPalette: Record<number, string> = {
  1: "#f97316",
  2: "#fb923c",
  3: "#eab308",
  4: "#22c55e",
  5: "#16a34a",
};

function extractValues(assessment?: Assessment | null): WizardValues {
  return {
    volea: assessment?.volea ?? null,
    globo: assessment?.globo ?? null,
    remate: assessment?.remate ?? null,
    bandeja: assessment?.bandeja ?? null,
    vibora: assessment?.vibora ?? null,
    bajada_pared: assessment?.bajada_pared ?? null,
    saque: assessment?.saque ?? null,
    recepcion_saque: assessment?.recepcion_saque ?? null,
  };
}

function countCompleted(values: WizardValues) {
  return Object.values(values).filter((value) => typeof value === "number").length;
}

function buildResultLabel(matchSummary: NonNullable<AssessmentFormProps["matchSummary"]>) {
  if (matchSummary.resultLabel) return matchSummary.resultLabel;
  return "Resultado cargado";
}

const scoreMarks = [1, 2, 3, 4, 5] as const;

function MiniRadarPreview({ values }: { values: WizardValues }) {
  const chartData = [
    { skill: "Volea", value: values.volea ?? 0 },
    { skill: "Globo", value: values.globo ?? 0 },
    { skill: "Remate", value: values.remate ?? 0 },
    { skill: "Bandeja", value: values.bandeja ?? 0 },
    { skill: "Víbora", value: values.vibora ?? 0 },
    { skill: "Bajada", value: values.bajada_pared ?? 0 },
    { skill: "Saque", value: values.saque ?? 0 },
    { skill: "Recep", value: values.recepcion_saque ?? 0 },
  ];

  return (
    <div className="h-56 w-full rounded-3xl border border-emerald-100 bg-white/80 p-3">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="72%" data={chartData}>
          <PolarGrid stroke="#d1fae5" />
          <PolarAngleAxis
            dataKey="skill"
            tick={{ fill: "#6b7280", fontSize: 10, fontWeight: 700 }}
          />
          <Radar
            dataKey="value"
            stroke="#16a34a"
            fill="#34d399"
            fillOpacity={0.35}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface AssessmentFormProps {
  matchId: string;
  playerId: string;
  playerIdFromRoute?: string | null;
  initialAssessment?: Assessment | null;
  matchSummary?: {
    clubName: string;
    dateLabel: string;
    resultLabel: string;
    matchLabel: string;
    backHref: string;
    teammateLabel?: string;
    rivalsLabel?: string;
    introNarrative?: string;
    outcomeLabel?: string;
  };
}

export function AssessmentForm({
  matchId,
  playerId,
  playerIdFromRoute,
  initialAssessment,
  matchSummary,
}: AssessmentFormProps) {
  const router = useRouter();
  const summary = matchSummary ?? {
    clubName: "Partido",
    dateLabel: "Fecha no disponible",
    resultLabel: "Resultado confirmado",
    matchLabel: "Partido",
    backHref: "/player/matches",
    teammateLabel: "Sin compañero cargado",
    rivalsLabel: "Rivales no disponibles",
    introNarrative: "Vamos a evaluar tu performance. ¿Empezamos?",
    outcomeLabel: "Resultado cargado",
  };
  const [isPending, startTransition] = useTransition();
  const initialValues = useMemo(() => extractValues(initialAssessment), [initialAssessment]);
  const [values, setValues] = useState<WizardValues>(initialValues);
  const [persistedValues, setPersistedValues] = useState<WizardValues>(initialValues);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [stepIndex, setStepIndex] = useState(() => {
    const firstNull = steps.findIndex((step) => initialValues[step.key] === null);
    return firstNull === -1 ? 0 : firstNull;
  });
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeStep = steps[stepIndex];
  const activeValue = values[activeStep.key];
  const completedCount = countCompleted(values);
  const omittedCount = steps.length - completedCount;
  const hasExistingProgress = completedCount > 0;

  const persistField = useCallback(async (
    field: StepKey,
    value: number | null,
    options?: { silent?: boolean }
  ) => {
    if (!options?.silent) {
      setSaveMessage(null);
    }

    const result = await saveAssessmentProgressAction({
      match_id: matchId,
      player_id: playerId,
      player_id_from_route: playerIdFromRoute ?? null,
      field,
      value,
      allow_empty: true,
    });

    if (!result.ok) {
      setError(result.error ?? "Error al guardar la autoevaluación");
      return false;
    }

    setPersistedValues((current) => ({ ...current, [field]: value }));
    if (!options?.silent) {
      setSaveMessage("Guardado");
    }
    return true;
  }, [matchId, playerId, playerIdFromRoute]);

  useEffect(() => {
    if (!started || finished) return;

    const field = activeStep.key;
    const currentValue = values[field];
    const persistedValue = persistedValues[field];
    if (currentValue === persistedValue) return;

    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
    }

    autosaveTimer.current = setTimeout(() => {
      void persistField(field, currentValue, { silent: true });
    }, 700);

    return () => {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
      }
    };
  }, [activeStep.key, finished, persistField, persistedValues, started, values]);

  const handleStart = () => {
    setError(null);
    setSaveMessage(null);
    setStarted(true);
  };

  const handleSkip = () => {
    setError(null);
    startTransition(async () => {
      const ok = await persistField(activeStep.key, null);
      if (!ok) return;

      if (stepIndex === steps.length - 1) {
        setFinished(true);
        router.refresh();
        return;
      }

      setStepIndex((current) => current + 1);
    });
  };

  const handleNext = () => {
    if (activeValue === null) return;

    setError(null);
    startTransition(async () => {
      const ok = await persistField(activeStep.key, activeValue);
      if (!ok) return;

      if (stepIndex === steps.length - 1) {
        setFinished(true);
        router.refresh();
        return;
      }

      setStepIndex((current) => current + 1);
    });
  };

  const handleBack = () => {
    setError(null);
    setSaveMessage(null);
    setStepIndex((current) => Math.max(0, current - 1));
  };

  const handleCancel = () => {
    router.push(summary.backHref);
  };

  const handleRefreshFromServer = useCallback(() => {
    startTransition(async () => {
      const result = await getAssessmentCompletionSnapshotAction({
        match_id: matchId,
        player_id: playerId,
        player_id_from_route: playerIdFromRoute ?? null,
      });

      if (!result.ok || !result.assessment) return;
      const freshValues = extractValues(result.assessment);
      setValues(freshValues);
      setPersistedValues(freshValues);
    });
  }, [matchId, playerId, playerIdFromRoute]);

  useEffect(() => {
    if (!finished) return;
    void handleRefreshFromServer();
  }, [finished, handleRefreshFromServer]);

  if (finished) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-5 rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-300/40">
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-gray-900">Evaluación guardada</h2>
            <p className="text-sm font-medium text-gray-600">
              Tu Índice PASALA se actualiza con lo que cargaste hoy.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-600">Resumen</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <SummaryMetric label="Golpes evaluados" value={String(completedCount)} tone="emerald" />
              <SummaryMetric label="Golpes omitidos" value={String(omittedCount)} tone="slate" />
            </div>
            <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm text-emerald-900">
              {completedCount === steps.length
                ? "Completaste los 8 golpes. Tenés una foto técnica completa del partido."
                : `Cargaste ${completedCount} golpes y dejaste ${omittedCount} para otra oportunidad.`}
            </div>
          </div>
          <MiniRadarPreview values={values} />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="lg" className="sm:flex-1" asChild>
            <Link href="/player">Ver mi perfil</Link>
          </Button>
          <Button size="lg" variant="outline" className="sm:flex-1" asChild>
            <Link href={summary.backHref}>Volver al partido</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-black text-gray-900">Autoevaluación</h2>
          <span className="text-xs font-black uppercase tracking-widest text-gray-500">Paso 0 de 8</span>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-600">Contexto del partido</p>
          <h3 className="text-3xl font-black tracking-tight text-gray-950">Vamos a evaluar tu performance</h3>
          <p className="max-w-2xl text-sm leading-6 text-gray-600">
            {summary.introNarrative}
          </p>
        </div>

        <div className="grid gap-3 rounded-2xl border border-gray-200 bg-gray-50/70 p-5 sm:grid-cols-3">
          <MatchInfoItem label="Club" value={summary.clubName} />
          <MatchInfoItem label="Fecha" value={summary.dateLabel} />
          <MatchInfoItem label="Resultado" value={buildResultLabel(summary)} />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <ContextPill
            label="Estado"
            value={summary.outcomeLabel || "Resultado cargado"}
            tone="emerald"
          />
          <ContextPill
            label="Tu compañero"
            value={summary.teammateLabel || "Sin compañero cargado"}
            tone="blue"
          />
          <ContextPill
            label="Tus rivales"
            value={summary.rivalsLabel || "Rivales no disponibles"}
            tone="slate"
          />
        </div>

        {hasExistingProgress ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Ya hay progreso guardado. Podés retomar desde el siguiente golpe pendiente o ajustar respuestas previas.
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="lg" className="rounded-xl sm:flex-1" onClick={handleStart}>
            {hasExistingProgress ? "Continuar evaluación" : "Empezar evaluación"}
          </Button>
          <Button size="lg" variant="outline" className="rounded-xl sm:flex-1" onClick={handleCancel}>
            Ahora no
          </Button>
        </div>
      </div>
    );
  }

  const progressPercent = ((stepIndex + 1) / steps.length) * 100;
  const selectedColor = activeValue ? sliderPalette[activeValue] : "#6b7280";
  const sliderInputValue = activeValue ?? 0;

  return (
    <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gray-400">{summary.matchLabel}</p>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">Progreso de respuestas</p>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-600">
              Golpe {stepIndex + 1} de {steps.length}
            </p>
            <p className="mt-1 text-sm font-medium text-gray-500">{activeStep.label}</p>
          </div>
          {saveMessage ? <span className="text-xs font-semibold text-emerald-600">{saveMessage}</span> : null}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <ContextPill
          label="Estado"
          value={summary.outcomeLabel || "Resultado cargado"}
          tone="emerald"
        />
        <ContextPill
          label="Compañero"
          value={summary.teammateLabel || "Sin compañero cargado"}
          tone="blue"
        />
        <ContextPill
          label="Rivales"
          value={summary.rivalsLabel || "Rivales no disponibles"}
          tone="slate"
        />
      </div>

      <div
        key={activeStep.key}
        className="animate-in fade-in slide-in-from-right-2 duration-300 space-y-5 rounded-2xl border border-gray-200 bg-gray-50/45 p-5 transition-all duration-300 ease-out"
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-2xl font-black tracking-tight text-gray-950">{activeStep.question}</h3>
            <span className="text-xs font-black uppercase tracking-widest text-gray-400">
              Paso {stepIndex + 1} de 8
            </span>
          </div>
          <p className="text-sm font-medium text-gray-500">{activeStep.description}</p>
        </div>

        <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-end justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-gray-400">Tu nota hoy</span>
            <span
              className={cn(
                "text-5xl font-black tracking-tight transition-all duration-200",
                activeValue ? "scale-100 opacity-100" : "scale-95 opacity-60"
              )}
              style={{ color: selectedColor }}
            >
              {activeValue ?? "—"}
            </span>
          </div>

          <div className="relative pt-2">
            <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 gap-2 px-1">
              {scoreMarks.map((mark) => {
                const isActive = activeValue !== null && mark <= activeValue;
                return (
                  <div
                    key={mark}
                    className={cn(
                      "h-3 flex-1 rounded-full border transition-colors",
                      isActive ? "border-transparent" : "border-gray-200 bg-gray-100"
                    )}
                    style={isActive ? { backgroundColor: sliderPalette[activeValue!] } : undefined}
                  />
                );
              })}
            </div>
            <input
              type="range"
              min={0}
              max={5}
              step={1}
              value={sliderInputValue}
              onChange={(event) => {
                const rawValue = Number(event.target.value);
                const nextValue = rawValue === 0 ? null : rawValue;
                setError(null);
                setSaveMessage(null);
                setValues((current) => ({ ...current, [activeStep.key]: nextValue }));
              }}
              className="relative z-10 h-8 w-full cursor-pointer appearance-none bg-transparent transition-all duration-200"
            />
            <div className="mt-2 flex items-center justify-between px-1 text-[11px] font-bold text-gray-400">
              <span>0</span>
              {scoreMarks.map((mark) => (
                <span key={mark}>{mark}</span>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-orange-500">Mejorar</span>
            <span className="text-emerald-600">Excelente</span>
          </div>

          <div
            className={cn(
              "rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
              !activeValue && "bg-gray-50 text-gray-500",
              activeValue === 1 && "bg-orange-50 text-orange-700",
              activeValue === 2 && "bg-amber-50 text-amber-700",
              activeValue === 3 && "bg-yellow-50 text-yellow-700",
              activeValue === 4 && "bg-emerald-50 text-emerald-700",
              activeValue === 5 && "bg-green-50 text-green-700"
            )}
          >
            {activeValue ? feedbackByValue[activeValue] : "Elegí una nota del 1 al 5 o tocá Omitir para seguir."}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-gray-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="rounded-xl" onClick={handleSkip} disabled={isPending}>
            Omitir
          </Button>
          <Button variant="ghost" className="rounded-xl" onClick={handleBack} disabled={stepIndex === 0 || isPending}>
            ← Atrás
          </Button>
        </div>
        <Button className="rounded-xl" onClick={handleNext} disabled={activeValue === null || isPending}>
          {isPending ? "Guardando..." : stepIndex === steps.length - 1 ? "Finalizar" : "Siguiente →"}
        </Button>
      </div>
    </div>
  );
}

function MatchInfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/70 px-4 py-3">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function ContextPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "slate" | "emerald";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 transition-colors",
        tone === "blue" && "border-blue-100 bg-blue-50/60",
        tone === "slate" && "border-gray-200 bg-gray-50/80"
      )}
    >
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-6 text-gray-900">{value}</p>
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "emerald" | "slate";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3",
        tone === "emerald" && "border-emerald-100 bg-emerald-50/70",
        tone === "slate" && "border-gray-200 bg-gray-50"
      )}
    >
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-tight text-gray-950">{value}</p>
    </div>
  );
}

