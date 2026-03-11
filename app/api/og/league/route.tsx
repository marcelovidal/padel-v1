import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const leagueId = searchParams.get("leagueId");
  if (!leagueId) return new Response("Missing leagueId", { status: 400 });

  const sb = supabaseAdmin();

  // Fetch league info
  const { data: league } = await sb
    .from("club_leagues")
    .select("id, name, season_label, club_id, clubs(name), league_divisions(id, name, league_groups(id, name, league_teams(id, player_id_a, player_id_b, wins, losses, draws, points)))")
    .eq("id", leagueId)
    .maybeSingle();

  if (!league) return new Response("Not found", { status: 404 });

  const clubName = (league as any).clubs?.name ?? "Club";
  const leagueName = (league as any).name ?? "Liga";
  const seasonLabel = (league as any).season_label ?? "";

  // Get first division, first group standings
  const division = (league as any).league_divisions?.[0];
  const group = division?.league_groups?.[0];
  const teams: any[] = group?.league_teams ?? [];

  // Sort by points desc
  const sorted = [...teams].sort((a, b) => (b.points ?? 0) - (a.points ?? 0)).slice(0, 5);

  // Fetch player names for team display
  const playerIds = sorted.flatMap((t: any) => [t.player_id_a, t.player_id_b].filter(Boolean));
  const { data: players } = await sb
    .from("players")
    .select("id, display_name, first_name, last_name")
    .in("id", playerIds);

  const playerMap = new Map((players ?? []).map((p: any) => [p.id, p.display_name || `${p.first_name} ${p.last_name?.charAt(0)}.`]));
  const teamName = (t: any) => [playerMap.get(t.player_id_a), playerMap.get(t.player_id_b)].filter(Boolean).join(" / ") || "—";

  const today = new Date().toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });

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
          padding: "48px 64px",
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                display: "flex",
                background: "rgba(59,130,246,0.15)",
                border: "1px solid rgba(59,130,246,0.35)",
                borderRadius: "10px",
                padding: "5px 12px",
              }}>
                <span style={{ color: "#60a5fa", fontSize: "16px", fontWeight: 900, letterSpacing: "0.18em" }}>PASALA</span>
              </div>
              <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase" }}>
                Tabla de Liga
              </span>
            </div>
            <span style={{ color: "#ffffff", fontSize: "32px", fontWeight: 900, letterSpacing: "-0.01em" }}>
              {leagueName}{seasonLabel ? ` · ${seasonLabel}` : ""}
            </span>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>{clubName}</span>
          </div>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px", marginTop: "8px" }}>
            {today}
          </span>
        </div>

        {/* Table header */}
        <div style={{ display: "flex", gap: "8px", paddingLeft: "16px", paddingRight: "16px", marginBottom: "8px" }}>
          <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", width: "36px" }}>#</span>
          <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", flex: 1 }}>Dupla</span>
          <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", width: "40px", textAlign: "center" }}>PJ</span>
          <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", width: "40px", textAlign: "center" }}>G</span>
          <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", width: "40px", textAlign: "center" }}>P</span>
          <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", width: "60px", textAlign: "right" }}>PTS</span>
        </div>

        {/* Rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
          {sorted.length === 0 && (
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "16px" }}>Sin datos de tabla aún.</span>
          )}
          {sorted.map((t: any, i: number) => (
            <div key={t.id ?? i} style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: i === 0 ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.04)",
              border: i === 0 ? "1px solid rgba(59,130,246,0.3)" : "1px solid rgba(255,255,255,0.07)",
              borderRadius: "14px",
              padding: "12px 16px",
            }}>
              <span style={{ color: i === 0 ? "#60a5fa" : "rgba(255,255,255,0.4)", fontSize: "16px", fontWeight: 900, width: "36px" }}>
                {i + 1}
              </span>
              <span style={{ color: "#ffffff", fontSize: "18px", fontWeight: 700, flex: 1 }}>{teamName(t)}</span>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "15px", width: "40px", textAlign: "center" }}>
                {(t.wins ?? 0) + (t.losses ?? 0) + (t.draws ?? 0)}
              </span>
              <span style={{ color: "#34d399", fontSize: "15px", fontWeight: 700, width: "40px", textAlign: "center" }}>{t.wins ?? 0}</span>
              <span style={{ color: "#f87171", fontSize: "15px", fontWeight: 700, width: "40px", textAlign: "center" }}>{t.losses ?? 0}</span>
              <span style={{ color: "#60a5fa", fontSize: "20px", fontWeight: 900, width: "60px", textAlign: "right" }}>{t.points ?? 0}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
            pasla.com.ar
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
