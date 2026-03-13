import { NextResponse } from "next/server";

export const revalidate = 3600;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const ids = searchParams.get("ids")?.trim();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const url = new URL("https://apis.datos.gob.ar/georef/api/localidades");
    url.searchParams.set("campos", "id,nombre,provincia");

    if (ids) {
      // Lookup by comma-separated IDs
      url.searchParams.set("id", ids);
      url.searchParams.set("max", "50");
    } else if (q && q.length >= 2) {
      // Free-text search
      url.searchParams.set("nombre", q);
      url.searchParams.set("max", "15");
    } else {
      return NextResponse.json([]);
    }

    const response = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) return NextResponse.json([]);

    const data = await response.json();

    const results = (data.localidades || []).map((l: any) => ({
      id: l.id,
      nombre: l.nombre,
      provincia: l.provincia?.nombre ?? null,
    }));

    return NextResponse.json(results);
  } catch {
    clearTimeout(timeoutId);
    return NextResponse.json([]);
  }
}
