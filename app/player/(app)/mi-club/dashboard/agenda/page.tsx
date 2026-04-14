import { redirect } from "next/navigation";

export default function MiClubAgendaRedirectPage({
  searchParams,
}: {
  searchParams?: { date?: string; view?: string };
}) {
  const params = new URLSearchParams();
  if (searchParams?.date) params.set("date", searchParams.date);
  if (searchParams?.view) params.set("view", searchParams.view);
  const qs = params.toString();
  redirect(`/player/mi-club/dashboard/bookings${qs ? `?${qs}` : ""}`);
}
