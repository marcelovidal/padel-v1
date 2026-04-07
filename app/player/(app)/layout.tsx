import { requirePlayer } from "@/lib/auth";
import { resolveAvatarSrc } from "@/lib/avatar-server.utils";
import { PlayerTopNav } from "@/components/player/PlayerTopNav";
import { ProfileIssueTooltip } from "@/components/feedback/ProfileIssueTooltip";

export default async function PlayerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, player } = await requirePlayer();
    const avatarData = await resolveAvatarSrc({ player, user });

    return (
        <div className="min-h-screen bg-gray-50">
            <PlayerTopNav
                displayName={player.display_name}
                email={user.email}
                avatarSrc={avatarData.src}
                avatarInitials={avatarData.initials}
                isCoach={(player as any).is_coach === true}
            />
            {process.env.NODE_ENV === "development" ? (
                <div className="fixed bottom-3 left-3 z-50 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-mono font-bold text-white backdrop-blur-sm pointer-events-none select-none">
                    DEV · {new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </div>
            ) : null}
            <main className="py-6">
                {children}
            </main>
            <ProfileIssueTooltip
                targetProfileType="player"
                targetProfileId={player.id}
                targetProfileName={player.display_name}
            />
        </div>
    );
}
