import { FaqItem } from "@/components/public/FAQAccordion";

export const publicFaqItems: FaqItem[] = [
  {
    question: "Necesito que todos tengan cuenta para cargar un partido?",
    answer:
      "No. Podes cargar jugadores invitados y compartir el partido. Luego cada persona puede entrar y reclamar su perfil.",
  },
  {
    question: "Que pasa si cargan un partido mio?",
    answer:
      "Si apareces en un partido compartido, podes registrarte y reclamar tu perfil para consolidar tu historial.",
  },
  {
    question: "Mi celular es obligatorio?",
    answer:
      "Si. Se usa para reforzar identidad y mejorar la trazabilidad de invitaciones y reclamos.",
  },
  {
    question: "Como se valida un club?",
    answer:
      "El club se reclama mediante solicitud y pasa por una revision administrativa antes de quedar confirmado.",
  },
];

export const shareDemoMessage = `Partido cargado en PASALA
Perez/Gonzalez vs Martinez/Vidal
Resultado: 6-4 4-6 7-6
pasla.com.ar/match`;
