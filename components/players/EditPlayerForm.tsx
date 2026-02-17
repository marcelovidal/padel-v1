"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/Badge";
import { GeoSelect } from "@/components/geo/GeoSelect";
import { useDebounce } from "@/hooks/useDebounce";
import { updatePlayerProfileAction } from "@/lib/actions/player-profile.actions";
import AvatarUploader from "@/components/player/AvatarUploader";

interface Player {
    id: string;
    display_name: string;
    position: "drive" | "reves" | "cualquiera";
    city?: string | null;
    city_id?: string | null;
    region_code?: string | null;
    region_name?: string | null;
    country_code?: string | null;
    is_guest: boolean;
    avatar_url?: string | null;
}

export function EditPlayerForm({ player, currentAvatarUrl }: { player: Player, currentAvatarUrl?: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [displayName, setDisplayName] = useState(player.display_name || "");
    const [position, setPosition] = useState<"drive" | "reves" | "cualquiera">(player.position || "cualquiera");
    const [avatarUrl, setAvatarUrl] = useState(player.avatar_url || "");

    // Geo state
    const [provincias, setProvincias] = useState<any[]>([]);
    const [localidades, setLocalidades] = useState<any[]>([]);
    const [selectedProv, setSelectedProv] = useState<any>(null);
    const [selectedLoc, setSelectedLoc] = useState<any>(null);
    const [loadingProvs, setLoadingProvs] = useState(false);
    const [loadingLocs, setLoadingLocs] = useState(false);
    const [locQuery, setLocQuery] = useState("");
    const debouncedLocQuery = useDebounce(locQuery, 300);

    // Initial load: fetch provinces and set defaults
    useEffect(() => {
        setLoadingProvs(true);
        fetch('/api/geo/provincias')
            .then(res => res.json())
            .then(data => {
                setProvincias(data);
                if (player.region_code) {
                    const found = data.find((p: any) => p.id === player.region_code);
                    if (found) setSelectedProv(found);
                }
            })
            .catch(err => console.error("Error fetching provinces:", err))
            .finally(() => setLoadingProvs(false));
    }, [player.region_code]);

    // Localities effect
    useEffect(() => {
        if (selectedProv) {
            setLoadingLocs(true);
            const url = `/api/geo/localidades?provincia=${selectedProv.id}${debouncedLocQuery ? `&q=${debouncedLocQuery}` : ''}`;
            fetch(url)
                .then(res => res.json())
                .then(data => {
                    setLocalidades(data);
                    // Pre-select current locality if first load and no query
                    if (!selectedLoc && !debouncedLocQuery) {
                        if (player.city_id) {
                            const found = data.find((l: any) => l.id === player.city_id);
                            if (found) setSelectedLoc(found);
                        } else if (player.city) {
                            const playerCity = player.city;
                            const found = data.find((l: any) => l.nombre.toLowerCase() === playerCity.toLowerCase());
                            if (found) setSelectedLoc(found);
                        }
                    }
                })
                .catch(err => console.error("Error fetching localities:", err))
                .finally(() => setLoadingLocs(false));
        } else {
            setLocalidades([]);
            setSelectedLoc(null);
        }
    }, [selectedProv, debouncedLocQuery, player.city, player.city_id]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append("player_id", player.id);
        formData.append("display_name", displayName);
        formData.append("position", position);
        formData.append("avatar_url", avatarUrl);
        if (selectedLoc) {
            formData.append("city", selectedLoc.nombre);
            formData.append("city_id", selectedLoc.id);
        }
        if (selectedProv) {
            formData.append("region_code", selectedProv.id);
            formData.append("region_name", selectedProv.nombre);
        }

        const result = await updatePlayerProfileAction(formData);
        if (result.error) {
            setError(result.error);
            setLoading(false);
        } else {
            router.push(`/player/players/${player.id}`);
            router.refresh();
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-bold">
                    {error}
                </div>
            )}

            <div className="flex justify-center mb-8">
                <AvatarUploader
                    currentAvatarUrl={currentAvatarUrl}
                    onUploadComplete={(path: string) => setAvatarUrl(path)}
                />
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-gray-400">Nombre Público</Label>
                    <Input
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Tu nombre en el ranking"
                        className="h-12 rounded-xl"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-gray-400">Posición</Label>
                    <div className="grid grid-cols-3 gap-2">
                        {["drive", "reves", "cualquiera"].map((p) => (
                            <Button
                                key={p}
                                type="button"
                                variant={position === p ? "default" : "outline"}
                                onClick={() => setPosition(p as any)}
                                className={`rounded-xl h-12 uppercase text-[10px] font-black tracking-widest ${position === p ? "bg-blue-600 hover:bg-blue-700" : ""
                                    }`}
                            >
                                {p === "cualquiera" ? "Ambas" : p}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <GeoSelect
                        label="Provincia"
                        placeholder="Busca tu provincia..."
                        options={provincias}
                        value={selectedProv?.id}
                        isLoading={loadingProvs}
                        onChange={(prov) => {
                            setSelectedProv(prov);
                            setSelectedLoc(null);
                        }}
                    />

                    <GeoSelect
                        label="Localidad"
                        placeholder={selectedProv ? "Busca tu ciudad..." : "Primero elige provincia"}
                        options={localidades}
                        value={selectedLoc?.id}
                        isLoading={loadingLocs}
                        disabled={!selectedProv}
                        onChange={(loc) => setSelectedLoc(loc)}
                    />
                </div>
            </div>

            <div className="pt-6 flex gap-3">
                <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 h-14 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-gray-900/10 transition-all active:scale-[0.98]"
                >
                    {loading ? "Guardando..." : "Guardar Cambios"}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    className="h-14 px-8 border-gray-200 rounded-2xl font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-all"
                >
                    Cancelar
                </Button>
            </div>
        </form>
    );
}
