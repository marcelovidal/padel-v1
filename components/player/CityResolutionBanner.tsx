"use client";

import { useEffect, useState } from "react";
import { resolvePlayerCityAction } from "@/lib/actions/geo-resolve.actions";
import { MapPin, X } from "lucide-react";
import Link from "next/link";

/**
 * Mounted on the player dashboard when city_id is null but city text exists.
 * Tries to resolve silently on mount. If it resolves → shows a brief confirmation.
 * If it can't resolve → shows a subtle prompt to complete the profile.
 */
export function CityResolutionBanner({ cityText }: { cityText: string }) {
  const [state, setState] = useState<"resolving" | "resolved" | "failed" | "dismissed">("resolving");
  const [resolvedCity, setResolvedCity] = useState<string | null>(null);

  useEffect(() => {
    resolvePlayerCityAction().then((result) => {
      if (result.resolved) {
        setResolvedCity(result.city || cityText);
        setState("resolved");
        // Auto-dismiss after 4 seconds
        setTimeout(() => setState("dismissed"), 4000);
      } else {
        setState("failed");
      }
    });
  }, [cityText]);

  if (state === "dismissed" || state === "resolving") return null;

  if (state === "resolved") {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
        <MapPin className="h-4 w-4 shrink-0 text-green-600" />
        <span>Ciudad verificada: <strong>{resolvedCity}</strong></span>
        <button onClick={() => setState("dismissed")} className="ml-auto text-green-600 hover:text-green-800">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // failed — couldn't resolve, prompt to complete manually
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <MapPin className="h-4 w-4 shrink-0 text-amber-600" />
      <span>Completá tu ciudad en el perfil para aparecer en eventos de tu zona.</span>
      <Link href="/player/profile" className="ml-auto shrink-0 rounded-lg bg-amber-600 px-3 py-1 text-xs font-bold text-white hover:bg-amber-700">
        Completar
      </Link>
      <button onClick={() => setState("dismissed")} className="text-amber-600 hover:text-amber-800">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
