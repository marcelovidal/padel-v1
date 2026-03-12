import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ogFontOptions } from "../_font";

type OgPlayer = {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  category: number | null;
  pasala_index: number | null;
  city: string | null;
  region_code: string | null;
  region_name: string | null;
};

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;
  return createClient(url, key);
}

function levelLabel(index: number | null): string {
  if (index === null) return "SIN INDICE";
  if (index >= 75) return "ELITE";
  if (index >= 65) return "EXPERTO";
  if (index >= 55) return "AVANZADO";
  if (index >= 45) return "INTERMEDIO";
  if (index >= 30) return "AMATEUR";
  return "PRINCIPIANTE";
}

function levelColor(index: number | null): string {
  if (index === null) return "#64748b";
  if (index >= 75) return "#f59e0b";
  if (index >= 65) return "#a78bfa";
  if (index >= 55) return "#22d3ee";
  if (index >= 45) return "#34d399";
  return "#60a5fa";
}

function displayNameOf(player: OgPlayer): string {
  if (player.display_name && player.display_name.trim().length > 0) return player.display_name;
  const full = [player.first_name, player.last_name].filter(Boolean).join(" ").trim();
  return full || "Jugador PASALA";
}

async function fetchPlayer(sb: any, playerId: string): Promise<OgPlayer | null> {
  const full = await sb
    .from("players")
    .select("id, display_name, first_name, last_name, category, pasala_index, city, region_code, region_name")
    .eq("id", playerId)
    .maybeSingle();

  if (!full.error && full.data) return full.data as OgPlayer;

  // Fallback for environments where region columns are not present.
  const basic = await sb
    .from("players")
    .select("id, display_name, first_name, last_name, category, pasala_index, city")
    .eq("id", playerId)
    .maybeSingle();

  if (basic.error || !basic.data) return null;

  return {
    ...(basic.data as any),
    region_code: null,
    region_name: null,
  } as OgPlayer;
}

async function fetchMetrics(sb: any, playerId: string) {
  try {
    const { data } = await (sb as any).rpc("player_get_profile_metrics", { p_player_id: playerId });
    return {
      played: Number(data?.played ?? 0),
      wins: Number(data?.wins ?? 0),
    };
  } catch {
    return { played: 0, wins: 0 };
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const playerId = searchParams.get("id");
  if (!playerId) return new Response("Missing id", { status: 400 });

  let player: OgPlayer | null = null;
  let played = 0;
  let wins = 0;

  const sb = supabaseAdmin();
  if (sb) {
    try {
      player = await fetchPlayer(sb, playerId);
      if (player) {
        const metrics = await fetchMetrics(sb, playerId);
        played = metrics.played;
        wins = metrics.wins;
      }
    } catch {
      // Keep fallback player and zero metrics.
    }
  }

  // Never return 500/404 for OG preview in share modal.
  if (!player) {
    player = {
      id: playerId,
      display_name: searchParams.get("name") || "Jugador PASALA",
      first_name: null,
      last_name: null,
      category: null,
      pasala_index: null,
      city: searchParams.get("city"),
      region_code: searchParams.get("region_code"),
      region_name: searchParams.get("region_name"),
    };
  }

  const index = player.pasala_index != null ? Math.round(player.pasala_index) : null;
  const pct = index !== null ? Math.max(0, Math.min(index / 100, 1)) : 0;
  const winRate = played > 0 ? Math.round((wins / played) * 100) : 0;
  const accent = levelColor(index);
  const level = levelLabel(index);
  const location = [player.city, player.region_name || player.region_code].filter(Boolean).join(", ");

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
          gap: "56px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "300px" }}>
          <div style={{ position: "relative", width: "200px", height: "200px", marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="200" height="200" viewBox="0 0 200 200" style={{ position: "absolute", inset: 0 }}>
              <circle cx="100" cy="100" r="86" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
              <circle
                cx="100"
                cy="100"
                r="86"
                fill="none"
                stroke={accent}
                strokeWidth="12"
                strokeDasharray={`${2 * Math.PI * 86}`}
                strokeDashoffset={`${2 * Math.PI * 86 * (1 - pct)}`}
                strokeLinecap="round"
                transform="rotate(-90 100 100)"
              />
            </svg>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ color: "#ffffff", fontSize: "52px", fontWeight: 900, lineHeight: 1 }}>{index ?? "-"}</span>
              <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.15em", marginTop: "4px" }}>PASALA</span>
            </div>
          </div>
          <div style={{ display: "flex", border: `1px solid ${accent}55`, background: `${accent}22`, borderRadius: "10px", padding: "6px 16px" }}>
            <span style={{ color: accent, fontSize: "13px", fontWeight: 900, letterSpacing: "0.15em" }}>{level}</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1 }}>
          <span style={{ color: "rgba(96,165,250,0.95)", fontSize: "15px", fontWeight: 900, letterSpacing: "0.2em", marginBottom: "18px" }}>PASALA PLAYER CARD</span>
          <span style={{ color: "#ffffff", fontSize: "60px", fontWeight: 900, lineHeight: 1, letterSpacing: "-0.02em" }}>{displayNameOf(player)}</span>
          {location ? (
            <span style={{ color: "rgba(255,255,255,0.42)", fontSize: "18px", marginTop: "10px" }}>{location}</span>
          ) : null}

          <div style={{ display: "flex", gap: "16px", marginTop: "34px" }}>
            {[{ label: "Partidos", value: String(played) }, { label: "Victorias", value: String(wins) }, { label: "Win Rate", value: `${winRate}%` }].map((item) => (
              <div key={item.label} style={{ display: "flex", flexDirection: "column", minWidth: "150px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", padding: "14px 20px" }}>
                <span style={{ color: "rgba(255,255,255,0.38)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: "8px" }}>{item.label}</span>
                <span style={{ color: "#ffffff", fontSize: "34px", fontWeight: 900, lineHeight: 1 }}>{item.value}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "26px" }}>
            {player.category ? (
              <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "13px", fontWeight: 700 }}>{player.category}a Categoria</span>
            ) : <span style={{ display: "flex" }} />}
            <span style={{ color: "rgba(255,255,255,0.22)", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase" }}>pasala.com.ar</span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, ...ogFontOptions() }
  );
}
