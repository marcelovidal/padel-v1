import Link from "next/link";
import { Metadata } from "next";
import { Building2, ClipboardCheck, MapPin, Rocket } from "lucide-react";
import { PublicSection } from "@/components/public/PublicSection";
import { FeatureCard } from "@/components/public/FeatureCard";
import { getRegisterClubHref } from "@/lib/auth/public-cta.shared";

export const metadata: Metadata = {
  title: "Para clubes",
  description:
    "PASALA para clubes: claim de ficha publica, validacion administrativa y base para futuras reservas.",
  alternates: {
    canonical: "/clubs",
  },
};

export default function PublicClubsPage() {
  const clubHref = getRegisterClubHref();

  return (
    <div>
      <PublicSection
        eyebrow="Para clubes"
        title="Converti tu club en referencia local"
        description="PASALA posiciona a cada sede con ficha publica y flujo de reclamo controlado."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FeatureCard
            title="Ficha publica del club"
            description="Nombre, ciudad, canchas y datos clave para que te encuentren rapido."
            icon={<Building2 className="h-5 w-5" />}
          />
          <FeatureCard
            title="Reclamo con aprobacion"
            description="El ownership se valida con solicitud y revision administrativa."
            icon={<ClipboardCheck className="h-5 w-5" />}
          />
          <FeatureCard
            title="Visibilidad por zona"
            description="Jugadores y grupos pueden descubrir clubes por ciudad y contexto real."
            icon={<MapPin className="h-5 w-5" />}
          />
          <FeatureCard
            title="Base para operaciones"
            description="Proximamente reservas, ocupacion de canchas y gestion comercial."
            icon={<Rocket className="h-5 w-5" />}
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={clubHref}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-blue-700"
          >
            Registrar club
          </Link>
          <Link
            href="/pricing"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black uppercase tracking-wide text-slate-700 transition hover:bg-slate-50"
          >
            Ver pricing
          </Link>
        </div>
      </PublicSection>
    </div>
  );
}

