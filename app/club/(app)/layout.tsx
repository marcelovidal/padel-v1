import { requireClub } from "@/lib/auth";
import { resolveAvatarSrc } from "@/lib/avatar-server.utils";
import { ClubLayoutShell } from "@/components/club/ClubLayoutShell";
import { ProfileIssueTooltip } from "@/components/feedback/ProfileIssueTooltip";

export default async function ClubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { club } = await requireClub();
  const avatarData = await resolveAvatarSrc({
    player: {
      avatar_url: club.avatar_url,
      display_name: club.name,
    },
  });

  return (
    <>
      <ClubLayoutShell
        clubName={club.name}
        city={(club as any).city ?? null}
        avatarSrc={avatarData.src ?? null}
      >
        {children}
      </ClubLayoutShell>
      <ProfileIssueTooltip
        targetProfileType="club"
        targetProfileId={club.id}
        targetProfileName={club.name}
      />
    </>
  );
}
