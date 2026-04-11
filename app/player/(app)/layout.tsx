import { requirePlayer } from "@/lib/auth";
import { resolveAvatarSrc } from "@/lib/avatar-server.utils";
import { PlayerLayoutShell } from "@/components/player/PlayerLayoutShell";
import { ProfileIssueTooltip } from "@/components/feedback/ProfileIssueTooltip";
import { PlayerNotificationsProvider } from "@/contexts/player-notifications.context";

export default async function PlayerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, player } = await requirePlayer();
    const avatarData = await resolveAvatarSrc({ player, user });
    const isCoach = !!(player as any).is_coach;
    const location = [player.city, player.region_code].filter(Boolean).join(", ") || null;

    return (
        <PlayerNotificationsProvider>
            <PlayerLayoutShell
                displayName={player.display_name}
                location={location}
                avatarSrc={avatarData.src ?? null}
                avatarInitials={avatarData.initials ?? ""}
                isCoach={isCoach}
            >
                {children}
            </PlayerLayoutShell>

            <ProfileIssueTooltip
                targetProfileType="player"
                targetProfileId={player.id}
                targetProfileName={player.display_name}
            />
        </PlayerNotificationsProvider>
    );
}
