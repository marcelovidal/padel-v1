import { redirect } from "next/navigation";

export default async function PlayerLoginPage({
  searchParams,
}: {
  searchParams: { next?: string; mode?: string; portal?: string };
}) {
  const params = new URLSearchParams();
  if (searchParams.next) params.set("next", searchParams.next);
  if (searchParams.mode) params.set("mode", searchParams.mode);
  if (searchParams.portal) params.set("portal", searchParams.portal);

  const suffix = params.toString();
  redirect(suffix ? `/welcome?${suffix}` : "/welcome");
}
