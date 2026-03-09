import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LeaguesService } from "@/services/leagues.service";

function divisionModeLabel(mode: "OPEN" | "SINGLE" | "SUM") {
  if (mode === "OPEN") return "Abierta";
  if (mode === "SINGLE") return "Categoria unica";
  return "Suma";
}

export default async function ClubPublicLeaguesPage({
  params,
}: {
  params: { clubId: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/player/login");
  }

  const { data: club } = await (supabase as any)
    .from("clubs")
    .select("id,name,deleted_at,archived_at,merged_into")
    .eq("id", params.clubId)
    .maybeSingle();

  if (!club || club.deleted_at || club.archived_at || club.merged_into) {
    return notFound();
  }

  const service = new LeaguesService();
  const leagues = await service.listPublicClubLeagues(params.clubId);

  const leaguesData = await Promise.all(
    leagues.map(async (league) => {
      const divisions = await service.listDivisions(league.id);
      const divisionsData = await Promise.all(
        divisions.map(async (d) => {
          const groups = await service.listGroups(d.id);
          const groupsData = await Promise.all(
            groups.map(async (g) => ({
              group: g,
              table: await service.getGroupTable(g.id),
            }))
          );
          return { division: d, groupsData };
        })
      );
      return { league, divisionsData };
    })
  );

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold">Ligas activas · {club.name}</h1>
        <p className="text-sm text-gray-500">Vista para jugadores autenticados (solo lectura).</p>
      </div>

      {leaguesData.length === 0 ? (
        <section className="rounded-2xl border bg-white p-4 text-sm text-gray-500">
          Este club no tiene ligas activas.
        </section>
      ) : (
        leaguesData.map(({ league, divisionsData }) => (
          <section key={league.id} className="rounded-2xl border bg-white p-4 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{league.name}</h2>
              <p className="text-sm text-gray-500">{league.season_label || "Temporada sin etiqueta"}</p>
            </div>

            {divisionsData.map(({ division, groupsData }) => (
              <div key={division.id} className="rounded-xl border border-gray-100 p-3 space-y-3">
                <p className="font-semibold text-gray-900">
                  {division.name} · {divisionModeLabel(division.category_mode)}
                  {division.category_value_int ? ` ${division.category_value_int}` : ""}
                </p>

                <div className="grid gap-3 md:grid-cols-2">
                  {groupsData.map(({ group, table }) => (
                    <div key={group.id} className="rounded-lg border border-gray-100 p-3">
                      <p className="text-sm font-bold text-gray-900">Grupo {group.name}</p>
                      {table.length === 0 ? (
                        <p className="mt-2 text-xs text-gray-500">Sin resultados cargados.</p>
                      ) : (
                        <table className="mt-2 min-w-full text-xs">
                          <thead>
                            <tr className="text-left text-gray-500">
                              <th className="py-1 pr-2">#</th>
                              <th className="py-1 pr-2">Pts</th>
                              <th className="py-1 pr-2">PJ</th>
                              <th className="py-1 pr-2">G</th>
                              <th className="py-1 pr-2">P</th>
                            </tr>
                          </thead>
                          <tbody>
                            {table.map((row, idx) => (
                              <tr key={row.team_id} className="border-t border-gray-100">
                                <td className="py-1 pr-2">{idx + 1}</td>
                                <td className="py-1 pr-2 font-bold">{row.points}</td>
                                <td className="py-1 pr-2">{row.played}</td>
                                <td className="py-1 pr-2">{row.wins}</td>
                                <td className="py-1 pr-2">{row.losses}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        ))
      )}

      <div>
        <Link href="/player/profile" className="text-sm font-semibold text-blue-700 hover:underline">
          Volver a mi perfil
        </Link>
      </div>
    </div>
  );
}

