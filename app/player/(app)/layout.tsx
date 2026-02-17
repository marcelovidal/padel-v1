import Link from "next/link";
import { requirePlayer } from "@/lib/auth";
import { LogOut } from "lucide-react";
import { resolveAvatarSrc } from "@/lib/avatar-server.utils";
import { UserAvatar } from "@/components/ui/UserAvatar";

export default async function PlayerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, player } = await requirePlayer();
    const avatarData = await resolveAvatarSrc({ player, user });

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <Link href="/player" className="font-black text-2xl text-blue-600 tracking-tighter italic">
                            PASALA
                        </Link>
                        <nav className="hidden md:flex gap-6">
                            <Link href="/player" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
                                Dashboard
                            </Link>
                            <Link href="/player/matches" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
                                Partidos
                            </Link>
                            <Link href="/player/players" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
                                Jugadores
                            </Link>
                            <Link href="/player/profile" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
                                Perfil
                            </Link>
                        </nav>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 mr-2">
                            <UserAvatar
                                src={avatarData.src}
                                initials={avatarData.initials}
                                size="sm"
                            />
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-gray-900 leading-none">
                                    {player.display_name}
                                </span>
                                <span className="text-[10px] text-gray-500 hidden sm:inline-block leading-none mt-1">
                                    {user.email}
                                </span>
                            </div>
                        </div>
                        <form action="/auth/signout" method="post">
                            <button className="text-gray-400 hover:text-red-500 transition-colors">
                                <LogOut className="w-5 h-5" />
                                <span className="sr-only">Cerrar Sesión</span>
                            </button>
                        </form>
                    </div>
                </div>
                {/* Mobile Navigation */}
                <div className="md:hidden border-t px-4 py-3 flex gap-6 overflow-x-auto bg-gray-50/50">
                    <Link href="/player" className="text-sm font-medium text-gray-600 whitespace-nowrap">Dashboard</Link>
                    <Link href="/player/matches" className="text-sm font-medium text-gray-600 whitespace-nowrap">Partidos</Link>
                    <Link href="/player/players" className="text-sm font-medium text-gray-600 whitespace-nowrap">Jugadores</Link>
                    <Link href="/player/profile" className="text-sm font-medium text-gray-600 whitespace-nowrap">Perfil</Link>
                </div>
            </header>
            <main className="py-6">
                {children}
            </main>
        </div>
    );
}
