import { Metadata } from "next";
import { PublicSection } from "@/components/public/PublicSection";

export const metadata: Metadata = {
  title: "Privacidad",
  description: "Politica de privacidad basica de PASALA.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PublicPrivacyPage() {
  return (
    <div>
      <PublicSection
        eyebrow="Legal"
        title="Politica de privacidad"
        description="Version resumida para etapa de lanzamiento y testing controlado."
      >
        <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 text-sm leading-relaxed text-slate-600">
          <p>
            PASALA recolecta informacion necesaria para identificar jugadores, registrar partidos y
            operar funcionalidades del producto. Esta informacion se usa exclusivamente para brindar
            el servicio y mejorar la experiencia.
          </p>
          <p>
            No vendemos datos personales a terceros. Podemos compartir informacion con proveedores
            de infraestructura estrictamente necesarios para operar la plataforma (hosting, autenticacion
            y comunicaciones).
          </p>
          <p>
            Cada usuario puede solicitar correcciones o eliminacion de datos escribiendo a nuestro
            canal de soporte. Durante el periodo de testing, podemos conservar registros operativos
            para auditoria y seguridad.
          </p>
        </div>
      </PublicSection>
    </div>
  );
}

