import Link from "next/link";
import Logo from "../../../_components/logo";

// Lien de réinitialisation invalide/expiré (Sprint 27) — cible de
// app/login/confirmer/route.ts quand verifyOtp() échoue.
export default function LienInvalidePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <Logo />
        </div>

        <h1 className="mb-1 text-lg font-bold text-ink">Lien invalide ou expiré</h1>
        <p className="mb-6 text-sm text-slate">
          Ce lien de réinitialisation n&apos;est plus valide. Demandez-en un nouveau.
        </p>
        <Link
          href="/login/mot-de-passe-oublie"
          className="block w-full rounded bg-signal py-2 text-center text-sm font-medium text-white transition-colors hover:bg-signal-light"
        >
          Redemander un lien
        </Link>

        <p className="mt-6 text-xs text-slate">
          <Link href="/login" className="underline hover:text-ink">
            ← Retour à la connexion
          </Link>
        </p>
      </div>
    </main>
  );
}
