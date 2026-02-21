"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ProfileIssueTooltipProps {
  targetProfileType: "player" | "club";
  targetProfileId: string;
  targetProfileName?: string | null;
}

export function ProfileIssueTooltip({
  targetProfileType,
  targetProfileId,
  targetProfileName,
}: ProfileIssueTooltipProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState("");
  const [currentUrl, setCurrentUrl] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setSending(true);
    try {
      const response = await fetch("/api/support/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          details,
          targetProfileType,
          targetProfileId,
          targetProfileName: targetProfileName || null,
          currentUrl,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "No se pudo enviar el reporte");
      }

      toast({
        title: "Reporte enviado",
        description: "Gracias. El equipo de soporte va a revisar la situacion.",
      });
      setDetails("");
      setOpen(false);
    } catch (error: any) {
      toast({
        title: "No se pudo enviar",
        description: error?.message || "Intenta nuevamente en unos segundos.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 w-[340px] max-w-[92vw] rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl">
          <p className="text-sm font-black text-gray-900">Reportar situacion de testing</p>
          <p className="mt-1 text-xs text-gray-500">
            Se enviara al equipo de soporte para verificar la situacion.
          </p>

          <form className="mt-3 space-y-2.5" onSubmit={handleSubmit}>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              required
              rows={4}
              placeholder="Describe la situacion que encontraste..."
              className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-sm resize-none"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={sending}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={sending}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? "Enviando..." : "Enviar reporte"}
              </button>
            </div>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        title="Reportar situacion de testing"
        className="rounded-full bg-red-600 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg hover:bg-red-700"
      >
        Reportar
      </button>
    </div>
  );
}
