"use client";

import { useEffect, useRef, useState } from "react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import Link from "next/link";
import { PlusCircle, Star, Trophy, Target, Activity, Zap } from "lucide-react";

interface PlayerHeroCardProps {
  playerName: string;
  avatarSrc: string | null;
  avatarInitials: string;
  category?: number | string | null;
  metrics: {
    pasala_index: number | null;
    win_rate_score: number;
    rival_level_score: number;
    perf_score: number;
    recent_score: number;
    volume_score: number;
    played: number;
    wins: number;
    win_rate: number;
    current_streak: string;
  };
  globalRank: { rank: number | null; total: number | null };
}

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const FACTORS = [
  { key: "win_rate_score",    label: "Efectividad",    pct: 35, color: "bg-blue-400" },
  { key: "rival_level_score", label: "Nivel rivales",  pct: 25, color: "bg-violet-400" },
  { key: "perf_score",        label: "Técnica",        pct: 20, color: "bg-cyan-400" },
  { key: "recent_score",      label: "Forma reciente", pct: 12, color: "bg-emerald-400" },
  { key: "volume_score",      label: "Experiencia",    pct: 8,  color: "bg-amber-400" },
] as const;

function getLevelInfo(index: number | null): { label: string; color: string } {
  if (index === null) return { label: "Sin índice", color: "text-blue-300/60" };
  if (index >= 75) return { label: "Elite", color: "text-amber-400" };
  if (index >= 65) return { label: "Experto", color: "text-violet-400" };
  if (index >= 55) return { label: "Avanzado", color: "text-cyan-400" };
  if (index >= 45) return { label: "Intermedio", color: "text-emerald-400" };
  if (index >= 30) return { label: "Amateur", color: "text-blue-300" };
  return { label: "Principiante", color: "text-blue-300/70" };
}

function useCountUp(target: number | null, duration = 1200) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === null) return;
    const startTime = Date.now();
    const startVal = 0;

    function tick() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(startVal + ((target ?? 0) - startVal) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return target === null ? null : value;
}

export function PlayerHeroCard({
  playerName,
  avatarSrc,
  avatarInitials,
  category,
  metrics,
  globalRank,
}: PlayerHeroCardProps) {
  const animatedIndex = useCountUp(metrics.pasala_index);
  const displayIndex = animatedIndex ?? 0;
  const strokeDash = metrics.pasala_index !== null
    ? (displayIndex / 100) * CIRCUMFERENCE
    : 0;
  const level = getLevelInfo(metrics.pasala_index);

  const factorValues: Record<string, number> = {
    win_rate_score:    metrics.win_rate_score,
    rival_level_score: metrics.rival_level_score,
    perf_score:        metrics.perf_score,
    recent_score:      metrics.recent_score,
    volume_score:      metrics.volume_score,
  };

  return (
    <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 p-8 text-white shadow-2xl shadow-blue-950/50">
      {/* decorative blobs */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-blue-700/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-indigo-700/20 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center">
        {/* Left: avatar + greeting */}
        <div className="flex items-center gap-5">
          <div className="relative flex-shrink-0">
            <UserAvatar
              src={avatarSrc}
              initials={avatarInitials}
              size="xl"
              className="ring-4 ring-white/10 shadow-xl"
            />
            <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 shadow-lg ring-2 ring-blue-950">
              <Star className="h-3.5 w-3.5 fill-white text-white" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-400/80">
              Tu panel de juego
            </p>
            <h1 className="text-3xl font-black tracking-tight">
              Hola, {playerName}
            </h1>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-widest ${level.color}`}>
                {level.label}
              </span>
              {category != null && (
                <span className="rounded-full border border-white/15 bg-white/8 px-2 py-0.5 text-[10px] font-black text-blue-200">
                  {category}ª CAT
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Circular index */}
        <div className="flex flex-col items-center gap-4 lg:mx-auto">
          <div className="relative">
            <svg width="148" height="148" viewBox="0 0 148 148" className="rotate-[-90deg]">
              {/* Track */}
              <circle
                cx="74" cy="74" r={RADIUS}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="10"
              />
              {/* Progress */}
              <circle
                cx="74" cy="74" r={RADIUS}
                fill="none"
                stroke="#60a5fa"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${strokeDash} ${CIRCUMFERENCE}`}
                style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.16,1,0.3,1)" }}
              />
            </svg>
            {/* Inner text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black tabular-nums leading-none">
                {metrics.pasala_index !== null ? displayIndex : "—"}
              </span>
              <span className="text-xs font-bold text-blue-400">/100</span>
              <span className="mt-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-blue-300/60">
                PASALA
              </span>
            </div>
          </div>

          {/* Global rank */}
          {globalRank.rank !== null && (
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-1.5">
              <Trophy className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-black text-white">
                #{globalRank.rank}
                <span className="font-medium text-blue-300/70"> de {globalRank.total}</span>
              </span>
            </div>
          )}
        </div>

        {/* Right: factors + stats + actions */}
        <div className="flex flex-1 flex-col gap-6 lg:max-w-xs">
          {/* Factor bars */}
          <div className="space-y-2.5">
            {FACTORS.map(({ key, label, pct, color }) => {
              const val = factorValues[key] ?? 0;
              return (
                <div key={key}>
                  <div className="mb-1 flex justify-between text-[9px] font-black uppercase tracking-wider text-blue-300/60">
                    <span>{label} <span className="normal-case font-medium text-blue-400/40">({pct}%)</span></span>
                    <span>{val.toFixed(0)}</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full ${color} transition-all duration-700 ease-out`}
                      style={{ width: `${Math.min((val * pct) / 100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick stats chips */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: Activity, value: String(metrics.played), label: "PJ" },
              { icon: Trophy,   value: String(metrics.wins),   label: "G" },
              { icon: Target,   value: `${metrics.win_rate}%`, label: "WR" },
              { icon: Zap,      value: metrics.current_streak, label: "Racha" },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/5 py-2.5">
                <Icon className="mb-1 h-3 w-3 text-blue-300/60" />
                <span className="text-sm font-black leading-none">{value}</span>
                <span className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-blue-400/60">{label}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Link href="/player/matches/new" className="flex-1">
              <button className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-blue-500 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-900/50 hover:bg-blue-400 transition-colors active:scale-95">
                <PlusCircle className="h-3.5 w-3.5" />
                Cargar partido
              </button>
            </Link>
            <Link href="/player/profile">
              <button className="rounded-2xl border border-white/15 bg-white/8 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-blue-200 hover:bg-white/15 transition-colors active:scale-95">
                Perfil
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

