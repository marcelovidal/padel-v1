import { requirePlayer } from "@/lib/auth";
import { resolveAvatarSrc } from "@/lib/avatar-server.utils";
import { PlayerLayoutShell } from "@/components/player/PlayerLayoutShell";
import { ProfileIssueTooltip } from "@/components/feedback/ProfileIssueTooltip";
import { PlayerNotificationsProvider } from "@/contexts/player-notifications.context";
import { createClient } from "@/lib/supabase/server";
import { getAppSetting } from "@/repositories/app-settings.repository";

export default async function PlayerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, player } = await requirePlayer();
    const avatarData = await resolveAvatarSrc({ player, user });
    const isCoach = !!(player as any).is_coach;
    const isClubOwner = !!(player as any).is_club_owner;
    const location = [player.city, player.region_code].filter(Boolean).join(", ") || null;

    const supabase = await createClient();
    const [bookingsFlag, courtsResult] = await Promise.all([
        getAppSetting("bookings_enabled"),
        supabase
            .from("club_courts")
            .select("id", { count: "exact", head: true })
            .eq("active", true),
    ]);

    const bookingsEnabled = bookingsFlag === "true";
    const { count: activeCourtsCount, error: courtsError } = courtsResult;
    const hasClubsWithCourts =
        bookingsEnabled &&
        !courtsError &&
        activeCourtsCount !== null &&
        activeCourtsCount > 0;

    return (
        <PlayerNotificationsProvider>
            <PlayerLayoutShell
                playerId={player.id}
                displayName={player.display_name}
                location={location}
                avatarSrc={avatarData.src ?? null}
                avatarInitials={avatarData.initials ?? ""}
                isCoach={isCoach}
                isClubOwner={isClubOwner}
                hasClubsWithCourts={hasClubsWithCourts}
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
