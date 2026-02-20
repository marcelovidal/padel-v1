import { requireClub } from "@/lib/auth";
import { resolveAvatarSrc } from "@/lib/avatar-server.utils";
import { ClubTopNav } from "@/components/club/ClubTopNav";

export default async function ClubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, club } = await requireClub();
  const avatarData = await resolveAvatarSrc({
    player: {
      avatar_url: club.avatar_url,
      display_name: club.name,
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <ClubTopNav clubName={club.name} email={user.email} avatarSrc={avatarData.src} />
      <main className="py-6">{children}</main>
    </div>
  );
}
