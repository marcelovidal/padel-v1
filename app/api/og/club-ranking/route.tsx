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

const MEDALS = ["🥇", "🥈", "🥉", "4°", "5°"];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clubId = searchParams.get("clubId");
  const clubName = searchParams.get("name") ?? "Club";
  if (!clubId) return new Response("Missing clubId", { status: 400 });

  const sb = supabaseAdmin();
  const { data: ranking } = await sb
    .rpc("get_club_ranking", { p_club_id: clubId, p_limit: 5, p_offset: 0 })
    .select("*");

  const rows: any[] = ranking ?? [];
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "36px" }}>
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
                Club Ranking
              </span>
            </div>
            <span style={{ color: "#ffffff", fontSize: "36px", fontWeight: 900, letterSpacing: "-0.01em" }}>{clubName}</span>
          </div>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px", marginTop: "8px" }}>
            Actualizado: {today}
          </span>
        </div>

        {/* Ranking rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
          {rows.length === 0 && (
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "16px" }}>Sin datos de ranking aún.</span>
          )}
          {rows.slice(0, 5).map((row: any, i: number) => (
            <div key={row.player_id ?? i} style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
              background: i === 0 ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.04)",
              border: i === 0 ? "1px solid rgba(245,158,11,0.3)" : "1px solid rgba(255,255,255,0.07)",
              borderRadius: "16px",
              padding: "14px 24px",
            }}>
              {/* Position */}
              <span style={{ fontSize: "20px", width: "36px", textAlign: "center" }}>
                {i < 3 ? MEDALS[i] : `${i + 1}°`}
              </span>
              {/* Name */}
              <span style={{ color: "#ffffff", fontSize: "20px", fontWeight: 800, flex: 1 }}>
                {row.display_name ?? "—"}
              </span>
              {/* Category */}
              {row.category && (
                <span style={{
                  color: "rgba(255,255,255,0.35)",
                  fontSize: "12px",
                  fontWeight: 700,
                  background: "rgba(255,255,255,0.07)",
                  borderRadius: "8px",
                  padding: "4px 10px",
                }}>
                  {row.category}ª CAT
                </span>
              )}
              {/* Points */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <span style={{ color: "#60a5fa", fontSize: "24px", fontWeight: 900 }}>{row.points}</span>
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "10px", letterSpacing: "0.15em" }}>PTS</span>
              </div>
              {/* W/L */}
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", width: "56px", textAlign: "right" }}>
                {row.wins}G {row.losses}P
              </span>
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
    { width: 1200, height: 630, ...ogFontOptions() }
  );
}
