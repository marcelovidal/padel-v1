import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const start = Date.now();

  try {
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json(
        { ok: false, error: "CRON_SECRET no está configurada en el entorno" },
        { status: 500 },
      );
    }

    const authHeader = request.headers.get("authorization");

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    const source = request.nextUrl.searchParams.get("source") === "manual" ? "manual" : "cron";
    const supabase = createAdminClient();

    const { data: prev } = await supabase
      .from("keepalive_log")
      .select("ts, status")
      .order("ts", { ascending: false })
      .limit(1)
      .single();

    const durationMs = Date.now() - start;

    const { error: insertError } = await supabase.from("keepalive_log").insert({
      status: "ok",
      source,
      message: null,
      duration_ms: durationMs,
    });

    if (insertError) {
      console.error("[cron/keepalive] Error insertando latido:", insertError);
      return NextResponse.json(
        { ok: false, error: insertError.message, ts: new Date().toISOString() },
        { status: 500 },
      );
    }

    await supabase.rpc("keepalive_log_cleanup");

    return NextResponse.json({
      ok: true,
      source,
      ts: new Date().toISOString(),
      duration_ms: durationMs,
      previous: prev ? { ts: prev.ts, status: prev.status } : null,
    });
  } catch (error: any) {
    const durationMs = Date.now() - start;
    console.error("[cron/keepalive] Error inesperado:", error);

    try {
      const supabase = createAdminClient();
      await supabase.from("keepalive_log").insert({
        status: "error",
        source: "cron",
        message: error?.message || "Error inesperado",
        duration_ms: durationMs,
      });
    } catch {
      console.error("[cron/keepalive] No se pudo registrar el error en keepalive_log");
    }

    return NextResponse.json(
      { ok: false, error: error?.message || "Error en keep-alive", ts: new Date().toISOString() },
      { status: 500 },
    );
  }
}
