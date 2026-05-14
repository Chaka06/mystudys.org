import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/", "/login", "/register", "/verify-otp",
  "/forgot-password", "/reset-password",
  "/about", "/privacy", "/terms", "/contact",
];

// Pages où un utilisateur DÉJÀ connecté avec un profil complet
// n'a rien à faire → rediriger vers /feed
// NOTE : /verify-otp est intentionnellement ABSENT —
// la vérification OTP crée la session pendant que l'utilisateur
// est sur cette page, donc on ne peut pas la rediriger en cours de process
const REDIRECT_IF_AUTHED = ["/login", "/register"];

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

  // getSession() lit le cookie JWT localement — pas d'appel réseau
  // Les cookies fraîchement écrits par verifyOtp() sont déjà dans la requête
  const { data: { session } } = await supabase.auth.getSession();

  const path = request.nextUrl.pathname;

  // Helper : redirection en préservant les cookies Supabase
  const redirect = (pathname: string, params?: Record<string, string>) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    const res = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      res.cookies.set(cookie.name, cookie.value, cookie as any);
    });
    return res;
  };

  // Visiteur non connecté sur une page protégée → /login
  if (!session && !PUBLIC_PATHS.some((p) => path === p || path.startsWith("/api/"))) {
    return redirect("/login", { redirectTo: path });
  }

  // Utilisateur déjà connecté sur login/register → /feed
  // ⚠️ /verify-otp est exclu : la session peut être créée pendant la vérification
  if (session && REDIRECT_IF_AUTHED.includes(path)) {
    return redirect("/feed");
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
