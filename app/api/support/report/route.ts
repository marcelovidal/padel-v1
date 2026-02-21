import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const supportReportSchema = z.object({
  details: z.string().trim().min(10).max(4000),
  targetProfileType: z.enum(["player", "club"]),
  targetProfileId: z.string().uuid(),
  targetProfileName: z.string().trim().max(200).optional().nullable(),
  currentUrl: z.string().trim().max(2000).optional().nullable(),
});

type ReporterProfileType = "player" | "club" | "admin" | "unknown";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = supportReportSchema.parse(body);

    const reporterEmail = user.email || "-";
    const metadata = (user.user_metadata as Record<string, unknown>) || {};
    const fallbackFirstName = String(metadata.first_name || "").trim();
    const fallbackLastName = String(metadata.last_name || "").trim();

    let reporterProfileType: ReporterProfileType = "unknown";
    let reporterProfileId = user.id;
    let reporterFirstName = fallbackFirstName;
    let reporterLastName = fallbackLastName;

    const { data: player } = await (supabase
      .from("players")
      .select("id,first_name,last_name")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle() as any);

    if (player) {
      reporterProfileType = "player";
      reporterProfileId = player.id;
      reporterFirstName = (player.first_name || fallbackFirstName || "").trim();
      reporterLastName = (player.last_name || fallbackLastName || "").trim();
    } else {
      const { data: club } = await (supabase
        .from("clubs")
        .select("id,contact_first_name,contact_last_name")
        .eq("claimed_by", user.id)
        .eq("claim_status", "claimed")
        .is("deleted_at", null)
        .order("claimed_at", { ascending: false })
        .maybeSingle() as any);

      if (club) {
        reporterProfileType = "club";
        reporterProfileId = club.id;
        reporterFirstName = (club.contact_first_name || fallbackFirstName || "").trim();
        reporterLastName = (club.contact_last_name || fallbackLastName || "").trim();
      } else {
        const { data: profile } = await (supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle() as any);

        if (profile?.role === "admin") {
          reporterProfileType = "admin";
        }
      }
    }

    const supportTo = process.env.SUPPORT_REPORT_TO || "marcelojaviervidal@gmail.com";
    const supportFrom =
      process.env.SUPPORT_REPORT_FROM || "PASALA Soporte <onboarding@resend.dev>";
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      return NextResponse.json(
        { error: "Email de soporte no configurado en servidor" },
        { status: 500 }
      );
    }

    const targetLabel = (parsed.targetProfileName || "").trim() || parsed.targetProfileId;
    const subject = `[PASALA TEST] Reporte en perfil ${parsed.targetProfileType}: ${targetLabel}`;
    const text = [
      "Reporte de testing PASALA",
      "",
      `Nombre: ${reporterFirstName || "-"}`,
      `Apellido: ${reporterLastName || "-"}`,
      `Email: ${reporterEmail}`,
      `Tipo de perfil reportante: ${reporterProfileType}`,
      `ID perfil reportante: ${reporterProfileId}`,
      "",
      `Perfil reportado tipo: ${parsed.targetProfileType}`,
      `Perfil reportado id: ${parsed.targetProfileId}`,
      `Perfil reportado nombre: ${parsed.targetProfileName || "-"}`,
      `URL: ${parsed.currentUrl || "-"}`,
      "",
      "Situacion reportada:",
      parsed.details,
    ].join("\n");

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: supportFrom,
        to: [supportTo],
        reply_to: reporterEmail !== "-" ? reporterEmail : undefined,
        subject,
        text,
      }),
    });

    if (!resendResponse.ok) {
      const providerError = await resendResponse.text();
      return NextResponse.json(
        { error: "No se pudo enviar el reporte", details: providerError },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos invalidos para reporte", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error?.message || "Error al enviar el reporte" },
      { status: 500 }
    );
  }
}

