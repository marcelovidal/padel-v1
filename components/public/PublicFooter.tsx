import Link from "next/link";
import { PublicContainer } from "@/components/public/PublicContainer";

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <PublicContainer className="py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-black tracking-tight text-slate-900">PASALA</p>
            <p className="text-sm text-slate-500">
              El padel se juega. PASALA lo registra.
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-4 text-sm font-semibold text-slate-600">
            <Link href="/terms" className="hover:text-blue-700">
              Terminos
            </Link>
            <Link href="/privacy" className="hover:text-blue-700">
              Privacidad
            </Link>
            <a href="mailto:soporte@pasala.app" className="hover:text-blue-700">
              Contacto
            </a>
          </nav>
        </div>

        <p className="mt-6 text-xs text-slate-400">
          © {new Date().getFullYear()} PASALA. Todos los derechos reservados.
        </p>
      </PublicContainer>
    </footer>
  );
}

