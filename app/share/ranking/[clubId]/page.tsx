import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { getSiteUrl } from "@/lib/utils/url";
import { buildOgClubRankingUrl, buildShareRankingUrl } from "@/lib/share/shareMessage";
import Link from "next/link";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://pasala.com.ar";
const MEDALS = ["🥇", "🥈", "🥉", "4°", "5°", "6°", "7°", "8°", "9°", "10°"];

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function generateMetadata({ params }: { params: { clubId: string } }): Promise<Metadata> {
  const sb = supabaseAdmin();
  const { data: club } = await (sb.from("clubs").select("name").eq("id", params.clubId).maybeSingle() as any);
  const clubName = (club as any)?.name ?? "Club";
  const ogImage = `${SITE_URL}/api/og/club-ranking?clubId=${encodeURIComponent(params.clubId)}&name=${encodeURIComponent(clubName)}`;
  const pageUrl = `${SITE_URL}/share/ranking/${params.clubId}`;
  return {
    title: `Ranking ${clubName} | PASALA`,
    openGraph: {
      type: "website",
      url: pageUrl,
      title: `Ranking ${clubName} | PASALA`,
      description: `Ranking de jugadores de ${clubName} en PASALA.`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: `Ranking ${clubName}` }],
    },
    twitter: { card: "summary_large_image", title: `Ranking ${clubName} | PASALA`, images: [ogImage] },
  };
}

export default async function ShareRankingPage({ params }: { params: { clubId: string } }) {
  const sb = supabaseAdmin();

  const { data: club } = await (sb.from("clubs").select("id, name").eq("id", params.clubId).maybeSingle() as any);
  if (!club) notFound();

  const clubName = (club as any).name;
  const { data: ranking } = await sb.rpc("get_club_ranking", { p_club_id: params.clubId, p_limit: 10, p_offset: 0 }).select("*");
  const rows: any[] = ranking ?? [];

  const today = new Date().toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center px-4 py-8">
      {/* Header */}
      <div className="mb-6 text-center">
        <span className="text-2xl font-black text-[#2563EB] tracking-tighter uppercase italic">PASALA</span>
        <p className="text-[10px] font-bold text-[#475569] uppercase tracking-widest mt-0.5">Ranking del Club</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-lg border border-[#E2E8F0] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-[#0F172A]">{clubName}</h2>
            <p className="text-[10px] text-[#475569]">Actualizado: {today}</p>
          </div>
          <span className="text-lg">🏆</span>
        </div>

        {rows.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-[#475569]">Sin datos de ranking aún.</div>
        ) : (
          <div className="divide-y divide-[#E2E8F0]">
            {rows.slice(0, 10).map((row: any, i: number) => (
              <div key={row.player_id ?? i} className={`flex items-center gap-3 px-5 py-3 ${i === 0 ? "bg-amber-50/60" : ""}`}>
                <span className="text-base w-6 text-center shrink-0">{i < 3 ? MEDALS[i] : `${i + 1}°`}</span>
                <span className="flex-1 text-sm font-semibold text-[#0F172A] truncate">{row.display_name ?? "—"}</span>
                {row.category && (
                  <span className="text-[10px] font-bold text-[#475569] shrink-0">{row.category}ª</span>
                )}
                <span className="text-sm font-black text-[#2563EB] w-10 text-right shrink-0">{row.points}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="mt-6 w-full max-w-sm">
        <Link
          href={`${SITE_URL}/player`}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2563EB] py-3.5 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors"
        >
          Entrar a PASALA
        </Link>
      </div>

      <p className="mt-6 text-[10px] font-bold text-[#475569] uppercase tracking-[0.2em]">PASALA · pasala.com.ar</p>
    </div>
  );
}
