import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("app_settings").select("key").limit(1);

    if (error) {
      console.error("[cron/keepalive] Error de Supabase:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, ts: new Date().toISOString() });
  } catch (error: any) {
    console.error("[cron/keepalive] Error inesperado:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Error en keep-alive" },
      { status: 500 }
    );
  }
}
