import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";


function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function levelLabel(index: number | null): string {
  if (index === null) return "Sin índice";
  if (index >= 75) return "ELITE";
  if (index >= 65) return "EXPERTO";
  if (index >= 55) return "AVANZADO";
  if (index >= 45) return "INTERMEDIO";
  if (index >= 30) return "AMATEUR";
  return "PRINCIPIANTE";
}

function levelColor(index: number | null): string {
  if (index === null) return "#475569";
  if (index >= 75) return "#f59e0b";
  if (index >= 65) return "#a78bfa";
  if (index >= 55) return "#22d3ee";
  if (index >= 45) return "#34d399";
  return "#60a5fa";
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const playerId = searchParams.get("id");
  if (!playerId) return new Response("Missing id", { status: 400 });

  const sb = supabaseAdmin();
  const { data: player } = await sb
    .from("players")
    .select("id, display_name, first_name, last_name, category, pasala_index, city, region_code")
    .eq("id", playerId)
    .maybeSingle();

  if (!player) return new Response("Not found", { status: 404 });

  // Metrics via the profile metrics RPC
  let played = 0;
  let wins = 0;
  try {
    const { data: metricsData } = await (sb as any).rpc("player_get_profile_metrics", { p_player_id: playerId });
    played = metricsData?.played ?? 0;
    wins = metricsData?.wins ?? 0;
  } catch {
    // metrics unavailable — show zeros
  }
  const winRate = played > 0 ? Math.round((wins / played) * 100) : 0;

  const index = player.pasala_index != null ? Math.round(player.pasala_index) : null;
  const indexFraction = index !== null ? index / 100 : 0;
  const level = levelLabel(index);
  const accent = levelColor(index);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "1200px",
          height: "630px",
          background: "linear-gradient(135deg, #05111f 0%, #07172d 55%, #07162a 100%)",
          fontFamily: "sans-serif",
          padding: "56px 64px",
          position: "relative",
          gap: "48px",
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

        {/* Left: Index ring + name */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "340px" }}>
          {/* Circle */}
          <div style={{ position: "relative", width: "200px", height: "200px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "24px" }}>
            <svg width="200" height="200" viewBox="0 0 200 200" style={{ position: "absolute", inset: 0 }}>
              <circle cx="100" cy="100" r="86" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
              <circle
                cx="100" cy="100" r="86"
                fill="none"
                stroke={accent}
                strokeWidth="12"
                strokeDasharray={`${2 * Math.PI * 86}`}
                strokeDashoffset={`${2 * Math.PI * 86 * (1 - indexFraction)}`}
                strokeLinecap="round"
                transform="rotate(-90 100 100)"
              />
            </svg>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ color: "#ffffff", fontSize: "52px", fontWeight: 900, lineHeight: 1 }}>
                {index ?? "—"}
              </span>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.15em", marginTop: "4px" }}>
                PASALA
              </span>
            </div>
          </div>
          {/* Level badge */}
          <div style={{
            display: "flex",
            background: `${accent}20`,
            border: `1px solid ${accent}50`,
            borderRadius: "10px",
            padding: "6px 16px",
            marginBottom: "16px",
          }}>
            <span style={{ color: accent, fontSize: "13px", fontWeight: 900, letterSpacing: "0.15em" }}>{level}</span>
          </div>
          {player.category && (
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", fontWeight: 700 }}>
              {player.category}ª Categoría
            </span>
          )}
        </div>

        {/* Right: Player info + stats */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", gap: "0px" }}>
          {/* PASALA brand */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
            <div style={{
              display: "flex",
              background: "rgba(59,130,246,0.15)",
              border: "1px solid rgba(59,130,246,0.35)",
              borderRadius: "10px",
              padding: "5px 12px",
            }}>
              <span style={{ color: "#60a5fa", fontSize: "16px", fontWeight: 900, letterSpacing: "0.18em" }}>PASALA</span>
            </div>
            <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase" }}>Player Card</span>
          </div>

          {/* Name */}
          <div style={{ display: "flex", flexDirection: "column", marginBottom: "32px" }}>
            <span style={{ color: "#ffffff", fontSize: "52px", fontWeight: 900, lineHeight: 1, letterSpacing: "-0.02em" }}>
              {player.display_name || `${player.first_name} ${player.last_name}`}
            </span>
            {(player.city || player.region_code) && (
              <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "16px", marginTop: "8px" }}>
                {[player.city, player.region_code].filter(Boolean).join(", ")}
              </span>
            )}
          </div>

          {/* Stats grid */}
          <div style={{ display: "flex", gap: "16px" }}>
            {[
              { label: "Partidos", value: played.toString() },
              { label: "Victorias", value: wins.toString() },
              { label: "Win Rate", value: `${winRate}%` },
            ].map(({ label, value }) => (
              <div key={label} style={{
                display: "flex",
                flexDirection: "column",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: "16px",
                padding: "16px 24px",
                minWidth: "120px",
              }}>
                <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "8px" }}>
                  {label}
                </span>
                <span style={{ color: "#ffffff", fontSize: "32px", fontWeight: 900, lineHeight: 1 }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "auto", paddingTop: "24px" }}>
            <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
              pasla.com.ar
            </span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
