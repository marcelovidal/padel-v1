import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ogFontOptions } from "../_font";
import { normalizeSets } from "@/lib/match/matchUtils";


function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function levelLabel(index: number | null): string {
  if (index === null) return "";
  if (index >= 75) return "Elite";
  if (index >= 65) return "Experto";
  if (index >= 55) return "Avanzado";
  if (index >= 45) return "Intermedio";
  if (index >= 30) return "Amateur";
  return "Principiante";
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const matchId = searchParams.get("id");
  if (!matchId) return new Response("Missing id", { status: 400 });

  const sb = supabaseAdmin();
  const { data: match } = await sb
    .from("matches")
    .select(`
      id, match_at, club_name,
      match_players(team, players(first_name, last_name, pasala_index)),
      match_results(sets, winner_team)
    `)
    .eq("id", matchId)
    .single();

  if (!match) return new Response("Not found", { status: 404 });

  const teamA = (match.match_players as any[]).filter((p) => p.team === "A");
  const teamB = (match.match_players as any[]).filter((p) => p.team === "B");
  // Supabase returns match_results as array (one-to-many FK); normalize to single object
  const result = Array.isArray(match.match_results)
    ? (match.match_results[0] ?? null)
    : (match.match_results ?? null);
  // normalizeSets handles both {a,b} and {team_a_games,team_b_games} formats
  const sets = normalizeSets((result as any)?.sets);
  const winner = (result as any)?.winner_team as "A" | "B" | null ?? null;
  const matchDateRaw = match.match_at || (match as any).created_at;
  const matchDate = matchDateRaw
    ? new Date(matchDateRaw as string).toLocaleDateString("es-AR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  const name = (p: any) => `${p?.players?.first_name ?? ""} ${(p?.players?.last_name ?? "").charAt(0)}.`.trim();
  const namesA = teamA.map(name).join(" / ") || "—";
  const namesB = teamB.map(name).join(" / ") || "—";
  const indexA = teamA[0]?.players?.pasala_index ?? null;
  const indexB = teamB[0]?.players?.pasala_index ?? null;

  // Exact color tokens from MatchScore.tsx (Tailwind palette)
  const BLUE_600 = "#2563eb";
  const BLUE_700 = "#1d4ed8";
  const RED_600  = "#dc2626";
  const GRAY_400 = "#9ca3af";
  const GRAY_500 = "#6b7280";
  const GRAY_900 = "#111827";
  const BLUE_50  = "#eff6ff";

  // Column widths (px) — must match between header and rows
  const COL_TEAM   = 540;
  const COL_SET    = 90;
  const COL_WINNER = 160;

  const TeamRow = ({
    label, labelColor, names, index, isWinner, teamKey,
  }: {
    label: string; labelColor: string; names: string; index: number | null;
    isWinner: boolean; teamKey: "A" | "B";
  }) => (
    <div style={{
      display: "flex",
      alignItems: "center",
      background: isWinner ? BLUE_50 : "#ffffff",
      padding: "20px 24px",
      borderBottom: "1px solid #f3f4f6",
    }}>
      <div style={{ display: "flex", flexDirection: "column", width: `${COL_TEAM}px` }}>
        <span style={{ color: labelColor, fontSize: "10px", fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "5px" }}>
          {label}
        </span>
        <span style={{ color: GRAY_900, fontSize: "24px", fontWeight: 900, lineHeight: 1.1, marginBottom: "3px" }}>{names}</span>
        {index !== null && (
          <span style={{ color: GRAY_500, fontSize: "11px" }}>
            PASALA {Math.round(index)} · {levelLabel(index)}
          </span>
        )}
      </div>
      {/* Set scores */}
      {sets.slice(0, 3).map((s, i) => (
        <span key={i} style={{
          color: isWinner ? BLUE_700 : GRAY_500,
          fontSize: "34px",
          fontWeight: 900,
          width: `${COL_SET}px`,
          display: "flex",
          justifyContent: "center",
        }}>
          {teamKey === "A" ? (s.a ?? "-") : (s.b ?? "-")}
        </span>
      ))}
      {sets.length < 3 && Array.from({ length: 3 - sets.length }).map((_, i) => (
        <span key={`pad-${i}`} style={{ width: `${COL_SET}px`, display: "flex" }} />
      ))}
      {/* Winner badge */}
      <div style={{ width: `${COL_WINNER}px`, display: "flex", justifyContent: "flex-end" }}>
        {isWinner && (
          <span style={{
            background: BLUE_600,
            color: "white",
            fontSize: "10px",
            fontWeight: 900,
            letterSpacing: "0.12em",
            padding: "6px 14px",
            borderRadius: "6px",
            textTransform: "uppercase",
            display: "flex",
          }}>
            GANADOR
          </span>
        )}
      </div>
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "1200px",
          height: "630px",
          background: "linear-gradient(135deg, #05111f 0%, #07172d 55%, #07162a 100%)",
          fontFamily: "sans-serif",
          padding: "52px 64px",
          position: "relative",
        }}
      >
        {/* Grid overlay */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          opacity: 0.4,
          display: "flex",
        }} />

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              display: "flex",
              background: "rgba(59,130,246,0.2)",
              border: "1px solid rgba(59,130,246,0.4)",
              borderRadius: "12px",
              padding: "6px 14px",
            }}>
              <span style={{ color: "#60a5fa", fontSize: "20px", fontWeight: 900, letterSpacing: "0.15em" }}>PASALA</span>
            </div>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" }}>
              Resultado de Partido
            </span>
          </div>
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "13px" }}>
            {match.club_name} · {matchDate}
          </span>
        </div>

        {/* White results card */}
        <div style={{ display: "flex", flexDirection: "column", borderRadius: "16px", overflow: "hidden", boxShadow: "0 4px 32px rgba(0,0,0,0.35)" }}>
          {/* Table header */}
          <div style={{
            display: "flex",
            alignItems: "center",
            background: "#f9fafb",
            padding: "10px 24px",
            borderBottom: "1px solid #e5e7eb",
          }}>
            <span style={{ color: GRAY_400, fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", width: `${COL_TEAM}px`, display: "flex" }}>Equipos</span>
            {sets.slice(0, 3).map((_, i) => (
              <span key={i} style={{ color: GRAY_400, fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", width: `${COL_SET}px`, display: "flex", justifyContent: "center" }}>
                Set {i + 1}
              </span>
            ))}
            {sets.length < 3 && Array.from({ length: 3 - sets.length }).map((_, i) => (
              <span key={`ph-${i}`} style={{ width: `${COL_SET}px`, display: "flex" }} />
            ))}
            <span style={{ color: GRAY_400, fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", width: `${COL_WINNER}px`, display: "flex", justifyContent: "flex-end" }}>Ganador</span>
          </div>

          <TeamRow label="Equipo A" labelColor={BLUE_600} names={namesA} index={indexA} isWinner={winner === "A"} teamKey="A" />
          <TeamRow label="Equipo B" labelColor={RED_600}  names={namesB} index={indexB} isWinner={winner === "B"} teamKey="B" />
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "auto" }}>
          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
            pasala.com.ar
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630, ...ogFontOptions() }
  );
}
