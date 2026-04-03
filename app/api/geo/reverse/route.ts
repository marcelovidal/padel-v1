import { NextResponse } from 'next/server';

// No cache: coordinates are user-specific, not shareable
export const revalidate = 0;

const GEOREF_BASE = 'https://apis.datos.gob.ar/georef/api';
const TIMEOUT_MS = 8000;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');

    if (!lat || !lon) {
        return NextResponse.json({ error: 'lat and lon are required' }, { status: 400 });
    }

    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    if (isNaN(latNum) || isNaN(lonNum)) {
        return NextResponse.json({ error: 'invalid coordinates' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        // georef /ubicacion returns the province + department + municipality for a coordinate
        const url = new URL(`${GEOREF_BASE}/ubicacion`);
        url.searchParams.set('lat', lat);
        url.searchParams.set('lon', lon);
        url.searchParams.set('campos', 'provincia,municipio,departamento');

        const response = await fetch(url.toString(), { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            return NextResponse.json({ error: 'georef_error' }, { status: 502 });
        }

        const data = await response.json();
        const ubicacion = data.ubicacion;

        if (!ubicacion) {
            return NextResponse.json({ error: 'no_location_found' }, { status: 404 });
        }

        // Best city name: prefer municipio, fall back to departamento
        const ciudad = ubicacion.municipio?.nombre || ubicacion.departamento?.nombre || null;
        const ciudadId = ubicacion.municipio?.id || ubicacion.departamento?.id || null;

        return NextResponse.json({
            provincia: ubicacion.provincia
                ? { id: String(ubicacion.provincia.id), nombre: ubicacion.provincia.nombre }
                : null,
            ciudad: ciudad ? { id: String(ciudadId), nombre: ciudad } : null,
        });
    } catch (error: any) {
        clearTimeout(timeoutId);
        console.error('Geo reverse error:', error?.message);
        if (error?.name === 'AbortError') {
            return NextResponse.json({ error: 'timeout' }, { status: 504 });
        }
        return NextResponse.json({ error: 'internal_error' }, { status: 500 });
    }
}
