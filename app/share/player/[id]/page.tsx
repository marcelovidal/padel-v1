import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlayerService } from "@/services/player.service";
import { getSiteUrl } from "@/lib/utils/url";
import { buildOgPlayerUrl, buildSharePlayerUrl } from "@/lib/share/shareMessage";
import Link from "next/link";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://pasala.com.ar";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const ogImage = `${SITE_URL}/api/og/player?id=${encodeURIComponent(params.id)}`;
  const pageUrl = `${SITE_URL}/share/player/${params.id}`;
  return {
    title: "Perfil de jugador | PASALA",
    openGraph: {
      type: "website",
      url: pageUrl,
      title: "Perfil de jugador | PASALA",
      description: "Mirá el perfil, estadísticas e índice PASALA de este jugador.",
      images: [{ url: ogImage, width: 1200, height: 630, alt: "Perfil de jugador PASALA" }],
    },
    twitter: { card: "summary_large_image", title: "Perfil de jugador | PASALA", images: [ogImage] },
  };
}

function levelLabel(index: number | null) {
  if (!index) return null;
  if (index >= 70) return { label: "Elite", color: "#f59e0b" };
  if (index >= 55) return { label: "Experto", color: "#8b5cf6" };
  if (index >= 40) return { label: "Avanzado", color: "#3b82f6" };
  if (index >= 25) return { label: "Intermedio", color: "#10b981" };
  return { label: "Iniciante", color: "#6b7280" };
}

export default async function SharePlayerPage({ params }: { params: { id: string } }) {
  const playerService = new PlayerService();
  const player = await playerService.getPublicPlayerData(params.id);
  if (!player) notFound();

  const siteUrl = getSiteUrl();
  const heroStats = await playerService.getPublicHeroStats(player.id);
  const metrics = heroStats?.metrics;

  const pasalaIndex = metrics?.pasala_index ?? null;
  const played = Number(metrics?.played ?? 0);
  const wins = Number(metrics?.wins ?? 0);
  const winRate = Number(metrics?.win_rate ?? 0);
  const level = levelLabel(pasalaIndex);

  const locationLabel = [player.city, player.region_name].filter(Boolean).join(", ");
  const publicProfileUrl = `${siteUrl}/p/${player.id}`;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center px-4 py-8">
      {/* Header */}
      <div className="mb-6 text-center">
        <span className="text-2xl font-black text-[#2563EB] tracking-tighter uppercase italic">PASALA</span>
        <p className="text-[10px] font-bold text-[#475569] uppercase tracking-widest mt-0.5">Perfil de Jugador</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-lg border border-[#E2E8F0] overflow-hidden">
        {/* Player header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#E2E8F0]">
          <h2 className="text-xl font-black text-[#0F172A]">{player.display_name}</h2>
          {locationLabel && (
            <p className="text-xs text-[#475569] mt-0.5">{locationLabel}</p>
          )}
          {player.category && (
            <span className="mt-2 inline-block text-[10px] font-black uppercase tracking-widest text-[#2563EB] bg-blue-50 border border-blue-100 rounded-full px-2.5 py-0.5">
              {player.category}ª Categoría
            </span>
          )}
        </div>

        {/* PASALA Index */}
        <div className="px-6 py-5 flex items-center gap-5">
          <div className="flex-shrink-0 flex flex-col items-center justify-center w-20 h-20 rounded-full border-4 border-[#E2E8F0]" style={level ? { borderColor: level.color + "40" } : {}}>
            <span className="text-2xl font-black" style={{ color: level?.color ?? "#2563EB" }}>
              {pasalaIndex !== null ? Math.round(pasalaIndex) : "—"}
            </span>
            <span className="text-[9px] font-black uppercase tracking-widest text-[#475569]">Índice</span>
          </div>
          <div className="flex-1">
            {level && (
              <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: level.color }}>
                {level.label}
              </span>
            )}
            <div className="mt-2 grid grid-cols-3 gap-2">
              <div className="text-center">
                <p className="text-lg font-black text-[#0F172A]">{played}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#475569]">PJ</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-black text-[#0F172A]">{wins}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#475569]">Vic</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-black text-[#2563EB]">{winRate}%</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#475569]">W%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-6 w-full max-w-sm">
        <Link
          href={publicProfileUrl}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2563EB] py-3.5 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors"
        >
          Ver perfil completo
        </Link>
      </div>

      <p className="mt-6 text-[10px] font-bold text-[#475569] uppercase tracking-[0.2em]">PASALA · pasala.com.ar</p>
    </div>
  );
}
