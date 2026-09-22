import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Renommé de middleware.ts vers proxy.ts (convention Next.js 16 :
// "Middleware" est désormais appelé "Proxy", même fonctionnement).
export default async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // httpOnly (Sprint 22) : appel createServerClient totalement séparé de
      // lib/supabase/server.ts (contexte middleware, pas Server Component) —
      // le même cookieOptions doit être répété ici, sinon le rafraîchissement
      // du jeton que ce proxy déclenche à chaque requête réécrirait le
      // cookie en httpOnly:false (DEFAULT_COOKIE_OPTIONS), annulant la
      // protection posée à la connexion.
      cookieOptions: { httpOnly: true, secure: true },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = request.nextUrl.pathname.startsWith("/login");

  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Compte désactivé (actif=false) ou sans profil : accès refusé sur chaque
  // page, session révoquée. `actif` n'était appliqué nulle part avant le
  // Sprint 13. (Limite connue : un jeton déjà émis reste valable jusqu'à
  // 1 h pour des appels directs à l'API Supabase ; le blocage côté Auth
  // empêche en revanche toute nouvelle connexion et tout renouvellement.)
  if (user && !isLoginPage) {
    const { data: profil } = await supabase
      .from("profiles")
      .select("actif")
      .eq("id", user.id)
      .maybeSingle();
    if (!profil || !profil.actif) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = `?motif=${profil ? "desactive" : "sans_profil"}`;
      const redirection = NextResponse.redirect(url);
      // Reporter les cookies de session effacés par signOut().
      supabaseResponse.cookies.getAll().forEach((c) => redirection.cookies.set(c));
      return redirection;
    }
  }

  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

// /api est exclu : ces routes n'ont pas de session Supabase (appels
// serveur-à-serveur authentifiés par leur propre clé, ex. VV_API_KEY sur
// /api/calculer) et gèrent elles-mêmes leur autorisation.
// /verifier est exclu : page de vérification publique (Sprint 9), sans
// authentification par conception (accessible via le QR code de la fiche
// PDF) — sinon ce proxy la rediriger vers /login pour tout visiteur non
// connecté, ce qui viderait la fonctionnalité de son sens.
// Les fichiers statiques (logo, icône/favicon) sont exclus : la page de
// connexion les charge sans session, ils ne doivent pas être redirigés
// vers /login.
export const config = {
  matcher: [
    "/((?!api|verifier|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
