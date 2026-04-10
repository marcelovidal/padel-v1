"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { differenceInCalendarDays } from "date-fns";
import { createBrowserSupabase } from "@/lib/supabase/client";

interface LastMatch {
  match_id: string;
  match_at: string;
  club_name: string;
  my_team: string;
  winner_team: string;
  rival_name: string | null;
}

function formatRelativeDay(matchAt: string): string {
  const diff = differenceInCalendarDays(new Date(), new Date(matchAt));
  if (diff === 0) return "hoy";
  if (diff === 1) return "ayer";
  return `hace ${diff} días`;
}

export function UltimoPartido() {
  const [match, setMatch] = useState<LastMatch | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createBrowserSupabase();
      const { data, error } = await (supabase as any).rpc("get_player_last_match");

      if (error || !Array.isArray(data) || data.length === 0) {
        // error → fail silently; sin datos → no mostrar
        if (error) setFailed(true);
        else setMatch(null);
        return;
      }

      setMatch(data[0] as LastMatch);
    }
    void load();
  }, []);

  // fail silently
  if (failed || match === null) return null;

  // skeleton mientras carga
  if (match === undefined) {
    return (
      <div className="mx-2 mb-2 rounded-lg border border-slate-100 bg-slate-50 p-3 animate-pulse">
        <div className="h-2 w-16 rounded bg-slate-200 mb-2" />
        <div className="h-3 w-28 rounded bg-slate-200 mb-1.5" />
        <div className="h-2.5 w-20 rounded bg-slate-200" />
      </div>
    );
  }

  const won = match.my_team === match.winner_team;

  return (
    <Link
      href="/player/matches"
      className="mx-2 mb-2 block rounded-lg border border-slate-200 bg-slate-50 p-3 transition-colors hover:border-blue-400 hover:bg-blue-50/40"
    >
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
        Último partido
      </p>

      <div className="flex items-center gap-1.5">
        <span className="text-base leading-none">{won ? "✅" : "❌"}</span>
        <span
          className={`text-[13px] font-semibold leading-none ${
            won ? "text-green-600" : "text-red-600"
          }`}
        >
          {won ? "Ganado" : "Perdido"}
        </span>
        <span className="text-[12px] text-slate-400 leading-none">
          · {formatRelativeDay(match.match_at)}
        </span>
      </div>

      {(match.rival_name || match.club_name) && (
        <p className="mt-1 text-[12px] text-slate-500 truncate">
          {match.rival_name && <>vs. {match.rival_name}</>}
          {match.rival_name && match.club_name && " · "}
          {match.club_name}
        </p>
      )}
    </Link>
  );
}
