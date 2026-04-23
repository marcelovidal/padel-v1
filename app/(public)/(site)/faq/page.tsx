import { Metadata } from "next";
import { PublicSection } from "@/components/public/PublicSection";
import { FAQAccordion } from "@/components/public/FAQAccordion";
import { publicFaqItems } from "@/lib/public/content";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Respuestas rapidas sobre cuentas, reclamos y funcionamiento de PASALA.",
  alternates: {
    canonical: "/faq",
  },
};

export default function PublicFaqPage() {
  return (
    <div>
      <PublicSection
        eyebrow="FAQ"
        title="Preguntas frecuentes"
        description="Respuestas cortas para decisiones rapidas de jugadores y clubes."
      >
        <FAQAccordion items={publicFaqItems} />
      </PublicSection>
    </div>
  );
}

