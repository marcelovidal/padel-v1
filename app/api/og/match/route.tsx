import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ogFontOptions } from "../_font";


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
  const sets: Array<{ a: number; b: number }> = (match.match_results as any)?.sets ?? [];
  const winner = (match.match_results as any)?.winner_team as "A" | "B" | null ?? null;
  const matchDate = new Date(match.match_at as string).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const name = (p: any) => `${p?.players?.first_name ?? ""} ${(p?.players?.last_name ?? "").charAt(0)}.`.trim();
  const namesA = teamA.map(name).join(" / ") || "—";
  const namesB = teamB.map(name).join(" / ") || "—";
  const indexA = teamA[0]?.players?.pasala_index ?? null;
  const indexB = teamB[0]?.players?.pasala_index ?? null;

  const setsStr = sets.map((s) => `${s.a}-${s.b}`).join("  ");

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
          padding: "56px 64px",
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              display: "flex",
              background: "rgba(59,130,246,0.2)",
              border: "1px solid rgba(59,130,246,0.4)",
              borderRadius: "12px",
              padding: "6px 14px",
            }}>
              <span style={{ color: "#60a5fa", fontSize: "22px", fontWeight: 900, letterSpacing: "0.15em" }}>PASALA</span>
            </div>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" }}>
              Resultado de Partido
            </span>
          </div>
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "13px" }}>
            {match.club_name} · {matchDate}
          </span>
        </div>

        {/* Score */}
        {sets.length > 0 && (
          <div style={{
            display: "flex",
            justifyContent: "center",
            gap: "16px",
            marginBottom: "32px",
          }}>
            {sets.map((s, i) => (
              <div key={i} style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "16px",
                padding: "12px 20px",
              }}>
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", marginBottom: "8px" }}>
                  SET {i + 1}
                </span>
                <span style={{ color: winner === "A" ? "#60a5fa" : "#ffffff", fontSize: "36px", fontWeight: 900 }}>{s.a}</span>
                <div style={{ width: "24px", height: "1px", background: "rgba(255,255,255,0.15)", margin: "4px 0", display: "flex" }} />
                <span style={{ color: winner === "B" ? "#60a5fa" : "#ffffff", fontSize: "36px", fontWeight: 900 }}>{s.b}</span>
              </div>
            ))}
          </div>
        )}

        {/* Teams */}
        <div style={{ display: "flex", gap: "16px", flex: 1 }}>
          {/* Team A */}
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            background: winner === "A" ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.04)",
            border: winner === "A" ? "1px solid rgba(59,130,246,0.4)" : "1px solid rgba(255,255,255,0.08)",
            borderRadius: "24px",
            padding: "24px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ color: "#60a5fa", fontSize: "10px", fontWeight: 900, letterSpacing: "0.2em", textTransform: "uppercase" }}>
                Equipo A
              </span>
              {winner === "A" && (
                <span style={{
                  background: "#2563eb",
                  color: "white",
                  fontSize: "10px",
                  fontWeight: 900,
                  letterSpacing: "0.15em",
                  padding: "4px 10px",
                  borderRadius: "8px",
                  textTransform: "uppercase",
                }}>
                  GANADOR
                </span>
              )}
            </div>
            <span style={{ color: "#ffffff", fontSize: "22px", fontWeight: 900, lineHeight: 1.2, marginBottom: "8px" }}>{namesA}</span>
            {indexA !== null && (
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px" }}>
                PASALA {Math.round(indexA)} · {levelLabel(indexA)}
              </span>
            )}
          </div>

          {/* vs */}
          <div style={{ display: "flex", alignItems: "center", padding: "0 8px" }}>
            <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "18px", fontWeight: 900 }}>VS</span>
          </div>

          {/* Team B */}
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            background: winner === "B" ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.04)",
            border: winner === "B" ? "1px solid rgba(59,130,246,0.4)" : "1px solid rgba(255,255,255,0.08)",
            borderRadius: "24px",
            padding: "24px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ color: "#f87171", fontSize: "10px", fontWeight: 900, letterSpacing: "0.2em", textTransform: "uppercase" }}>
                Equipo B
              </span>
              {winner === "B" && (
                <span style={{
                  background: "#2563eb",
                  color: "white",
                  fontSize: "10px",
                  fontWeight: 900,
                  letterSpacing: "0.15em",
                  padding: "4px 10px",
                  borderRadius: "8px",
                  textTransform: "uppercase",
                }}>
                  GANADOR
                </span>
              )}
            </div>
            <span style={{ color: "#ffffff", fontSize: "22px", fontWeight: 900, lineHeight: 1.2, marginBottom: "8px" }}>{namesB}</span>
            {indexB !== null && (
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px" }}>
                PASALA {Math.round(indexB)} · {levelLabel(indexB)}
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
            pasla.com.ar
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630, ...ogFontOptions() }
  );
}
