"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function PublicContactModal({
  buttonClassName,
  onTriggerClick,
}: {
  buttonClassName?: string;
  onTriggerClick?: () => void;
} = {}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const reset = () => {
    setName("");
    setEmail("");
    setMessage("");
    setIsSending(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSending) return;

    setIsSending(true);
    try {
      const res = await fetch("/api/support/public-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
          currentUrl: typeof window !== "undefined" ? window.location.href : null,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "No se pudo enviar el mensaje");
      }

      toast({
        title: "Mensaje enviado",
        description: "El equipo de soporte recibio tu consulta.",
      });
      setOpen(false);
      reset();
    } catch (err: any) {
      toast({
        title: "Error al enviar",
        description: err?.message || "Intenta nuevamente en unos minutos.",
        variant: "destructive",
      });
      setIsSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          onTriggerClick?.();
          setOpen(true);
        }}
        className={buttonClassName || "hover:text-blue-700"}
      >
        Contacto
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
            onClick={() => {
              setOpen(false);
              reset();
            }}
          />

          <div className="relative z-[91] w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4">
              <h3 className="text-lg font-black tracking-tight text-slate-900">Contacto</h3>
              <p className="mt-1 text-sm text-slate-500">
                Envianos tu consulta y el equipo de soporte la revisa.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
                  Nombre
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={120}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  placeholder="Tu nombre"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  maxLength={200}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  placeholder="tu@email.com"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
                  Mensaje
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  minLength={10}
                  maxLength={4000}
                  rows={5}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
                  placeholder="Contanos que necesitás o que problema encontraste..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    reset();
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSending ? "Enviando..." : "Enviar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
