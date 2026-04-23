import { Metadata } from "next";
import { PublicSection } from "@/components/public/PublicSection";

export const metadata: Metadata = {
  title: "Terminos",
  description: "Terminos y condiciones basicos para uso de PASALA.",
  alternates: {
    canonical: "/terms",
  },
};

export default function PublicTermsPage() {
  return (
    <div>
      <PublicSection
        eyebrow="Legal"
        title="Terminos y condiciones"
        description="Condiciones basicas de uso para jugadores, clubes y administradores."
      >
        <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 text-sm leading-relaxed text-slate-600">
          <p>
            Al usar PASALA, aceptas utilizar la plataforma de forma legitima y respetuosa, cargando
            informacion de partidos real y evitando suplantaciones o usos fraudulentos.
          </p>
          <p>
            PASALA puede suspender cuentas o rechazar reclamos cuando detecte inconsistencias, abuso
            o incumplimientos de reglas operativas del producto.
          </p>
          <p>
            Los terminos pueden actualizarse durante la etapa de evolucion del servicio. El uso continuo
            de la plataforma implica aceptacion de las versiones vigentes publicadas en este sitio.
          </p>
        </div>
      </PublicSection>
    </div>
  );
}

