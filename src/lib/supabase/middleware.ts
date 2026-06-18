import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Read the session from the cookie and keep it in sync. We deliberately use
  // getSession() (local JWT decode, only hits the network to rotate an expired
  // token) rather than getUser() (a network round-trip to Supabase Auth on
  // *every* request, including every RSC fetch). The redirect below is just a
  // UX gate — actual data access is authorized by RLS, which verifies the JWT
  // signature server-side on every query, so a forged cookie reads nothing.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;

  const path = request.nextUrl.pathname;
  const isAuthRoute = path.startsWith("/login") || path.startsWith("/auth");
  // Public routes accessible without a session: the marketing landing page and
  // the SEO / crawler files (these must never redirect to /login).
  const isPublicRoute =
    path === "/" ||
    path === "/robots.txt" ||
    path === "/sitemap.xml" ||
    path === "/manifest.webmanifest";

  if (!user && !isAuthRoute && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/boards";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
