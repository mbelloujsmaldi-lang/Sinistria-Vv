import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

// Cible du lien de réinitialisation (Sprint 27) — DOIT être un Route
// Handler, pas une page (Server Component) : verifyOtp() a besoin
// d'écrire le cookie de session, et Next.js interdit d'écrire des cookies
// pendant le rendu d'un Server Component (seulement Server Actions et
// Route Handlers) — lib/supabase/server.ts avale cette erreur en
// silence (pensé pour tolérer un Server Component qui ne fait que LIRE la
// session), ce qui masquait le problème : verifyOtp() "réussissait" mais
// la session n'était jamais réellement persistée. Constaté par test réel
// (lien valide généré via admin.generateLink, session absente juste
// après) avant ce correctif.
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = (request.nextUrl.searchParams.get("type") as EmailOtpType | null) ?? "recovery";

  if (tokenHash) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      return NextResponse.redirect(new URL("/login/nouveau-mot-de-passe", request.url));
    }
  }

  return NextResponse.redirect(new URL("/login/confirmer/invalide", request.url));
}
