import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import { ogFontOptions } from "../_font";


const BADGE_CATALOGUE: Record<string, { icon: string; title: string; description: string }> = {
  primer_partido:   { icon: "🎾", title: "Primer Partido",    description: "¡Cargaste tu primer partido en PASALA!" },
  primera_victoria: { icon: "🏆", title: "Primera Victoria",  description: "¡Tu primera victoria registrada en PASALA!" },
  racha_5:          { icon: "🔥", title: "Racha de 5",        description: "¡5 victorias consecutivas!" },
  racha_10:         { icon: "⚡", title: "Racha de 10",       description: "¡10 victorias consecutivas! Eso es nivel otro." },
  "50_partidos":    { icon: "💯", title: "50 Partidos",       description: "50 partidos cargados. Acá se habla en serio." },
  "100_partidos":   { icon: "👑", title: "100 Partidos",      description: "100 partidos. Leyenda del padel amateur." },
  elite_index:      { icon: "⭐", title: "Índice Elite",      description: "PASALA Index ≥ 70. Nivel de competición." },
  evaluador:        { icon: "🎯", title: "Evaluador",         description: "5 autoevaluaciones técnicas completadas." },
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const badgeKey = searchParams.get("badgeKey") ?? "";
  const playerName = searchParams.get("playerName") ?? "Jugador";
  const unlockedAt = searchParams.get("unlockedAt");

  const badge = BADGE_CATALOGUE[badgeKey] ?? {
    icon: "🏅",
    title: "Logro desbloqueado",
    description: "Nuevo logro conseguido en PASALA.",
  };

  const dateStr = unlockedAt
    ? new Date(unlockedAt).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
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

        {/* Glow */}
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "400px",
          height: "400px",
          background: "radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)",
          display: "flex",
        }} />

        {/* PASALA brand */}
        <div style={{
          display: "flex",
          background: "rgba(59,130,246,0.15)",
          border: "1px solid rgba(59,130,246,0.35)",
          borderRadius: "10px",
          padding: "5px 14px",
          marginBottom: "32px",
        }}>
          <span style={{ color: "#60a5fa", fontSize: "16px", fontWeight: 900, letterSpacing: "0.18em" }}>PASALA</span>
        </div>

        {/* Badge icon */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "120px",
          height: "120px",
          background: "rgba(245,158,11,0.15)",
          border: "2px solid rgba(245,158,11,0.4)",
          borderRadius: "50%",
          fontSize: "56px",
          marginBottom: "24px",
        }}>
          {badge.icon}
        </div>

        {/* Badge title */}
        <span style={{ color: "#f59e0b", fontSize: "14px", fontWeight: 900, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "12px" }}>
          LOGRO DESBLOQUEADO
        </span>
        <span style={{ color: "#ffffff", fontSize: "48px", fontWeight: 900, letterSpacing: "-0.02em", textAlign: "center", lineHeight: 1.1, marginBottom: "16px" }}>
          {badge.title}
        </span>
        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "20px", textAlign: "center", marginBottom: "32px", maxWidth: "600px" }}>
          {badge.description}
        </span>

        {/* Player + date */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
          <span style={{ color: "#ffffff", fontSize: "18px", fontWeight: 700 }}>{playerName}</span>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>{dateStr}</span>
        </div>

        {/* Footer */}
        <span style={{
          position: "absolute",
          bottom: "32px",
          right: "64px",
          color: "rgba(255,255,255,0.2)",
          fontSize: "11px",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
        }}>
          pasla.com.ar
        </span>
      </div>
    ),
    { width: 1200, height: 630, ...ogFontOptions() }
  );
}
