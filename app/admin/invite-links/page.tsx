import { requireAdmin } from "@/lib/auth";
import { listAllInviteLinks } from "@/services/invite-links.service";
import { InviteLinksClient } from "./InviteLinksClient";

export default async function AdminInviteLinksPage() {
  await requireAdmin();
  const links = await listAllInviteLinks();
  return <InviteLinksClient links={links as any} />;
}
