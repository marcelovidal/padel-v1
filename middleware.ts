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
  const { data } = await supabase.auth.getUser();
  const pathname = req.nextUrl.pathname;

  // Protect /player routes
  if (pathname.startsWith("/player")) {
    const isLogin = pathname === "/player/login";
    const user = data?.user ?? null;

    if (!user && !isLogin) {
      // redirect to login
      const url = new URL("/player/login", req.url);
      return NextResponse.redirect(url);
    }

    if (user && isLogin) {
      // already logged in -> redirect to /player
      const url = new URL("/player", req.url);
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/login", "/player/:path*", "/player"],
};
