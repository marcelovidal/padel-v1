"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { LayoutGrid, List, RefreshCw } from "lucide-react";

type ViewMode = "agenda" | "lista" | "turnos";

export function BookingsViewToggle({ current }: { current: ViewMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const switchTo = (mode: ViewMode) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view_mode", mode);
    if (mode === "lista") {
      params.delete("date");
      params.delete("view");
    } else if (mode === "agenda" || mode === "turnos") {
      params.delete("cursor");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm font-semibold">
      <button
        onClick={() => switchTo("agenda")}
        className={`inline-flex items-center gap-1.5 px-4 py-2 transition-colors ${
          current === "agenda"
            ? "bg-blue-600 text-white"
            : "text-gray-600 hover:bg-gray-50"
        }`}
      >
        <LayoutGrid className="w-4 h-4" />
        Agenda
      </button>
      <button
        onClick={() => switchTo("turnos")}
        className={`inline-flex items-center gap-1.5 px-4 py-2 transition-colors border-l border-gray-200 ${
          current === "turnos"
            ? "bg-violet-600 text-white border-violet-600"
            : "text-gray-600 hover:bg-gray-50"
        }`}
      >
        <RefreshCw className="w-4 h-4" />
        Turnos fijos
      </button>
      <button
        onClick={() => switchTo("lista")}
        className={`inline-flex items-center gap-1.5 px-4 py-2 transition-colors border-l border-gray-200 ${
          current === "lista"
            ? "bg-blue-600 text-white border-blue-600"
            : "text-gray-600 hover:bg-gray-50"
        }`}
      >
        <List className="w-4 h-4" />
        Lista
      </button>
    </div>
  );
}
