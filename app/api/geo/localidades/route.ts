import { NextResponse } from 'next/server';

export const revalidate = 3600; // Cache for 1 hour

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const provinciaId = searchParams.get('provincia');
    const query = searchParams.get('q');

    if (!provinciaId) {
        return NextResponse.json({ error: 'provincia parameter is required' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
        // We fetch a larger amount if no search query is provided, or filter by name
        const url = new URL('https://apis.datos.gob.ar/georef/api/localidades');
        url.searchParams.set('provincia', provinciaId);
        url.searchParams.set('max', '500'); // Reasonable limit for a province's cities
        if (query) {
            url.searchParams.set('nombre', query);
        }

        const response = await fetch(url.toString(), {
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
        const localidades = data.localidades.map((l: any) => ({
            id: l.id,
            nombre: l.nombre,
        })).sort((a: any, b: any) => a.nombre.localeCompare(b.nombre));

        return NextResponse.json(localidades);
    } catch (error: any) {
        clearTimeout(timeoutId);
        console.error('Geo API Proxy Error (Localidades):', error);

        if (error.name === 'AbortError') {
            return NextResponse.json({ error: 'External API timeout' }, { status: 504 });
        }

        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
