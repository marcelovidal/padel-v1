import Link from "next/link";
import { PublicContainer } from "@/components/public/PublicContainer";
import { PublicContactModal } from "@/components/public/PublicContactModal";

const FOOTER_LINK_CLASS = "transition-colors hover:text-brand-rojo";

export function PublicFooter() {
  return (
    <footer className="border-t border-[var(--border-soft)] bg-[var(--bg-card)]">
      <PublicContainer className="py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-lg font-black uppercase tracking-tight text-[var(--text-primary)]">
              PASALA
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              El padel se juega. PASALA lo registra.
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-4 text-sm font-semibold text-[var(--text-muted)]">
            <Link href="/terms" className={FOOTER_LINK_CLASS}>
              Terminos
            </Link>
            <Link href="/privacy" className={FOOTER_LINK_CLASS}>
              Privacidad
            </Link>
            <PublicContactModal buttonClassName={FOOTER_LINK_CLASS} />
          </nav>
        </div>

        <p className="mt-6 text-xs text-[var(--text-faint)]">
          © {new Date().getFullYear()} PASALA. Todos los derechos reservados.
        </p>
      </PublicContainer>
    </footer>
  );
}
