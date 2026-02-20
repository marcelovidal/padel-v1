import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

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

      // 1. Bloquear /welcome/onboarding si ya está completo
      if (pathname === "/welcome/onboarding" && onboardingCompleted) {
        return NextResponse.redirect(new URL("/player/profile", req.url));
      }

      // 2. Forzar /welcome/onboarding si falta completarlo (excepto login o el mismo onboarding)
      if (pathname.startsWith("/player") && pathname !== "/player/login" && !onboardingCompleted) {
        return NextResponse.redirect(new URL("/welcome/onboarding", req.url));
      }
    }
  }

  // Protect /player routes (Anonymous check - existing logic)
  if (pathname.startsWith("/player") && !user) {
    if (pathname !== "/player/login") {
      const cookieHeader = req.headers.get("cookie") ?? "";
      const hasSbCookie = /\bsb-[^=]+=/.test(cookieHeader);

      if (!hasSbCookie) {
        const next = encodeURIComponent(`${req.nextUrl.pathname}${req.nextUrl.search}`);
        return NextResponse.redirect(new URL(`/welcome?next=${next}`, req.url));
      }
    }
  }

  return res;
}
export const config = {
  matcher: ["/admin/:path*", "/login", "/player/:path*", "/player", "/welcome/:path*"],
};
