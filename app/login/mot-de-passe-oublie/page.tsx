"use client";

import { useActionState } from "react";
import Link from "next/link";
import { demanderLien, type EtatDemande } from "../reset-actions";
import Logo from "../../_components/logo";

const ETAT_INITIAL: EtatDemande = { erreur: null, envoye: false };

export default function MotDePasseOubliePage() {
  const [etat, action, enCours] = useActionState(demanderLien, ETAT_INITIAL);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <Logo />
        </div>

        <h1 className="mb-1 text-lg font-bold text-ink">Mot de passe oublié</h1>
        <p className="mb-6 text-sm text-slate">
          Indiquez votre e-mail professionnel : un lien de réinitialisation vous sera envoyé.
        </p>

        {etat.envoye ? (
          <p className="rounded border border-signal bg-signal-bg px-3 py-2 text-sm text-signal">
            Si ce compte existe, un e-mail avec un lien de réinitialisation a été envoyé.
          </p>
        ) : (
          <form action={action} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm text-ink">
                Email professionnel
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-signal focus:ring-1 focus:ring-signal"
                placeholder="nom@bureau.ma"
              />
            </div>

            {etat.erreur && (
              <p role="alert" className="text-sm text-error">
                {etat.erreur}
              </p>
            )}

            <button
              type="submit"
              disabled={enCours}
              className="w-full rounded bg-signal py-2 text-sm font-medium text-white transition-colors hover:bg-signal-light disabled:opacity-60"
            >
              {enCours ? "Envoi en cours…" : "Recevoir le lien"}
            </button>
          </form>
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
