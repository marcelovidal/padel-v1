import { NextResponse } from 'next/server';

export const revalidate = 3600;

const GEOREF_BASE = 'https://apis.datos.gob.ar/georef/api';
const MAX_LOCALIDADES = 3000;
const TIMEOUT_MS = 10000;
const MAX_RETRIES = 2;

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<Response> {
    for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
        try {
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.ok) return res;
            // Rate limit: no retry
            if (res.status === 429) throw Object.assign(new Error('rate_limit'), { status: 429 });
            if (attempt === retries) throw new Error(`external_error:${res.status}`);
        } catch (err: any) {
            clearTimeout(timeoutId);
            if (err.status === 429) throw err;
            if (attempt === retries) throw err;
            // Wait before retry: 300ms, 700ms
            await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
        }
    }
    throw new Error('unreachable');
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const provinciaId = searchParams.get('provincia');
    const query = searchParams.get('q');

    if (!provinciaId) {
        return NextResponse.json({ error: 'provincia parameter is required' }, { status: 400 });
    }

    const url = new URL(`${GEOREF_BASE}/localidades`);
    url.searchParams.set('provincia', provinciaId);
    url.searchParams.set('max', String(MAX_LOCALIDADES));
    if (query) url.searchParams.set('nombre', query);

    try {
        const response = await fetchWithRetry(url.toString());
        const data = await response.json();

        // Prefer "Localidad simple" when deduplicating by name — avoids showing
        // the same city twice (georef returns both "Entidad" and "Localidad simple")
        const byName = new Map<string, any>();
        for (const l of (data.localidades ?? [])) {
            const key = l.nombre.toLowerCase();
            const existing = byName.get(key);
            if (!existing || l.categoria === "Localidad simple") {
                byName.set(key, l);
            }
        }
        const localidades = Array.from(byName.values())
            .map((l: any) => ({ id: String(l.id), nombre: l.nombre }))
            .sort((a: any, b: any) => a.nombre.localeCompare(b.nombre));

        return NextResponse.json(localidades);
    } catch (error: any) {
        console.error('Geo API (localidades) failed after retries:', error?.message);

        if (error?.status === 429 || error?.message === 'rate_limit') {
            return NextResponse.json([], { headers: { 'X-Geo-Fallback': 'rate_limit' } });
        }
        if (error?.name === 'AbortError') {
            return NextResponse.json([], { headers: { 'X-Geo-Fallback': 'timeout' } });
        }
        // Always return empty array (never 500) so the UI degrades gracefully
        return NextResponse.json([], { headers: { 'X-Geo-Fallback': 'error' } });
    }
}
