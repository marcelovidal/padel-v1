import { requirePlayer } from "@/lib/auth";
import { PlayerService } from "@/services/player.service";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/input";

export default async function PlayersPage({
    searchParams,
}: {
    searchParams: { q?: string };
}) {
    const { playerId: meId } = await requirePlayer();
    const playerService = new PlayerService();
    const query = searchParams.q || "";

    // We use searchPlayersWeighted which calls player_search_players RPC
    const players = await playerService.searchPlayersWeighted(query);

    return (
        <div className="container mx-auto p-4 max-w-4xl">
            <div className="mb-8 space-y-4">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Jugadores</h1>
                        <p className="text-gray-500 text-sm font-medium">Encuentra y conoce a otros padeleros</p>
                    </div>
                </div>

                <form className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <Input
                        name="q"
                        defaultValue={query}
                        placeholder="Buscar por nombre o ciudad..."
                        className="pl-12 h-14 bg-white border-gray-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-blue-500/10 transition-all text-lg"
                    />
                </form>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                {players.length > 0 ? (
                    players.map((p: any) => (
                        <Link
                            key={p.id}
                            href={`/player/players/${p.id}`}
                            className="group bg-white p-5 rounded-3xl border border-gray-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-900/5 transition-all active:scale-[0.98]"
                        >
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                            {p.display_name}
                                        </h3>
                                        {p.is_guest && (
                                            <Badge className="text-[10px] uppercase font-black tracking-widest bg-gray-50 border border-gray-200 text-gray-400">Invitado</Badge>
                                        )}
                                        {p.id === meId && (
                                            <Badge className="text-[10px] uppercase font-black tracking-widest bg-blue-600 text-white">Tú</Badge>
                                        )}
                                    </div>
                                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">
                                        {p.position || "Cualquiera"}
                                    </p>
                                    <p className="text-sm text-gray-500 font-medium">
                                        {p.city}{p.region_name ? ` (${p.region_name})` : ""}
                                    </p>
                                </div>
                                <div className="bg-gray-50 p-2 rounded-xl group-hover:bg-blue-50 transition-colors">
                                    <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center space-y-3">
                        <div className="bg-gray-50 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto">
                            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-gray-900 font-bold">No se encontraron jugadores</p>
                            <p className="text-gray-500 text-sm">Prueba con otro término de búsqueda</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
