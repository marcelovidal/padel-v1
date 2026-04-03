import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export const revalidate = 86400;

let cached: any[] | null = null;

function loadProvincias(): any[] {
  if (cached) return cached;
  try {
    const file = join(process.cwd(), 'public', 'data', 'geo', 'provincias.json');
    cached = JSON.parse(readFileSync(file, 'utf-8'));
    return cached!;
  } catch (e) {
    console.error('[geo] provincias.json not found:', e);
    return [];
  }
}

export async function GET() {
  const provincias = loadProvincias();
  return NextResponse.json(provincias, {
    headers: { 'Cache-Control': 'public, max-age=86400' },
  });
}
