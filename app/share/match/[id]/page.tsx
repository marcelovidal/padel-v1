import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MatchService } from "@/services/match.service";
import { getSiteUrl } from "@/lib/utils/url";
import { buildOgMatchUrl, buildShareMatchUrl } from "@/lib/share/shareMessage";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://pasala.com.ar";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const ogImage = `${SITE_URL}/api/og/match?id=${encodeURIComponent(params.id)}`;
  const pageUrl = `${SITE_URL}/share/match/${params.id}`;
  return {
    title: "Resultado de partido | PASALA",
    openGraph: {
      type: "website",
      url: pageUrl,
      title: "Resultado de partido | PASALA",
      description: "Mirá el resultado completo de este partido en PASALA.",
      images: [{ url: ogImage, width: 1200, height: 630, alt: "Resultado de partido PASALA" }],
    },
    twitter: { card: "summary_large_image", title: "Resultado de partido | PASALA", images: [ogImage] },
  };
}

function shortName(full: string) {
  const parts = (full || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Jugador";
  if (parts.length === 1) return parts[0];
  return `${parts[0].charAt(0)}. ${parts.slice(1).join(" ")}`;
}

export default async function ShareMatchPage({ params }: { params: { id: string } }) {
  const matchSvc = new MatchService();
  const match = await matchSvc.getPublicMatchData(params.id);
  if (!match) notFound();

  const siteUrl = getSiteUrl();
  const publicMatchUrl = `${siteUrl}/m/${params.id}`;

  const teamA = match.roster.filter((p: any) => p.team === "A");
  const teamB = match.roster.filter((p: any) => p.team === "B");
  const result: any = match.results;
  const sets = (result?.sets || []) as any[];
  const winnerTeam = (result?.winner_team || result?.winnerTeam || null) as "A" | "B" | null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center px-4 py-8">
      {/* Header */}
      <div className="mb-6 text-center">
        <span className="text-2xl font-black text-[#2563EB] tracking-tighter uppercase italic">PASALA</span>
        <p className="text-[10px] font-bold text-[#475569] uppercase tracking-widest mt-0.5">Resultado de Partido</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-lg border border-[#E2E8F0] overflow-hidden">
        {/* Match date + club */}
        {(match.match_at || match.club_name) && (
          <div className="px-5 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
            {match.match_at && (
              <span className="text-[11px] font-semibold text-[#475569]">
                {format(new Date(match.match_at), "d MMM yyyy", { locale: es })}
              </span>
            )}
            {match.club_name && (
              <span className="text-[11px] font-semibold text-[#475569] truncate ml-2">{match.club_name}</span>
            )}
          </div>
        )}

        {/* Scoreboard */}
        <div className="p-5">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left text-[10px] font-black uppercase tracking-widest text-[#475569] pb-2 w-1/2">Equipo</th>
                {sets.map((_: any, idx: number) => (
                  <th key={idx} className="text-center text-[10px] font-black uppercase tracking-widest text-[#475569] pb-2 px-1">
                    S{idx + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {/* Team A */}
              <tr className={winnerTeam === "A" ? "bg-blue-50/40" : ""}>
                <td className="py-3 pr-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#2563EB]">Equipo A</span>
                    {teamA.map((p: any, i: number) => (
                      <span key={i} className="text-sm font-semibold text-[#0F172A]">{shortName(p.name)}</span>
                    ))}
                  </div>
                </td>
                {sets.map((s: any, idx: number) => (
                  <td key={idx} className={`text-center text-lg px-1 ${winnerTeam === "A" ? "text-[#2563EB] font-black" : "text-[#475569]"}`}>
                    {s.a ?? "-"}
                  </td>
                ))}
              </tr>
              {/* Team B */}
              <tr className={winnerTeam === "B" ? "bg-blue-50/40" : ""}>
                <td className="py-3 pr-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-red-500">Equipo B</span>
                    {teamB.map((p: any, i: number) => (
                      <span key={i} className="text-sm font-semibold text-[#0F172A]">{shortName(p.name)}</span>
                    ))}
                  </div>
                </td>
                {sets.map((s: any, idx: number) => (
                  <td key={idx} className={`text-center text-lg px-1 ${winnerTeam === "B" ? "text-[#2563EB] font-black" : "text-[#475569]"}`}>
                    {s.b ?? "-"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>

          {/* Winner badge */}
          {winnerTeam && (
            <div className="mt-4 text-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2563EB] text-white text-[11px] font-black uppercase tracking-widest">
                🏆 Ganador: Equipo {winnerTeam}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-6 w-full max-w-sm">
        <Link
          href={publicMatchUrl}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2563EB] py-3.5 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors"
        >
          Ver en PASALA
        </Link>
      </div>

      <p className="mt-6 text-[10px] font-bold text-[#475569] uppercase tracking-[0.2em]">PASALA · pasala.com.ar</p>
    </div>
  );
}
