import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const publicContactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  message: z.string().trim().min(10).max(4000),
  currentUrl: z.string().trim().max(2000).optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = publicContactSchema.parse(body);

    const supportTo =
      process.env.SUPPORT_CONTACT_TO ||
      process.env.SUPPORT_REPORT_TO ||
      "marcelojaviervidal@gmail.com";
    const supportFrom =
      process.env.SUPPORT_CONTACT_FROM ||
      process.env.SUPPORT_REPORT_FROM ||
      "PASALA Soporte <onboarding@resend.dev>";
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      return NextResponse.json(
        { error: "Email de soporte no configurado en servidor" },
        { status: 500 }
      );
    }

    const subject = `[PASALA WEB] Contacto publico - ${parsed.name}`;
    const text = [
      "Consulta desde web publica PASALA",
      "",
      `Nombre: ${parsed.name}`,
      `Email: ${parsed.email}`,
      `URL: ${parsed.currentUrl || "-"}`,
      "",
      "Mensaje:",
      parsed.message,
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
        reply_to: parsed.email,
        subject,
        text,
      }),
    });

    if (!resendResponse.ok) {
      const providerError = await resendResponse.text();
      return NextResponse.json(
        { error: "No se pudo enviar el mensaje", details: providerError },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos invalidos para contacto", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error?.message || "Error al enviar contacto" },
      { status: 500 }
    );
  }
}
