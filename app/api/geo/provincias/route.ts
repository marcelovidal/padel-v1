import { NextResponse } from 'next/server';

export const revalidate = 86400; // Cache for 24 hours

export async function GET() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

    try {
        const response = await fetch('https://apis.datos.gob.ar/georef/api/provincias', {
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            if (response.status === 429) {
                return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
            }
            throw new Error(`External API error: ${response.status}`);
        }

        const data = await response.json();

        // Normalize response to a simple shape
        const provincias = data.provincias.map((p: any) => ({
            id: p.id,
            nombre: p.nombre,
        })).sort((a: any, b: any) => a.nombre.localeCompare(b.nombre));

        return NextResponse.json(provincias);
    } catch (error: any) {
        clearTimeout(timeoutId);
        console.error('Geo API Proxy Error (Provincias):', error);

        if (error.name === 'AbortError') {
            return NextResponse.json({ error: 'External API timeout' }, { status: 504 });
        }

        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
