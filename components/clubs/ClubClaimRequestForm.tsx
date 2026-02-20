"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestClubClaimAction } from "@/lib/actions/club.actions";

interface ClubClaimRequestFormProps {
  clubId: string;
  clubName: string;
  defaultPhone?: string | null;
  nextPath?: string;
}

export function ClubClaimRequestForm({ clubId, clubName, defaultPhone, nextPath = "/player" }: ClubClaimRequestFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState(defaultPhone || "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await requestClubClaimAction({
        clubId,
        message,
        contactPhone: phone,
        next: nextPath,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.replace(result.redirectTo || nextPath);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
        <p className="text-sm text-gray-700">
          Vas a solicitar el reclamo de <span className="font-black text-gray-900">{clubName}</span>. El equipo de PASALA revisara tu solicitud.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-black uppercase tracking-widest text-gray-500">Telefono de contacto (WhatsApp)</label>
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="Ej: +54 9 11 ..."
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-black uppercase tracking-widest text-gray-500">Mensaje (opcional)</label>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Contanos por que deberias administrar este club"
          rows={4}
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
        />
      </div>

      {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-wider py-3 disabled:opacity-60"
      >
        {isPending ? "Enviando..." : "Solicitar reclamo"}
      </button>
    </form>
  );
}
