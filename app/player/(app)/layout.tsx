import { requirePlayer } from "@/lib/auth";
import { resolveAvatarSrc } from "@/lib/avatar-server.utils";
// import { PlayerTopNav } from "@/components/player/PlayerTopNav"; // legacy — fallback si hay que revertir
import { PlayerSidebar } from "@/components/player/PlayerSidebar";
import { PlayerBottomNav } from "@/components/player/PlayerBottomNav";
import { PlayerMobileHeader } from "@/components/player/PlayerMobileHeader";
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

    const isCoach = (player as any).is_coach === true;

    return (
        <PlayerNotificationsProvider>
            {/* Shell: sidebar en desktop, bottom nav en mobile */}
            <div className="min-h-screen bg-slate-50 md:flex">
                {/* Sidebar — visible solo en md+ */}
                <PlayerSidebar
                    displayName={player.display_name}
                    email={user.email ?? null}
                    avatarSrc={avatarData.src}
                    avatarInitials={avatarData.initials}
                    isCoach={isCoach}
                />

                {/* Área principal */}
                <div className="flex flex-col flex-1 min-w-0 md:ml-60">
                    {/* Header mobile — logo + campana */}
                    <PlayerMobileHeader />

                    <main className="py-6 pb-24 md:pb-6">
                        {children}
                    </main>
                </div>

                {/* Bottom nav — visible solo en mobile */}
                <PlayerBottomNav />
            </div>

            {/* Debug overlay (dev only) */}
            {process.env.NODE_ENV === "development" ? (
                <div className="fixed bottom-20 left-3 z-50 rounded-full bg-black/70 px-4 py-2 text-sm font-mono font-bold text-white backdrop-blur-sm pointer-events-none select-none">
                    DEV · {user.id.slice(0, 8)} · {debugInvite}
                </div>
            ) : null}

            <ProfileIssueTooltip
                targetProfileType="player"
                targetProfileId={player.id}
                targetProfileName={player.display_name}
            />
        </PlayerNotificationsProvider>
    );
}
