import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
// Solo iconos que se renderizan dentro de <Link>. En server components del App
// Router el barrel optimizer no resuelve el forwardRef de lucide-react fuera de
// un <a>, asi que un icono suelto en un <h2> o un <p> no llega a pintarse.
import { Phone, Navigation, CalendarPlus } from "lucide-react";
import { BookingService } from "@/services/booking.service";
import { resolveAvatarSrc } from "@/lib/avatar-server.utils";
import { getSiteUrl } from "@/lib/utils/url";
import { findPublicClub, publicClubHref, type PublicClub } from "@/lib/clubs/publicClub";
import { listPublicClubEvents } from "@/lib/clubs/publicEvent";
import { PublicSectionCard } from "@/components/public/events/PublicSectionCard";
import { PublicClubEventsList } from "@/components/public/events/PublicClubEventsList";

function locationLabel(club: PublicClub) {
  return [club.city, club.region_name].filter(Boolean).join(" · ");
}

/** Inicial para el placeholder cuando el club no cargo logo. */
function clubInitial(name: string) {
  const first = (name || "").trim().charAt(0);
  return first ? first.toUpperCase() : "C";
}

/** href de tel: — se queda con digitos y un + inicial opcional. */
function telHref(phone: string) {
  const cleaned = phone.replace(/[^\d+]/g, "");
  const normalized = cleaned.startsWith("+")
    ? "+" + cleaned.slice(1).replace(/\+/g, "")
    : cleaned.replace(/\+/g, "");
  return `tel:${normalized}`;
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const resolved = await findPublicClub(params.slug);
  if (!resolved) return { title: "Club no encontrado | PASALA" };

  const { club } = resolved;
  const where = locationLabel(club);
  const title = `${club.name} | PASALA`;
  const description = club.description?.trim()
    ? club.description.trim().slice(0, 200)
    : `Perfil de ${club.name}${where ? ` en ${where}` : ""}. Canchas, contacto y reserva de turnos.`;

  // Solo se publica como imagen OG un avatar que sea URL publica estable. Un
  // path del bucket privado se sirve con URL firmada de 600s: WhatsApp cachea
  // el metadata por dias y refetchea tarde, con lo cual el thumbnail quedaria
  // roto de forma permanente. Mejor sin imagen que con una imagen rota.
  const isPublicImage = !!club.avatar_url && /^https?:\/\//i.test(club.avatar_url);

  return {
    title,
    description,
    alternates: { canonical: publicClubHref(club) },
    openGraph: {
      type: "website",
      url: `${getSiteUrl().replace(/\/$/, "")}${publicClubHref(club)}`,
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

export default async function ClubPublicProfilePage({ params }: { params: { slug: string } }) {
  const resolved = await findPublicClub(params.slug);
  if (!resolved) notFound();

  const { club, matchedBy } = resolved;

  // Un link viejo con UUID sigue funcionando, pero manda a la URL canonica.
  if (matchedBy === "id" && club.slug) {
    redirect(publicClubHref(club));
  }

  const bookingService = new BookingService();
  const [courts, avatar, events] = await Promise.all([
    bookingService.listActiveClubCourts(club.id),
    // Resuelve tanto una URL publica del bucket club-logos (rama externa) como
    // un path viejo del bucket privado avatars (rama firmada).
    resolveAvatarSrc({ player: { avatar_url: club.avatar_url, display_name: club.name } }),
    listPublicClubEvents(club.id),
  ]);

  const clubSlugOrId = club.slug || club.id;

  const where = locationLabel(club);
  const phone = club.contact_phone?.trim() || null;
  const mapsUrl = club.maps_url?.trim() || null;
  const bookHref = `${publicClubHref(club)}/book`;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Header */}
      <section className="overflow-hidden rounded-3xl bg-brand-negro text-brand-crema">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:gap-6 sm:p-8">
          {avatar.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar.src}
              alt={club.name}
              className="h-24 w-24 shrink-0 rounded-2xl border border-brand-crema/15 object-cover sm:h-28 sm:w-28"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-brand-crema/15 bg-brand-rojo font-display text-5xl font-black leading-none text-white sm:h-28 sm:w-28 sm:text-6xl"
            >
              {clubInitial(club.name)}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="font-display text-3xl font-black uppercase leading-none tracking-tight sm:text-5xl">
              {club.name}
            </h1>
            {where ? (
              <p className="mt-3 truncate text-sm text-brand-crema/70">{where}</p>
            ) : null}
            {club.address?.trim() ? (
              <p className="mt-1 text-sm text-brand-crema/50">{club.address.trim()}</p>
            ) : null}
          </div>
        </div>

        {/* Acciones de contacto — la barra entera desaparece si no hay ninguna */}
        {phone || mapsUrl ? (
          <div className="flex flex-col gap-2 border-t border-brand-crema/10 px-6 py-4 sm:flex-row sm:px-8">
            {phone ? (
              <Link
                href={telHref(phone)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-crema px-4 py-2.5 text-sm font-black uppercase tracking-wide text-brand-negro transition hover:bg-white"
              >
                <Phone className="h-4 w-4" />
                {phone}
              </Link>
            ) : null}

            {mapsUrl ? (
              <Link
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand-crema/25 px-4 py-2.5 text-sm font-black uppercase tracking-wide text-brand-crema transition hover:bg-brand-crema/10"
              >
                <Navigation className="h-4 w-4" />
                Cómo llegar
              </Link>
            ) : null}
          </div>
        ) : null}
      </section>

      {club.description?.trim() ? (
        <section className="mt-4 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
          <p className="whitespace-pre-line text-sm leading-relaxed text-brand-gris-mid">
            {club.description.trim()}
          </p>
        </section>
      ) : null}

      {/*
        Torneos y ligas. Estas dos secciones usan PublicSectionCard con tokens
        de brand v2, a diferencia del resto de la pagina, que sigue en
        slate/stone. Es deuda conocida: se convierte el sitio publico entero en
        otro bloque, no aca.
      */}
      {events.current.length > 0 ? (
        <div className="mt-4">
          <PublicSectionCard title="Torneos y ligas en juego">
            <PublicClubEventsList
              events={events.current}
              clubSlugOrId={clubSlugOrId}
              emptyLabel="No hay eventos en juego."
            />
          </PublicSectionCard>
        </div>
      ) : null}

      {events.past.length > 0 ? (
        <div className="mt-4">
          <PublicSectionCard title="Ediciones anteriores">
            <PublicClubEventsList
              events={events.past}
              clubSlugOrId={clubSlugOrId}
              emptyLabel="Todavía no hay ediciones terminadas."
            />
          </PublicSectionCard>
        </div>
      ) : null}

      {/* Canchas */}
      <section className="mt-4 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
        <h2 className="font-display text-xl font-black uppercase tracking-tight text-brand-negro">
          Canchas
        </h2>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-brand-gris-100 px-3 py-1 text-xs font-bold text-brand-gris-mid">
            {club.courts_count ?? 0} en total
          </span>
          <span className="rounded-full bg-brand-azul-50 px-3 py-1 text-xs font-bold text-brand-azul">
            {courts.length} para reservar
          </span>
          {club.has_glass ? (
            <span className="rounded-full bg-brand-gris-100 px-3 py-1 text-xs font-bold text-brand-gris-mid">
              Blindex
            </span>
          ) : null}
          {club.has_synthetic_grass ? (
            <span className="rounded-full bg-brand-gris-100 px-3 py-1 text-xs font-bold text-brand-gris-mid">
              Césped sintético
            </span>
          ) : null}
        </div>

        {courts.length > 0 ? (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {courts.map((court) => (
              <li
                key={court.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 px-3 py-2.5"
              >
                <span className="truncate text-sm font-bold text-brand-negro">{court.name}</span>
                {court.surface_type ? (
                  <span className="shrink-0 text-xs text-brand-gris-mid">{court.surface_type}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-brand-gris-mid">
            Este club todavía no publicó canchas para reservar online.
          </p>
        )}
      </section>

      {/* Reserva */}
      <section className="mt-4 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
        <h2 className="font-display text-xl font-black uppercase tracking-tight text-brand-negro">
          Reserva de cancha
        </h2>
        <p className="mt-2 text-sm text-brand-gris-mid">
          Solicitá una reserva y esperá la confirmación del club. Después vas a poder crear el partido
          desde la reserva confirmada.
        </p>
        <Link
          href={bookHref}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-rojo px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-brand-rojo-dark"
        >
          <CalendarPlus className="h-4 w-4" />
          Reservar cancha
        </Link>
      </section>
    </div>
  );
}
