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
  // Diagnostic logs: show whether cookie header is present and truncated
  try {
    const cookieHeader = req.headers.get("cookie") ?? "";
    // limit size to 1000 chars
    console.log("[MW] cookie header (truncated):", cookieHeader.substring(0, 1000));
  } catch (e) {
    console.log("[MW] error reading cookie header", e);
  }
  console.log("[MW] supabase.auth.getUser result user id:", data?.user?.id ?? null);
  const pathname = req.nextUrl.pathname;

  // Protect /player routes
  if (pathname.startsWith("/player")) {
    const isLogin = pathname === "/player/login";
    const user = data?.user ?? null;

    if (!user && !isLogin) {
      // If there is an sb-* cookie present but Supabase returned no user,
      // avoid redirecting immediately so the client can try to complete the
      // auth handshake. This is a conservative fallback for dev environments
      // where cookies may arrive but server-side session parsing fails.
      const cookieHeader = req.headers.get("cookie") ?? "";
      const hasSbCookie = /\bsb-[^=]+=/.test(cookieHeader);
      console.log("[MW] no user on getUser(), hasSbCookie:", hasSbCookie);

      if (!hasSbCookie) {
        // redirect to login when no cookie present
        const url = new URL("/player/login", req.url);
        return NextResponse.redirect(url);
      }
      // otherwise continue and let the page/client handle finalizing session
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
