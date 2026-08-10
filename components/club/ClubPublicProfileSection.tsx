"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { updateClubPublicProfileAction } from "@/lib/actions/club-profile.actions";
import { isGoogleMapsUrl, MAPS_URL_HINT } from "@/lib/clubs/mapsUrl";

type ClubPublicProfileSectionProps = {
  clubId: string;
  slug: string | null;
  mapsUrl: string | null;
};

export function ClubPublicProfileSection({ clubId, slug, mapsUrl }: ClubPublicProfileSectionProps) {
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(mapsUrl || "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Se avisa mientras escribe, pero no se bloquea el submit: la validacion que
  // manda es la de la action, y arriba de ella la del RPC.
  const looksWrong = value.trim().length > 0 && !isGoogleMapsUrl(value);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("club_id", clubId);
      formData.set("maps_url", value);

      const result = await updateClubPublicProfileAction(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSuccess("Perfil publico actualizado.");
    });
  }

  const publicHref = slug ? `/clubs/${slug}` : `/clubs/${clubId}`;

  return (
    <section className="rounded-2xl border bg-white p-5 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Perfil publico</h2>
        <p className="text-sm text-gray-500">
          Lo que ve alguien que abre el link del club. El logo y el telefono se editan en{" "}
          <Link href="/player/mi-club/perfil" className="font-semibold text-blue-700 hover:underline">
            Perfil del Club
          </Link>
          .
        </p>
      </div>

      {/* Slug: se muestra, no se edita */}
      <div className="space-y-1">
        <label className="block text-xs font-black uppercase tracking-widest text-gray-500">
          Direccion del perfil
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700">
            /clubs/{slug || "—"}
          </code>
          <Link
            href={publicHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <ExternalLink className="h-4 w-4" />
            Ver perfil
          </Link>
        </div>
        <p className="text-xs text-gray-500">
          {slug
            ? "No se puede cambiar: es fijo para que los links ya compartidos no se rompan, incluso si cambia el nombre del club."
            : "Todavia sin generar. Aparece una vez aplicada la migracion del perfil publico."}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-2">
        <label
          htmlFor="maps_url"
          className="block text-xs font-black uppercase tracking-widest text-gray-500"
        >
          Link de Google Maps
        </label>
        <input
          id="maps_url"
          type="url"
          inputMode="url"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://maps.app.goo.gl/..."
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
        />
        <p className="text-xs text-gray-500">{MAPS_URL_HINT}</p>

        {looksWrong ? (
          <p className="text-xs text-amber-700">
            No parece un link de Google Maps. Revisalo antes de guardar.
          </p>
        ) : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {success ? <p className="text-sm text-green-700">{success}</p> : null}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {isPending ? "Guardando..." : "Guardar"}
        </button>
      </form>
    </section>
  );
}
