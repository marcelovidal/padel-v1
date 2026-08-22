import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { resolveAvatarSrc } from "@/lib/avatar-server.utils";
import { getSiteUrl } from "@/lib/utils/url";
import { findPublicClub, publicClubHref } from "@/lib/clubs/publicClub";
import { findPublicLeague, publicLeagueHref } from "@/lib/clubs/publicEvent";
import {
  clubInitials,
  divisionModeLabel,
  formatDateRange,
  makeTeamLabeller,
} from "@/lib/clubs/publicEventLabels";
import { PublicEventHeader, type EventChip } from "@/components/public/events/PublicEventHeader";
import { PublicSectionCard } from "@/components/public/events/PublicSectionCard";
import { EventStandingsTable } from "@/components/public/events/EventStandingsTable";
import { EventFixtureList } from "@/components/public/events/EventFixtureList";
import { PublicRegistrationSection } from "@/components/public/events/PublicRegistrationSection";
import { TournamentBracketView } from "@/components/club/TournamentBracketView";

/**
 * Detalle publico de una liga. Sin sesion.
 *
 * Ojo con la ruta hermana: `/clubs/[slug]/ligas` (el listado) mantiene su gate
 * de sesion y redirige a login. Esta pagina, la del detalle, es publica. No es
 * una inconsistencia que se arregle aca: abrir el listado al publico anonimo es
 * un cambio de alcance aparte.
 */

type Params = { slug: string; id: string };

async function load(params: Params) {
  const resolved = await findPublicClub(params.slug);
  if (!resolved) return null;

  const data = await findPublicLeague(resolved.club.id, params.id);
  if (!data) return null;

  return { ...resolved, ...data };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const loaded = await load(params);
  if (!loaded) return { title: "Liga no encontrada | PASALA" };

  const { club, league } = loaded;
  const when = formatDateRange(league.start_date, league.end_date);
  const title = `${league.name} | ${club.name}`;
  const description =
    league.description?.trim() ||
    `Tabla de posiciones, fixture y resultados de ${league.name} en ${club.name}.${
      when ? ` ${when}.` : ""
    }`;

  const canonical = publicLeagueHref(club.slug || club.id, league.id);
  const isPublicImage = !!club.avatar_url && /^https?:\/\//i.test(club.avatar_url);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: `${getSiteUrl().replace(/\/$/, "")}${canonical}`,
      title,
      description,
      ...(isPublicImage ? { images: [{ url: club.avatar_url as string, alt: club.name }] } : {}),
    },
    twitter: {
      card: isPublicImage ? "summary_large_image" : "summary",
      title,
      description,
      ...(isPublicImage ? { images: [club.avatar_url as string] } : {}),
    },
  };
}

export default async function PublicLeaguePage({ params }: { params: Params }) {
  const loaded = await load(params);
  if (!loaded) notFound();

  const { club, matchedBy, league, divisions, teams, playersMap } = loaded;

  if (matchedBy === "id" && club.slug) {
    redirect(publicLeagueHref(club.slug, league.id));
  }

  const avatar = await resolveAvatarSrc({
    player: { avatar_url: club.avatar_url, display_name: club.name },
  });

  const teamLabel = makeTeamLabeller(teams, playersMap);
  const when = formatDateRange(league.start_date, league.end_date);

  // Sin la columna —migracion 20260819 sin aplicar— se comporta como antes.
  const registrationsOpen = league.registrations_open ?? true;

  const chips: EventChip[] = [];
  // La inscripcion es lo accionable: si esta abierta, el chip va primero y en
  // rojo. Solo para eventos activos — un finished con el flag en true no puede
  // seguir anunciando inscripciones.
  if (league.status === "active" && registrationsOpen) {
    chips.push({ label: "Inscripciones abiertas", tone: "cta" });
  }
  chips.push(
    league.status === "active"
      ? { label: "En juego", tone: "success" }
      : { label: "Finalizada", tone: "neutral" }
  );
  if (league.season_label) chips.push({ label: league.season_label });
  chips.push({ label: `${teams.length} pareja${teams.length === 1 ? "" : "s"}` });

  // Con una sola division el encabezado por division es ruido: la liga ES la
  // division. Con varias hace falta para saber que tabla se esta mirando.
  const showDivisionNames = divisions.length > 1;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-8 sm:px-6 sm:py-10">
      <PublicEventHeader
        eyebrow="Liga"
        title={league.name}
        clubName={club.name}
        clubHref={publicClubHref(club)}
        clubAvatarSrc={avatar.src || null}
        clubInitials={clubInitials(club.name)}
        meta={when}
        description={league.description}
        chips={chips}
      />

      <PublicRegistrationSection
        kind="league"
        eventId={league.id}
        eventName={league.name}
        registrationsOpen={registrationsOpen}
        registrationStartDate={league.registration_start_date}
        registrationEndDate={league.registration_end_date}
      />

      {divisions.length === 0 ? (
        <PublicSectionCard title="Posiciones">
          <p className="text-sm text-[var(--text-muted)]">
            La liga todavía no tiene divisiones publicadas. Cuando el club las arme, las
            posiciones y el fixture aparecen acá.
          </p>
        </PublicSectionCard>
      ) : (
        divisions.map((division) => {
          const mode = divisionModeLabel(division.category_mode, division.category_value_int);

          return (
            <div key={division.id} className="space-y-4">
              {division.groups.length === 0 ? (
                <PublicSectionCard
                  title={showDivisionNames ? division.name : "Posiciones"}
                  subtitle={mode ?? undefined}
                >
                  <p className="text-sm text-[var(--text-muted)]">
                    Los grupos de esta división todavía no fueron armados.
                  </p>
                </PublicSectionCard>
              ) : (
                division.groups.map((group) => (
                  <PublicSectionCard
                    key={group.id}
                    id={`grupo-${group.id}`}
                    title={
                      showDivisionNames
                        ? `${division.name} · Grupo ${group.name}`
                        : `Grupo ${group.name}`
                    }
                    subtitle={mode ?? undefined}
                    aside={
                      group.matches.length > 0 ? (
                        <span className="rounded-full bg-[var(--bg-pill-soft)] px-3 py-1 text-xs font-bold text-[var(--text-muted)]">
                          {group.matches.length} partido{group.matches.length === 1 ? "" : "s"}
                        </span>
                      ) : null
                    }
                  >
                    <EventStandingsTable rows={group.table} teamLabel={teamLabel} />

                    {group.matches.length > 0 ? (
                      <div className="mt-6 border-t border-[var(--border-soft)] pt-5">
                        <EventFixtureList matches={group.matches} teamLabel={teamLabel} />
                      </div>
                    ) : null}
                  </PublicSectionCard>
                ))
              )}

              {division.playoffMatches.length > 0 ? (
                <PublicSectionCard
                  id={`playoffs-${division.id}`}
                  title={showDivisionNames ? `${division.name} · Playoffs` : "Playoffs"}
                >
                  {/*
                    Mismo componente que el torneo: league_playoff_matches tiene
                    la misma forma que tournament_playoff_matches (stage,
                    match_order, matches) y league_teams tiene player_id_a/b, asi
                    que el bracket sirve para los dos sin tocarlo.
                  */}
                  <TournamentBracketView
                    playoffMatches={division.playoffMatches}
                    teams={teams}
                    playersMap={playersMap}
                    vocabulary="public"
                  />
                </PublicSectionCard>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
}
