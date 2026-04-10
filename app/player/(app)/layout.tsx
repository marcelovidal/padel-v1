import { requirePlayer } from "@/lib/auth";
import { resolveAvatarSrc } from "@/lib/avatar-server.utils";
// import { PlayerTopNav } from "@/components/player/PlayerTopNav"; // legacy — fallback si hay que revertir
import { PlayerSidebar } from "@/components/player/PlayerSidebar";
import { PlayerBottomNav } from "@/components/player/PlayerBottomNav";
import { PlayerMobileHeader } from "@/components/player/PlayerMobileHeader";
import { ProfileIssueTooltip } from "@/components/feedback/ProfileIssueTooltip";
import { PlayerNotificationsProvider } from "@/contexts/player-notifications.context";

export default async function PlayerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, player } = await requirePlayer();
    const avatarData = await resolveAvatarSrc({ player, user });
    const isCoach = (player as any).is_coach === true;
    const location = [player.city, player.region_code].filter(Boolean).join(", ") || null;

    return (
        <PlayerNotificationsProvider>
            <div className="min-h-screen bg-slate-50 md:flex">
                <PlayerSidebar
                    displayName={player.display_name}
                    location={location}
                    avatarSrc={avatarData.src}
                    avatarInitials={avatarData.initials}
                    isCoach={isCoach}
                />

                <div className="flex flex-col flex-1 min-w-0 md:ml-60">
                    <PlayerMobileHeader />
                    <main className="py-6 pb-24 md:pb-6">
                        {children}
                    </main>
                </div>

                <PlayerBottomNav />
            </div>

            <ProfileIssueTooltip
                targetProfileType="player"
                targetProfileId={player.id}
                targetProfileName={player.display_name}
            />
        </PlayerNotificationsProvider>
    );
}
