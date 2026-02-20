"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resolveClubClaimAction } from "@/lib/actions/club.actions";
import { Button } from "@/components/ui/button";

export function AdminClubClaimActions({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleResolve(action: "approved" | "rejected") {
    setError(null);
    startTransition(async () => {
      const result = await resolveClubClaimAction({ requestId, action });
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={isPending}
          onClick={() => handleResolve("approved")}
        >
          Aprobar
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => handleResolve("rejected")}
        >
          Rechazar
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

