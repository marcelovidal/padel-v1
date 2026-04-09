import { requirePlayer } from "@/lib/auth";
import { CalendarioView } from "@/components/player/CalendarioView";

export const metadata = { title: "Calendario — PASALA" };

export default async function CalendarioPage() {
  const { player } = await requirePlayer();
  return (
    <CalendarioView isCoach={(player as any).is_coach === true} />
  );
}
