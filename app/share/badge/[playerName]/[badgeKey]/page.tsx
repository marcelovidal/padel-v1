import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://pasala.com.ar";

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

export async function generateMetadata({ params }: { params: { playerName: string; badgeKey: string } }): Promise<Metadata> {
  const playerName = decodeURIComponent(params.playerName);
  const badgeKey = decodeURIComponent(params.badgeKey);
  const badge = BADGE_CATALOGUE[badgeKey];
  const title = badge ? `${badge.title} — ${playerName} | PASALA` : `Logro desbloqueado — ${playerName} | PASALA`;
  const ogImage = `${SITE_URL}/api/og/badge?badgeKey=${encodeURIComponent(badgeKey)}&playerName=${encodeURIComponent(playerName)}`;
  const pageUrl = `${SITE_URL}/share/badge/${params.playerName}/${params.badgeKey}`;
  return {
    title,
    openGraph: {
      type: "website",
      url: pageUrl,
      title,
      description: badge?.description ?? "Nuevo logro conseguido en PASALA.",
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, images: [ogImage] },
  };
}

export default async function ShareBadgePage({ params }: { params: { playerName: string; badgeKey: string } }) {
  const playerName = decodeURIComponent(params.playerName);
  const badgeKey = decodeURIComponent(params.badgeKey);
  const badge = BADGE_CATALOGUE[badgeKey] ?? { icon: "🏅", title: "Logro desbloqueado", description: "Nuevo logro conseguido en PASALA." };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center px-4 py-8">
      {/* Header */}
      <div className="mb-6 text-center">
        <span className="text-2xl font-black text-[#2563EB] tracking-tighter uppercase italic">PASALA</span>
        <p className="text-[10px] font-bold text-[#475569] uppercase tracking-widest mt-0.5">Logro Desbloqueado</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-xs bg-white rounded-3xl shadow-lg border border-[#E2E8F0] p-8 text-center">
        {/* Badge icon */}
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 border-2 border-amber-200 text-4xl">
          {badge.icon}
        </div>

        {/* Label */}
        <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-2">Logro desbloqueado</p>

        {/* Badge title */}
        <h2 className="text-2xl font-black text-[#0F172A] mb-2">{badge.title}</h2>

        {/* Description */}
        <p className="text-sm text-[#475569] mb-5">{badge.description}</p>

        {/* Player name */}
        <div className="pt-4 border-t border-[#E2E8F0]">
          <p className="text-sm font-bold text-[#0F172A]">{playerName}</p>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-6 w-full max-w-xs">
        <Link
          href={`${SITE_URL}/welcome`}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2563EB] py-3.5 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors"
        >
          Entrar a PASALA
        </Link>
      </div>

      <p className="mt-6 text-[10px] font-bold text-[#475569] uppercase tracking-[0.2em]">PASALA · pasala.com.ar</p>
    </div>
  );
}
