import { redirect } from "next/navigation";

export default function AgendaRedirectPage({
  searchParams,
}: {
  searchParams?: { date?: string; view?: string };
}) {
  const params = new URLSearchParams();
  if (searchParams?.date) params.set("date", searchParams.date);
  if (searchParams?.view) params.set("view", searchParams.view);
  const qs = params.toString();
  redirect(`/club/dashboard/bookings${qs ? `?${qs}` : ""}`);
}
