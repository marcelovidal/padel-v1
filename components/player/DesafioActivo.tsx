"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { differenceInCalendarDays } from "date-fns";
import { createBrowserSupabase } from "@/lib/supabase/client";

interface Challenge {
  id: string;
  title: string;
  target_metric: string | null;
  target_value: number | null;
  deadline: string | null;
}

function formatDeadline(deadline: string): string {
  const diff = differenceInCalendarDays(new Date(deadline), new Date());
  if (diff < 0) return `Vencido hace ${Math.abs(diff)} ${Math.abs(diff) === 1 ? "día" : "días"}`;
  if (diff === 0) return "Vence hoy";
  if (diff === 1) return "Vence mañana";
  return `Vence en ${diff} días`;
}

function deadlineColor(deadline: string): string {
  const diff = differenceInCalendarDays(new Date(deadline), new Date());
  if (diff < 0) return "text-red-500";
  if (diff <= 2) return "text-amber-500";
  return "text-slate-400";
}

function barColor(pct: number): string {
  if (pct <= 40) return "bg-amber-400";
  if (pct <= 70) return "bg-blue-500";
  return "bg-green-500";
}

export function DesafioActivo() {
  const [challenge, setChallenge] = useState<Challenge | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createBrowserSupabase();
      const { data, error } = await (supabase as any)
        .from("player_challenges")
        .select("id, title, target_metric, target_value, deadline")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) { setFailed(true); return; }
      setChallenge(data ?? null);
    }
    void load();
  }, []);

  if (failed || challenge === null) return null;

  // skeleton mientras carga
  if (challenge === undefined) {
    return (
      <div className="mx-2 mb-2 rounded-lg border border-slate-100 bg-slate-50 p-3 animate-pulse">
        <div className="h-2 w-20 rounded bg-slate-200 mb-2" />
        <div className="h-3 w-32 rounded bg-slate-200 mb-2" />
        <div className="h-1.5 w-full rounded-full bg-slate-200" />
      </div>
    );
  }

  // Progreso: primera versión sin cálculo real → current = 0
  const hasTarget = challenge.target_value != null && challenge.target_value > 0;
  const current = 0;
  const target = challenge.target_value ?? 0;
  const pct = hasTarget ? Math.min(Math.round((current / target) * 100), 100) : 0;

  return (
    <Link
      href="/player/coach"
      className="mx-2 mb-2 block rounded-lg border border-slate-200 bg-slate-50 p-3 transition-colors hover:border-blue-400 hover:bg-blue-50/40"
    >
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
        Desafío activo
      </p>

      <p className="flex items-start gap-1.5 text-[13px] font-semibold text-slate-900 leading-snug mb-2">
        <span className="shrink-0">🎯</span>
        <span className="line-clamp-2">{challenge.title}</span>
      </p>

      {hasTarget && (
        <>
          {/* Barra de progreso */}
          <div className="mb-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full transition-all ${barColor(pct)}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 mb-1">
            En progreso · {current} / {target}
          </p>
        </>
      )}

      {challenge.deadline && (
        <p className={`text-[11px] font-medium ${deadlineColor(challenge.deadline)}`}>
          {formatDeadline(challenge.deadline)}
        </p>
      )}
    </Link>
  );
}
