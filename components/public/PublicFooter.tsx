import Link from "next/link";
import { PublicContainer } from "@/components/public/PublicContainer";
import { PublicContactModal } from "@/components/public/PublicContactModal";

export function PublicFooter() {
  return (
    <footer style={{ background: "#080808", borderTop: "1px solid rgba(240,237,230,0.08)" }}>
      <PublicContainer className="py-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p
              className="font-serif text-xl font-bold italic tracking-tight"
              style={{ color: "#F0EDE6" }}
            >
              PASALA
            </p>
            <p className="text-sm" style={{ color: "rgba(240,237,230,0.45)" }}>
              El pádel no termina cuando termina el partido.
            </p>
            <p className="text-xs" style={{ color: "rgba(240,237,230,0.3)" }}>
              Patagonia argentina
            </p>
          </div>

          <div className="flex flex-col gap-6 sm:flex-row sm:gap-12">
            <div className="space-y-3">
              <p
                className="text-[10px] font-black uppercase tracking-[0.18em]"
                style={{ color: "rgba(240,237,230,0.3)" }}
              >
                Plataforma
              </p>
              <div className="flex flex-col gap-2">
                {[
                  { href: "/players", label: "Jugadores" },
                  { href: "/clubs", label: "Clubes" },
                  { href: "/pricing", label: "Precios" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-sm transition-colors"
                    style={{ color: "rgba(240,237,230,0.5)" }}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p
                className="text-[10px] font-black uppercase tracking-[0.18em]"
                style={{ color: "rgba(240,237,230,0.3)" }}
              >
                Info
              </p>
              <div className="flex flex-col gap-2">
                <Link
                  href="/faq"
                  className="text-sm transition-colors"
                  style={{ color: "rgba(240,237,230,0.5)" }}
                >
                  FAQ
                </Link>
                <Link
                  href="/terms"
                  className="text-sm transition-colors"
                  style={{ color: "rgba(240,237,230,0.5)" }}
                >
                  Términos
                </Link>
                <Link
                  href="/privacy"
                  className="text-sm transition-colors"
                  style={{ color: "rgba(240,237,230,0.5)" }}
                >
                  Privacidad
                </Link>
                <PublicContactModal
                  buttonClassName="text-sm text-left transition-colors"
                  buttonStyle={{ color: "rgba(240,237,230,0.5)" }}
                />
              </div>
            </div>
          </div>
        </div>

        <div
          className="mt-8 border-t pt-6"
          style={{ borderColor: "rgba(240,237,230,0.08)" }}
        >
          <p className="text-xs" style={{ color: "rgba(240,237,230,0.25)" }}>
            © {new Date().getFullYear()} PASALA. Todos los derechos reservados. · General Roca, Río Negro.
          </p>
        </div>
      </PublicContainer>
    </footer>
  );
}
