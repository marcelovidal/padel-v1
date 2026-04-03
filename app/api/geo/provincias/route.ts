import { NextResponse } from 'next/server';

export const revalidate = 86400;

const GEOREF_BASE = 'https://apis.datos.gob.ar/georef/api';
const TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<Response> {
    for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
        try {
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.ok) return res;
            if (res.status === 429) throw Object.assign(new Error('rate_limit'), { status: 429 });
            if (attempt === retries) throw new Error(`external_error:${res.status}`);
        } catch (err: any) {
            clearTimeout(timeoutId);
            if (err.status === 429) throw err;
            if (attempt === retries) throw err;
            await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
        }
    }
    throw new Error('unreachable');
}

export async function GET() {
    try {
        const response = await fetchWithRetry(`${GEOREF_BASE}/provincias`);
        const data = await response.json();

        const provincias = (data.provincias ?? [])
            .map((p: any) => ({ id: String(p.id), nombre: p.nombre }))
            .sort((a: any, b: any) => a.nombre.localeCompare(b.nombre));

        return NextResponse.json(provincias);
    } catch (error: any) {
        console.error('Geo API (provincias) failed after retries:', error?.message);
        // Return empty array so the UI degrades gracefully
        return NextResponse.json([], { headers: { 'X-Geo-Fallback': error?.message || 'error' } });
    }
}
