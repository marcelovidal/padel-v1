import { requirePlayer } from "@/lib/auth";
import { resolveAvatarSrc } from "@/lib/avatar-server.utils";
import { PlayerTopNav } from "@/components/player/PlayerTopNav";
import { ProfileIssueTooltip } from "@/components/feedback/ProfileIssueTooltip";
import { PlayerNotificationsProvider } from "@/contexts/player-notifications.context";
import { createClient } from "@/lib/supabase/server";

export default async function PlayerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, player } = await requirePlayer();
    const avatarData = await resolveAvatarSrc({ player, user });

    let debugInvite: string | null = null;
    if (process.env.NODE_ENV === "development") {
        const supabase = await createClient();
        const { data } = await (supabase as any)
            .from("notifications")
            .select("id, payload")
            .eq("user_id", user.id)
            .eq("type", "coach_invitation")
            .is("read_at", null)
            .limit(1)
            .maybeSingle();
        debugInvite = data
            ? `INV✓ ${(data.payload?.coach_name ?? "?").slice(0, 10)}`
            : "INV✗";
    }

    return (
        <PlayerNotificationsProvider>
            <div className="min-h-screen bg-gray-50">
                <PlayerTopNav
                    displayName={player.display_name}
                    email={user.email}
                    avatarSrc={avatarData.src}
                    avatarInitials={avatarData.initials}
                    isCoach={(player as any).is_coach === true}
                />
                {process.env.NODE_ENV === "development" ? (
                    <div className="fixed bottom-3 left-3 z-50 rounded-full bg-black/70 px-4 py-2 text-sm font-mono font-bold text-white backdrop-blur-sm pointer-events-none select-none">
                        DEV · {user.id.slice(0, 8)} · {debugInvite}
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
        </PlayerNotificationsProvider>
    );
}
