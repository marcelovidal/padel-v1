"use client";

import { useState, useCallback } from "react";

export type GeoOption = { id: string; nombre: string };

export type GeoLocationResult = {
    provincia: GeoOption | null;
    ciudad: GeoOption | null;
};

type Status = "idle" | "loading" | "success" | "denied" | "unavailable" | "error";

/**
 * Requests the device GPS position and reverse-geocodes it via /api/geo/reverse.
 * Returns the detected provincia + ciudad as GeoOption objects ready to set in form state.
 *
 * Usage:
 *   const { detect, status, error } = useGeoLocation();
 *   const result = await detect(); // GeoLocationResult | null
 */
export function useGeoLocation() {
    const [status, setStatus] = useState<Status>("idle");
    const [error, setError] = useState<string | null>(null);

    const detect = useCallback(async (): Promise<GeoLocationResult | null> => {
        setError(null);

        if (!navigator.geolocation) {
            setStatus("unavailable");
            setError("Tu dispositivo no soporta geolocalización.");
            return null;
        }

        setStatus("loading");

        let coords: GeolocationCoordinates;
        try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    timeout: 10000,
                    maximumAge: 60000,
                    enableHighAccuracy: false,
                })
            );
            coords = pos.coords;
        } catch (err: any) {
            if (err.code === 1) {
                // PERMISSION_DENIED
                setStatus("denied");
                setError("Permiso de ubicación denegado. Podés escribir tu ciudad manualmente.");
            } else {
                setStatus("error");
                setError("No pudimos obtener tu ubicación. Escribí tu ciudad manualmente.");
            }
            return null;
        }

        try {
            const res = await fetch(
                `/api/geo/reverse?lat=${coords.latitude}&lon=${coords.longitude}`
            );

            if (!res.ok) {
                throw new Error(`reverse_error:${res.status}`);
            }

            const data: GeoLocationResult = await res.json();

            if (!data.provincia) {
                setStatus("error");
                setError("No encontramos tu provincia. Seleccionala manualmente.");
                return null;
            }

            setStatus("success");
            return data;
        } catch {
            setStatus("error");
            setError("Error al identificar tu ciudad. Podés seleccionarla manualmente.");
            return null;
        }
    }, []);

    return { detect, status, error };
}
