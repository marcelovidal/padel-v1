import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export const revalidate = 86400;

const cache = new Map<string, any[]>();

function loadLocalidades(provinciaId: string): any[] | null {
  if (cache.has(provinciaId)) return cache.get(provinciaId)!;
  try {
    const file = join(process.cwd(), 'public', 'data', 'geo', `localidades-${provinciaId}.json`);
    if (!existsSync(file)) return null; // province not in local data (non-AR)
    const data = JSON.parse(readFileSync(file, 'utf-8'));
    cache.set(provinciaId, data);
    return data;
  } catch (e) {
    console.error('[geo] localidades file error:', provinciaId, e);
    return null;
  }
}

async function fetchFromGeoref(provinciaId: string): Promise<any[]> {
  const GEOREF = 'https://apis.datos.gob.ar/georef/api';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const url = `${GEOREF}/localidades?provincia=${provinciaId}&campos=id,nombre,categoria&max=3000`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return [];

    const data = await res.json();
    const byName = new Map<string, any>();
    for (const l of (data.localidades ?? [])) {
      const key = l.nombre.toLowerCase();
      const existing = byName.get(key);
      if (!existing || l.categoria === 'Localidad simple') {
        byName.set(key, { id: String(l.id), nombre: l.nombre });
      }
    }
    return Array.from(byName.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  } catch {
    clearTimeout(timeoutId);
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const provinciaId = searchParams.get('provincia');

  if (!provinciaId) {
    return NextResponse.json([], { status: 400 });
  }

  // 1. Try local static JSON (instant, no network)
  const local = loadLocalidades(provinciaId);
  if (local !== null) {
    return NextResponse.json(local, {
      headers: { 'Cache-Control': 'public, max-age=86400' },
    });
  }

  // 2. Province not in local data (outside Argentina or unknown) — try georef API
  console.info('[geo] provincia not in local data, falling back to georef:', provinciaId);
  const remote = await fetchFromGeoref(provinciaId);
  return NextResponse.json(remote, {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  });
}
