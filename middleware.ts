import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { safeNextPath } from "@/lib/auth/safe-next";
import { CURRENT_PATH_HEADER } from "@/lib/auth/request-path";

export async function middleware(req: NextRequest) {
  const currentPath = `${req.nextUrl.pathname}${req.nextUrl.search}`;

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(CURRENT_PATH_HEADER, currentPath);
  const res = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh session if needed
  const { data: { user } } = await supabase.auth.getUser();

  const pathname = req.nextUrl.pathname;

  // Si el usuario está autenticado, verificar su estado de onboarding
  if (user) {
    // Solo consultar DB si estamos en rutas que nos interesan
    if (pathname.startsWith("/player") || pathname === "/welcome/onboarding") {
      const { data: player } = await supabase
        .from("players")
        .select("id, onboarding_completed, user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      const onboardingCompleted = !!player?.onboarding_completed;

      // 1. Bloquear /welcome/onboarding si ya está completo.
      // Si traia un `next`, ese es el destino: la persona venia de algun lado
      // y ya cumplio el requisito. Mandarla a /player/profile pelado tiraba la
      // intencion justo cuando dejaba de haber motivo para interrumpirla.
      if (pathname === "/welcome/onboarding" && onboardingCompleted) {
        const destino = safeNextPath(req.nextUrl.searchParams.get("next"), "/player/profile");
        return NextResponse.redirect(new URL(destino, req.url));
      }

      // 2. Forzar /welcome/onboarding si falta completarlo (excepto login o el mismo onboarding).
      // Se lleva a donde queria ir para poder devolverla al terminar:
      // OnboardingForm lee ese `next` de window.location.search.
      if (pathname.startsWith("/player") && pathname !== "/player/login" && !onboardingCompleted) {
        const onboardingUrl = new URL("/welcome/onboarding", req.url);
        onboardingUrl.searchParams.set("next", currentPath);
        return NextResponse.redirect(onboardingUrl);
      }
    }
  }

  // Protect /player routes (Anonymous check - existing logic)
  if (pathname.startsWith("/player") && !user) {
    if (pathname !== "/player/login") {
      const cookieHeader = req.headers.get("cookie") ?? "";
      const hasSbCookie = /\bsb-[^=]+=/.test(cookieHeader);

      if (!hasSbCookie) {
        const welcomeUrl = new URL("/welcome", req.url);
        welcomeUrl.searchParams.set("next", currentPath);
        return NextResponse.redirect(welcomeUrl);
      }
    }
  }

  return res;
}
export const config = {
  matcher: ["/admin/:path*", "/login", "/player/:path*", "/player", "/welcome/:path*"],
};
