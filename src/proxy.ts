import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/", "/login", "/register", "/verify-otp",
  "/forgot-password", "/reset-password",
  "/about", "/privacy", "/terms", "/contact",
];
const AUTH_PATHS = ["/login", "/register", "/verify-otp"];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          );
        },
      },
    }
  );

  // getSession() lit le cookie JWT localement — pas d'appel réseau (~0ms)
  // Suffisant pour les redirections. Les routes sensibles utilisent getUser() côté serveur.
  const { data: { session } } = await supabase.auth.getSession();

  const path = request.nextUrl.pathname;

  // Rediriger les visiteurs non connectés hors des pages publiques
  if (!session && !PUBLIC_PATHS.some((p) => path === p || path.startsWith("/api/"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", path);
    return NextResponse.redirect(url);
  }

  // Rediriger les utilisateurs déjà connectés hors des pages d'auth
  if (session && AUTH_PATHS.includes(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/feed";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
