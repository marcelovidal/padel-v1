"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function LandingNav({ primaryHref }: { primaryHref: string }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-colors duration-300"
      style={{ backgroundColor: scrolled ? "#080808" : "transparent" }}
    >
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4 md:px-10 md:py-5">
        <Link
          href="/"
          style={{
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            fontSize: "22px",
            color: "#1565C0",
            textDecoration: "none",
          }}
        >
          Pasala
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="/players"
            className="uppercase tracking-widest transition-colors hover:text-white"
            style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}
          >
            Jugadores
          </Link>
          <Link
            href="/clubs"
            className="uppercase tracking-widest transition-colors hover:text-white"
            style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}
          >
            Clubes
          </Link>
        </nav>

        {/* CTA */}
        <Link
          href={primaryHref}
          className="text-white uppercase tracking-widest transition-opacity hover:opacity-80"
          style={{
            fontSize: "11px",
            border: "0.5px solid rgba(255,255,255,0.15)",
            padding: "6px 16px",
          }}
        >
          Ingresá
        </Link>
      </div>
    </header>
  );
}
