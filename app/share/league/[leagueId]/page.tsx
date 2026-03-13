import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { buildOgLeagueUrl } from "@/lib/share/shareMessage";
import Link from "next/link";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://pasala.com.ar";

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function generateMetadata({ params }: { params: { leagueId: string } }): Promise<Metadata> {
  const sb = supabaseAdmin();
  const { data: league } = await (sb.from("club_leagues").select("name, clubs(name)").eq("id", params.leagueId).maybeSingle() as any);
  const leagueName = (league as any)?.name ?? "Liga";
  const ogImage = `${SITE_URL}/api/og/league?leagueId=${encodeURIComponent(params.leagueId)}`;
  const pageUrl = `${SITE_URL}/share/league/${params.leagueId}`;
  return {
    title: `${leagueName} | PASALA`,
    openGraph: {
      type: "website",
      url: pageUrl,
      title: `${leagueName} | PASALA`,
      description: `Tabla de posiciones de ${leagueName} en PASALA.`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: leagueName }],
    },
    twitter: { card: "summary_large_image", title: `${leagueName} | PASALA`, images: [ogImage] },
  };
}

export default async function ShareLeaguePage({ params }: { params: { leagueId: string } }) {
  const sb = supabaseAdmin();

  const { data: league } = await (sb
    .from("club_leagues")
    .select("id, name, season_label, clubs(name), league_divisions(id, name, league_groups(id, name, league_teams(id, player_id_a, player_id_b, wins, losses, draws, points)))")
    .eq("id", params.leagueId)
    .maybeSingle() as any);

  if (!league) notFound();

  const clubName = (league as any).clubs?.name ?? "";
  const leagueName = (league as any).name ?? "Liga";
  const seasonLabel = (league as any).season_label ?? "";

  const division = (league as any).league_divisions?.[0];
  const group = division?.league_groups?.[0];
  const teams: any[] = group?.league_teams ?? [];
  const sorted = [...teams].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));

  const playerIds = sorted.flatMap((t: any) => [t.player_id_a, t.player_id_b].filter(Boolean));
  const { data: players } = await (sb.from("players").select("id, display_name, first_name, last_name").in("id", playerIds) as any);
  const playerMap = new Map((players ?? []).map((p: any) => [p.id, p.display_name || `${p.first_name} ${p.last_name?.charAt(0)}.`]));
  const teamName = (t: any) => [playerMap.get(t.player_id_a), playerMap.get(t.player_id_b)].filter(Boolean).join(" / ") || "—";

  const today = new Date().toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center px-4 py-8">
      {/* Header */}
      <div className="mb-6 text-center">
        <span className="text-2xl font-black text-[#2563EB] tracking-tighter uppercase italic">PASALA</span>
        <p className="text-[10px] font-bold text-[#475569] uppercase tracking-widest mt-0.5">Tabla de Liga</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-lg border border-[#E2E8F0] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E2E8F0]">
          <h2 className="text-base font-black text-[#0F172A]">
            {leagueName}{seasonLabel ? ` · ${seasonLabel}` : ""}
          </h2>
          <p className="text-[10px] text-[#475569]">{clubName} · {today}</p>
        </div>

        {sorted.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-[#475569]">Sin datos de tabla aún.</div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-2 px-5 py-2 bg-[#F8FAFC] text-[9px] font-black uppercase tracking-widest text-[#475569]">
              <span className="w-5">#</span>
              <span>Dupla</span>
              <span className="w-7 text-center">PJ</span>
              <span className="w-7 text-center text-emerald-600">G</span>
              <span className="w-7 text-center text-red-500">P</span>
              <span className="w-8 text-right text-[#2563EB]">PTS</span>
            </div>
            <div className="divide-y divide-[#E2E8F0]">
              {sorted.map((t: any, i: number) => {
                const pj = (t.wins ?? 0) + (t.losses ?? 0) + (t.draws ?? 0);
                return (
                  <div key={t.id ?? i} className={`grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-2 items-center px-5 py-3 ${i === 0 ? "bg-blue-50/40" : ""}`}>
                    <span className={`text-xs font-black w-5 ${i === 0 ? "text-[#2563EB]" : "text-[#475569]"}`}>{i + 1}</span>
                    <span className="text-sm font-semibold text-[#0F172A] truncate">{teamName(t)}</span>
                    <span className="text-xs text-[#475569] w-7 text-center">{pj}</span>
                    <span className="text-xs font-bold text-emerald-600 w-7 text-center">{t.wins ?? 0}</span>
                    <span className="text-xs font-bold text-red-500 w-7 text-center">{t.losses ?? 0}</span>
                    <span className="text-sm font-black text-[#2563EB] w-8 text-right">{t.points ?? 0}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* CTA */}
      <div className="mt-6 w-full max-w-sm">
        <Link
          href={`${SITE_URL}/player`}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2563EB] py-3.5 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors"
        >
          Ver liga en PASALA
        </Link>
      </div>

      <p className="mt-6 text-[10px] font-bold text-[#475569] uppercase tracking-[0.2em]">PASALA · pasala.com.ar</p>
    </div>
  );
}
