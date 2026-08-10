import { notFound, permanentRedirect } from "next/navigation";
import { findPublicClub, publicClubHref } from "@/lib/clubs/publicClub";

/**
 * Ruta vieja. El contenido se mudo a /clubs/[slug]/ligas para unificar el
 * namespace publico del club en plural.
 *
 * permanentRedirect (308) y no redirect (307) porque la mudanza es definitiva
 * y conviene que se propague en cualquier link ya indexado o compartido.
 */
export default async function LegacyClubLeaguesPage({
  params,
}: {
  params: { clubId: string };
}) {
  const resolved = await findPublicClub(params.clubId);
  if (!resolved) notFound();

  permanentRedirect(`${publicClubHref(resolved.club)}/ligas`);
}
