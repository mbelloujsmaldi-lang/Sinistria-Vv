import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Logo from "../../_components/logo";
import NouveauMotDePasseForm from "./nouveau-mot-de-passe-form";

// Formulaire de nouveau mot de passe (Sprint 27) — atteint uniquement
// après que app/login/confirmer/route.ts a validé le lien ET établi la
// session (cookie httpOnly). Un Server Component peut LIRE cette session
// sans problème (seule l'écriture de cookies est interdite ici) — vérifie
// juste qu'une session existe avant d'afficher le formulaire.
export default async function NouveauMotDePassePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <Logo />
        </div>

        {user ? (
          <>
            <h1 className="mb-1 text-lg font-bold text-ink">Nouveau mot de passe</h1>
            <p className="mb-6 text-sm text-slate">Choisissez votre nouveau mot de passe.</p>
            <NouveauMotDePasseForm />
          </>
        ) : (
          <>
            <h1 className="mb-1 text-lg font-bold text-ink">Session expirée</h1>
            <p className="mb-6 text-sm text-slate">
              Redemandez un lien de réinitialisation.
            </p>
            <Link
              href="/login/mot-de-passe-oublie"
              className="block w-full rounded bg-signal py-2 text-center text-sm font-medium text-white transition-colors hover:bg-signal-light"
            >
              Redemander un lien
            </Link>
          </>
        )}

        <p className="mt-6 text-xs text-slate">
          <Link href="/login" className="underline hover:text-ink">
            ← Retour à la connexion
          </Link>
        </p>
      </div>
    </main>
  );
}
