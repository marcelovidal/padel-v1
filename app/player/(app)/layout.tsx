import { requirePlayer } from "@/lib/auth";
import { resolveAvatarSrc } from "@/lib/avatar-server.utils";
import { PlayerTopNav } from "@/components/player/PlayerTopNav";

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
            />
            <main className="py-6">
                {children}
            </main>
        </div>
    );
}
