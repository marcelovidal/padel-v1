"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { createGuestPlayerAction } from "@/lib/actions/player.actions";
import { GeoSelect } from "@/components/geo/GeoSelect";
import { useDebounce } from "@/hooks/useDebounce";

interface GuestPlayerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (playerId: string, displayName: string) => void;
    defaultLocation?: { city?: string; region_code?: string };
}

export function GuestPlayerModal({ isOpen, onClose, onSuccess, defaultLocation }: GuestPlayerModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Georef State
    const [provincias, setProvincias] = useState<{ id: string; nombre: string }[]>([]);
    const [localidades, setLocalidades] = useState<{ id: string; nombre: string }[]>([]);
    const [selectedProv, setSelectedProv] = useState<{ id: string; nombre: string } | null>(null);
    const [selectedLoc, setSelectedLoc] = useState<{ id: string; nombre: string } | null>(null);
    const [loadingProvs, setLoadingProvs] = useState(false);
    const [loadingLocs, setLoadingLocs] = useState(false);
    const [geoError, setGeoError] = useState<string | null>(null);
    const [locQuery, setLocQuery] = useState("");
    const debouncedLocQuery = useDebounce(locQuery, 300);

    // Fetch Provincias
    useEffect(() => {
        if (isOpen) {
            setLoadingProvs(true);
            setGeoError(null);
            fetch('/api/geo/provincias')
                .then(async res => {
                    if (!res.ok) throw new Error(res.statusText);
                    return res.json();
                })
                .then(data => {
                    setProvincias(data);
                    if (defaultLocation?.region_code) {
                        const found = data.find((p: any) => p.id === defaultLocation.region_code);
                        if (found) setSelectedProv(found);
                    }
                })
                .catch(err => {
                    console.error("Error fetching provinces:", err);
                    setGeoError("No se pudieron cargar las provincias. Intente de nuevo.");
                })
                .finally(() => setLoadingProvs(false));
        }
    }, [isOpen, defaultLocation?.region_code]);

    // Fetch Localidades when province or query changes
    useEffect(() => {
        if (selectedProv) {
            setLoadingLocs(true);
            setGeoError(null);
            const url = `/api/geo/localidades?provincia=${selectedProv.id}${debouncedLocQuery ? `&q=${debouncedLocQuery}` : ''}`;
            fetch(url)
                .then(async res => {
                    if (!res.ok) throw new Error(res.statusText);
                    return res.json();
                })
                .then(data => {
                    setLocalidades(data);
                    // Handle default city if it's the first load
                    if (!selectedLoc && defaultLocation?.city && !debouncedLocQuery) {
                        const found = data.find((l: any) => l.nombre.toLowerCase() === defaultLocation.city?.toLowerCase());
                        if (found) setSelectedLoc(found);
                    }
                })
                .catch(err => {
                    console.error("Error fetching localities:", err);
                    setGeoError("No se pudieron cargar las localidades.");
                })
                .finally(() => setLoadingLocs(false));
        } else {
            setLocalidades([]);
            setSelectedLoc(null);
        }
    }, [selectedProv, debouncedLocQuery]); // Note: defaultLocation removed from deps to avoid cycle

    if (!isOpen) return null;

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const result = await createGuestPlayerAction(formData);

        if (result.error) {
            setError(result.error);
            setIsSubmitting(false);
        } else if (result.data) {
            const displayName = formData.get("display_name") as string;
            onSuccess(result.data, displayName);
            onClose();
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Nuevo Jugador Invitado</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {(error || geoError) && (
                        <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-bold">
                            {error || geoError}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="display_name" className="text-[10px] font-black uppercase text-gray-400">Nombre a mostrar (Obligatorio)</Label>
                        <Input
                            id="display_name"
                            name="display_name"
                            placeholder="Ej: Juan Perez"
                            required
                            className="rounded-xl"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="first_name" className="text-[10px] font-black uppercase text-gray-400">Nombre</Label>
                            <Input id="first_name" name="first_name" placeholder="Opcional" className="rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="last_name" className="text-[10px] font-black uppercase text-gray-400">Apellido</Label>
                            <Input id="last_name" name="last_name" placeholder="Opcional" className="rounded-xl" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                            <GeoSelect
                                label="Provincia"
                                placeholder="Seleccionar..."
                                options={provincias}
                                value={selectedProv?.id}
                                isLoading={loadingProvs}
                                onChange={(opt) => {
                                    setSelectedProv(opt);
                                    setSelectedLoc(null);
                                    setLocQuery("");
                                }}
                            />
                            <input type="hidden" name="region_code" value={selectedProv?.id || ""} />
                            <input type="hidden" name="region_name" value={selectedProv?.nombre || ""} />
                        </div>
                        <div className="relative">
                            <GeoSelect
                                label="Localidad"
                                placeholder={selectedProv ? "Buscar..." : "Elige provincia primero"}
                                options={localidades}
                                value={selectedLoc?.id}
                                isLoading={loadingLocs}
                                disabled={!selectedProv}
                                onChange={(opt) => {
                                    setSelectedLoc(opt);
                                }}
                            />
                            <input type="hidden" name="city" value={selectedLoc?.nombre || ""} />
                            <input type="hidden" name="city_id" value={selectedLoc?.id || ""} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="position" className="text-[10px] font-black uppercase text-gray-400">Posición preferida</Label>
                        <select
                            id="position"
                            name="position"
                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                            defaultValue="cualquiera"
                        >
                            <option value="drive">Drive</option>
                            <option value="reves">Revés</option>
                            <option value="cualquiera">Cualquiera</option>
                        </select>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 rounded-xl h-12"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 rounded-xl h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                        >
                            {isSubmitting ? "Creando..." : "Crear Perfil"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
