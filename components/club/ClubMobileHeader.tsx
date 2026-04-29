"use client";

import Link from "next/link";
import { PasalaLogo } from "@/components/ui/PasalaLogo";

export function ClubMobileHeader() {
  return (
    <header className="md:hidden sticky top-0 z-20 bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between shrink-0">
      <Link href="/club">
        <PasalaLogo variant="light" size="md" />
      </Link>
    </header>
  );
}
