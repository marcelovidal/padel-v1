import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
// Solo iconos que se renderizan dentro de <Link>. En server components del App
// Router el barrel optimizer no resuelve el forwardRef de lucide-react fuera de
// un <a>, asi que un icono suelto en un <h2> o un <p> no llega a pintarse.
import { Phone, Navigation, ChevronLeft, ChevronRight } from "lucide-react";
import { BookingService } from "@/services/booking.service";
import { resolveAvatarSrc } from "@/lib/avatar-server.utils";
import { getSiteUrl } from "@/lib/utils/url";
import { findPublicClub, publicClubHref, type PublicClub } from "@/lib/clubs/publicClub";
import { listPublicClubEvents } from "@/lib/clubs/publicEvent";
import { computeClubAvailability } from "@/lib/bookings/availability";
import { PublicSectionCard } from "@/components/public/events/PublicSectionCard";
import { PublicClubEventsList } from "@/components/public/events/PublicClubEventsList";
import { TimeSlotPicker } from "@/components/bookings/TimeSlotPicker";

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

export default async function ClubPublicProfilePage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { book_date?: string };
}) {
  const resolved = await findPublicClub(params.slug);
  if (!resolved) notFound();

  const { club, matchedBy } = resolved;

  // Un link viejo con UUID sigue funcionando, pero manda a la URL canonica.
  if (matchedBy === "id" && club.slug) {
    redirect(publicClubHref(club));
  }

  const today = new Date().toISOString().slice(0, 10);
  const bookDate =
    searchParams?.book_date && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.book_date)
      ? searchParams.book_date
      : today;

  const bookingService = new BookingService();
  const [courts, avatar, events, availability] = await Promise.all([
    // Unica lectura de la pagina que NO usa admin client: club_courts se lee
    // con el cliente de sesion y el filtro `active = true` vive en la policy
    // "club_courts_select_active_anon" (20260818_public_club_read_anon.sql).
    bookingService.listActiveClubCourts(club.id),
    // Resuelve tanto una URL publica del bucket club-logos (rama externa) como
    // un path viejo del bucket privado avatars (rama firmada).
    resolveAvatarSrc({ player: { avatar_url: club.avatar_url, display_name: club.name } }),
    listPublicClubEvents(club.id),
    // Disponibilidad del dia para el selector de horario embebido.
    computeClubAvailability({ bookingService, clubId: club.id, date: bookDate }),
  ]);

  const clubSlugOrId = club.slug || club.id;
  const profileHref = publicClubHref(club);

  const where = locationLabel(club);
  const phone = club.contact_phone?.trim() || null;
  const mapsUrl = club.maps_url?.trim() || null;
  const bookHref = `${profileHref}/book`;

  // Navegacion de dia para la seccion de disponibilidad.
  const bookDateObj = new Date(`${bookDate}T00:00:00`);
  const prevDate = new Date(bookDateObj);
  prevDate.setDate(prevDate.getDate() - 1);
  const nextDate = new Date(bookDateObj);
  nextDate.setDate(nextDate.getDate() + 1);
  const prevDateStr = prevDate.toISOString().slice(0, 10);
  const nextDateStr = nextDate.toISOString().slice(0, 10);
  const canGoPrev = prevDateStr >= today;

  function formatBookDate(dateStr: string): string {
    if (dateStr === today) return "Hoy";
    const tomorrow = new Date(today + "T00:00:00");
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dateStr === tomorrow.toISOString().slice(0, 10)) return "Mañana";
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
  }

  // href de una franja en la seccion de disponibilidad: va directo a /book
  // con fecha + horario + cancha preseleccionados. El jugador llega al form
  // sin tener que elegir nada mas.
  const buildBookSlotHref = ({ time, courtId }: { time: string; courtId: string }) =>
    `${bookHref}?date=${bookDate}&time=${time}&court_id=${courtId}&cursor=${bookDate}`;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10 space-y-4">
      {/* 1. Header */}
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

            {/* Chips de infraestructura — antes en la seccion Canchas */}
            {(club.courts_count || club.has_glass || club.has_synthetic_grass) ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(club.courts_count ?? 0) > 0 ? (
                  <span className="rounded-full bg-brand-crema/10 px-2.5 py-1 text-xs font-bold text-brand-crema/60">
                    {club.courts_count} canchas
                  </span>
                ) : null}
                {club.has_glass ? (
                  <span className="rounded-full bg-brand-crema/10 px-2.5 py-1 text-xs font-bold text-brand-crema/60">
                    Blindex
                  </span>
                ) : null}
                {club.has_synthetic_grass ? (
                  <span className="rounded-full bg-brand-crema/10 px-2.5 py-1 text-xs font-bold text-brand-crema/60">
                    Césped sintético
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {/* Acciones de contacto */}
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

      {/* 2. Disponibilidad y reserva */}
      <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
        {/* Encabezado con navegacion de dia */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="font-display text-xl font-black uppercase tracking-tight text-brand-negro">
            Turnos disponibles
          </h2>
          <div className="flex items-center gap-1">
            {canGoPrev ? (
              <Link
                href={`${profileHref}?book_date=${prevDateStr}`}
                className="rounded-lg border border-stone-200 p-1.5 text-brand-gris-mid transition hover:bg-stone-50"
                aria-label="Día anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
            ) : (
              <span className="rounded-lg border border-stone-100 p-1.5 text-brand-gris-mid/30">
                <ChevronLeft className="h-4 w-4" />
              </span>
            )}
            <span className="min-w-[5rem] text-center text-sm font-semibold text-brand-negro capitalize">
              {formatBookDate(bookDate)}
            </span>
            <Link
              href={`${profileHref}?book_date=${nextDateStr}`}
              className="rounded-lg border border-stone-200 p-1.5 text-brand-gris-mid transition hover:bg-stone-50"
              aria-label="Día siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {courts.length === 0 ? (
          <p className="text-sm text-brand-gris-mid">
            Este club todavía no publicó canchas para reservar online.
          </p>
        ) : (
          <TimeSlotPicker
            clubSlotStates={availability.clubSlotStates}
            activeCourts={availability.activeCourts}
            slotMinutes={availability.slotMinutes}
            selectedTime=""
            selectedCourtId=""
            buildSlotHref={buildBookSlotHref}
          />
        )}

        <Link
          href={bookHref}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-rojo px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-brand-rojo-dark"
        >
          Ver todos los días
        </Link>
      </section>

      {/* 3. Torneos y ligas abiertos a inscripcion — lo accionable primero */}
      {events.open.length > 0 ? (
        <PublicSectionCard title="Abiertos a inscripción">
          <PublicClubEventsList
            events={events.open}
            clubSlugOrId={clubSlugOrId}
            emptyLabel="No hay inscripciones abiertas."
            badge={{ label: "Inscripciones abiertas" }}
          />
        </PublicSectionCard>
      ) : null}

      {/* 4. Torneos y ligas en juego */}
      {events.inPlay.length > 0 ? (
        <PublicSectionCard title="Torneos y ligas en juego">
          <PublicClubEventsList
            events={events.inPlay}
            clubSlugOrId={clubSlugOrId}
            emptyLabel="No hay eventos en juego."
            badge={{ label: "En juego" }}
          />
        </PublicSectionCard>
      ) : null}

      {/* 5. Ediciones anteriores */}
      {events.past.length > 0 ? (
        <PublicSectionCard title="Ediciones anteriores">
          <PublicClubEventsList
            events={events.past}
            clubSlugOrId={clubSlugOrId}
            emptyLabel="Todavía no hay ediciones terminadas."
          />
        </PublicSectionCard>
      ) : null}

      {/* 5. Descripcion */}
      {club.description?.trim() ? (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
          <p className="whitespace-pre-line text-sm leading-relaxed text-brand-gris-mid">
            {club.description.trim()}
          </p>
        </section>
      ) : null}
    </div>
  );
}
