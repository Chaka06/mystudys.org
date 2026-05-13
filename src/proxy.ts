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

  // IMPORTANT : getSession() peut rafraîchir le token et appeler setAll()
  // Les nouveaux cookies DOIVENT être copiés sur la réponse de redirection
  // sinon le navigateur ne reçoit jamais le token rafraîchi → boucle infinie
  const { data: { session } } = await supabase.auth.getSession();

  const path = request.nextUrl.pathname;

  // Helper : crée une redirection en préservant les cookies Supabase
  const redirect = (pathname: string, params?: Record<string, string>) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    const res = NextResponse.redirect(url);
    // Copier tous les cookies Supabase (token rafraîchi inclus)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      res.cookies.set(cookie.name, cookie.value, cookie as any);
    });
    return res;
  };

  // Visiteur non connecté sur une page protégée → /login
  if (!session && !PUBLIC_PATHS.some((p) => path === p || path.startsWith("/api/"))) {
    return redirect("/login", { redirectTo: path });
  }

  // Utilisateur connecté sur une page d'auth → /feed
  if (session && AUTH_PATHS.includes(path)) {
    return redirect("/feed");
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
