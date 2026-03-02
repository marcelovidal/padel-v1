import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { setUnlinkedMatchClubAction } from "./actions";
import { SetMatchClubForm } from "@/components/admin/SetMatchClubForm";

type UnlinkedMatchRow = {
  id: string;
  match_at: string;
  club_name: string;
  club_name_raw: string | null;
  created_at: string;
};

type Suggestion = {
  id: string;
  name: string;
  city: string | null;
  region_name: string | null;
  region_code: string | null;
  claimed?: boolean;
  score: number;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminUnlinkedMatchesPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from("matches")
    .select("id,match_at,club_name,club_name_raw,created_at")
    .is("club_id", null)
    .not("club_name_raw", "is", null)
    .order("match_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error("No se pudieron cargar partidos sin club.");
  }

  const matches = (data || []) as UnlinkedMatchRow[];

  const suggestionsByMatch: Record<string, Suggestion[]> = {};
  for (const match of matches) {
    const q = (match.club_name_raw || match.club_name || "").trim();
    if (!q) {
      suggestionsByMatch[match.id] = [];
      continue;
    }
    const { data: suggestions } = await (supabase as any).rpc("club_search", {
      p_query: q,
      p_limit: 5,
    });
    suggestionsByMatch[match.id] = ((suggestions || []) as Suggestion[]).slice(0, 5);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">Admin Match Tooling</p>
          <h1 className="text-3xl font-black tracking-tight text-gray-900">Partidos sin club anclado</h1>
          <p className="text-sm text-gray-600">
            Revisa partidos con <code>club_name_raw</code> y asigna un club canónico.
          </p>
        </div>
        <Link
          href="/admin/matches"
          className="inline-flex rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
        >
          Volver a partidos
        </Link>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-black uppercase tracking-widest text-gray-500">
            Pendientes ({matches.length})
          </h2>
        </div>

        {matches.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-500">No hay partidos pendientes de anclaje.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {matches.map((match) => {
              const suggestions = suggestionsByMatch[match.id] || [];
              return (
                <div key={match.id} className="px-4 py-4 space-y-3">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {new Date(match.match_at).toLocaleString("es-AR")} - raw:{" "}
                      <span className="font-black">{match.club_name_raw || match.club_name}</span>
                    </p>
                    <p className="text-xs text-gray-500">Partido {match.id}</p>
                  </div>

                  {suggestions.length === 0 ? (
                    <p className="text-xs text-amber-700">Sin sugerencias automáticas para este nombre.</p>
                  ) : (
                    <div className="space-y-2">
                      {suggestions.map((club) => (
                        <SetMatchClubForm
                          key={`${match.id}-${club.id}`}
                          action={setUnlinkedMatchClubAction}
                          matchId={match.id}
                          clubId={club.id}
                          clubNameRaw={match.club_name_raw || match.club_name || ""}
                          label={`${club.name}${club.city ? ` - ${club.city}` : ""}${club.region_name ? ` (${club.region_name})` : club.region_code ? ` (${club.region_code})` : ""}`}
                          hint={`score ${club.score}${club.claimed === false ? " - sin reclamar" : ""}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
