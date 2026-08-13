import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { resolveAvatarSrc } from "@/lib/avatar-server.utils";
import { getSiteUrl } from "@/lib/utils/url";
import { findPublicClub, publicClubHref } from "@/lib/clubs/publicClub";
import { findPublicTournament, publicTournamentHref } from "@/lib/clubs/publicEvent";
import {
  categoryLabel,
  clubInitials,
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
 * Detalle publico de un torneo. Sin sesion.
 *
 * Se sirve con admin client filtrando a `status <> 'draft'` — ver
 * lib/clubs/publicEvent.ts para por que, y para la proyeccion: de `players` se
 * leen solo id, display_name y category. Ni telefonos ni emails.
 */

type Params = { slug: string; id: string };

async function load(params: Params) {
  const resolved = await findPublicClub(params.slug);
  if (!resolved) return null;

  const data = await findPublicTournament(resolved.club.id, params.id);
  if (!data) return null;

  return { ...resolved, ...data };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const loaded = await load(params);
  if (!loaded) return { title: "Torneo no encontrado | PASALA" };

  const { club, tournament } = loaded;
  const when = formatDateRange(tournament.start_date, tournament.end_date);
  const title = `${tournament.name} | ${club.name}`;
  const description =
    tournament.description?.trim() ||
    `Posiciones, fixture y resultados del torneo ${tournament.name} en ${club.name}.${
      when ? ` ${when}.` : ""
    }`;

  const canonical = publicTournamentHref(club.slug || club.id, tournament.id);

  // Misma regla que el perfil del club: solo se publica como imagen OG un
  // avatar con URL publica estable. Un path del bucket privado se sirve
  // firmado a 600s y WhatsApp cachea por dias — el thumbnail quedaria roto.
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

export default async function PublicTournamentPage({ params }: { params: Params }) {
  const loaded = await load(params);
  if (!loaded) notFound();

  const { club, matchedBy, tournament, groups, teams, playoffMatches, playersMap } = loaded;

  // Un link viejo con UUID sigue funcionando, pero manda a la URL canonica.
  if (matchedBy === "id" && club.slug) {
    redirect(publicTournamentHref(club.slug, tournament.id));
  }

  const avatar = await resolveAvatarSrc({
    player: { avatar_url: club.avatar_url, display_name: club.name },
  });

  const teamLabel = makeTeamLabeller(teams, playersMap);
  const when = formatDateRange(tournament.start_date, tournament.end_date);

  // Sin la columna —migracion 20260819 sin aplicar— se comporta como antes.
  const registrationsOpen = tournament.registrations_open ?? true;

  const chips: EventChip[] = [];
  if (tournament.status === "active") {
    chips.push({ label: "En juego", tone: "success" });
  } else {
    chips.push({ label: "Finalizado", tone: "neutral" });
  }
  // Un evento puede estar en juego Y recibiendo inscripciones: son dos chips,
  // no una sola categoria.
  if (registrationsOpen) chips.push({ label: "Inscripciones abiertas", tone: "accent" });
  const category = categoryLabel(tournament.target_category_int);
  if (category) {
    chips.push({
      label: tournament.allow_lower_category ? `${category} (acepta menores)` : category,
      tone: "accent",
    });
  }
  if (tournament.season_label) chips.push({ label: tournament.season_label });
  chips.push({ label: `${teams.length} pareja${teams.length === 1 ? "" : "s"}` });

  const hasFixture = groups.some((g) => g.matches.length > 0);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-8 sm:px-6 sm:py-10">
      <PublicEventHeader
        eyebrow="Torneo"
        title={tournament.name}
        clubName={club.name}
        clubHref={publicClubHref(club)}
        clubAvatarSrc={avatar.src || null}
        clubInitials={clubInitials(club.name)}
        meta={when}
        description={tournament.description}
        chips={chips}
      />

      {/*
        Lo que decide es registrations_open, no el status: un torneo activo
        puede tener el fixture andando y las inscripciones cerradas, y uno
        finalizado por error puede seguir abierto. Un 'draft' no llega hasta
        aca: la consulta lo filtra antes.
      */}
      <PublicRegistrationSection
        kind="tournament"
        eventId={tournament.id}
        eventName={tournament.name}
        registrationsOpen={registrationsOpen}
        registrationStartDate={tournament.registration_start_date}
        registrationEndDate={tournament.registration_end_date}
      />

      {groups.length === 0 ? (
        <PublicSectionCard title="Grupos">
          <p className="text-sm text-[var(--text-muted)]">
            Los grupos todavía no fueron armados. Cuando el club los publique, las posiciones y
            el fixture aparecen acá.
          </p>
        </PublicSectionCard>
      ) : (
        groups.map((group) => (
          <PublicSectionCard
            key={group.id}
            id={`grupo-${group.id}`}
            title={`Grupo ${group.name}`}
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

      {playoffMatches.length > 0 ? (
        <PublicSectionCard id="playoffs" title="Playoffs">
          {/*
            TournamentBracketView se reutiliza tal cual: ya es RSC y ya es de
            solo lectura, no trae ningun formulario adentro. Su paleta es la
            vieja (gray/slate hardcodeados) — deuda conocida que NO se arregla
            en este bloque, y reescribirlo seria una tercera implementacion de
            bracket.
          */}
          <TournamentBracketView
            playoffMatches={playoffMatches}
            teams={teams}
            playersMap={playersMap}
          />
        </PublicSectionCard>
      ) : hasFixture ? (
        <PublicSectionCard title="Playoffs">
          <p className="text-sm text-[var(--text-muted)]">
            Los playoffs se arman cuando termine la fase de grupos.
          </p>
        </PublicSectionCard>
      ) : null}
    </div>
  );
}
