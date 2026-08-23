"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GuestPlayerModal } from "@/components/players/GuestPlayerModal";

export function AddPlayerButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-black uppercase tracking-wide text-white hover:bg-blue-700"
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
        Agregar jugador
      </button>

      <GuestPlayerModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSuccess={() => router.refresh()}
        showCategory
      />
    </>
  );
}
