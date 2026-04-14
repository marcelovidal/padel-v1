import { requireClubOwner } from "@/lib/auth";

export default async function MiClubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Solo protege el acceso — el shell de navegación lo provee el player layout padre
  await requireClubOwner();
  return <>{children}</>;
}
