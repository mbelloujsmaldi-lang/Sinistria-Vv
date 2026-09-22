import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // httpOnly (Sprint 22) : le même cookieOptions doit être passé à
      // CHAQUE site d'appel de createServerClient/createBrowserClient — rien
      // n'est partagé entre instances (@supabase/ssr, cookies.js : options
      // fusionnées avec DEFAULT_COOKIE_OPTIONS localement à chaque appel).
      // proxy.ts a son propre appel séparé, à aligner de la même façon.
      cookieOptions: { httpOnly: true, secure: true },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Appelé depuis un Server Component : peut être ignoré si
            // proxy.ts rafraîchit déjà la session sur chaque requête.
          }
        },
      },
    }
  );
}
