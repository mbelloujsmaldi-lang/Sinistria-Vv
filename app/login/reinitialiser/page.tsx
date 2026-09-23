"use client";

import { useActionState } from "react";
import Link from "next/link";
import { confirmerCode, type EtatConfirmation } from "../reset-actions";
import Logo from "../../_components/logo";

const ETAT_INITIAL: EtatConfirmation = { erreur: null };

export default function ReinitialiserPage() {
  const [etat, action, enCours] = useActionState(confirmerCode, ETAT_INITIAL);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <Logo />
        </div>

        <h1 className="mb-1 text-lg font-bold text-ink">Réinitialiser le mot de passe</h1>
        <p className="mb-6 text-sm text-slate">
          Saisissez le code reçu par e-mail et votre nouveau mot de passe.
        </p>

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

          <div>
            <label htmlFor="code" className="mb-1 block text-sm text-ink">
              Code reçu (6 chiffres)
            </label>
            <input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              className="w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-signal focus:ring-1 focus:ring-signal"
              placeholder="123456"
            />
          </div>

          <div>
            <label htmlFor="nouveauMdp" className="mb-1 block text-sm text-ink">
              Nouveau mot de passe
            </label>
            <input
              id="nouveauMdp"
              name="nouveauMdp"
              type="password"
              required
              minLength={6}
              className="w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-signal focus:ring-1 focus:ring-signal"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="confirmation" className="mb-1 block text-sm text-ink">
              Confirmer le mot de passe
            </label>
            <input
              id="confirmation"
              name="confirmation"
              type="password"
              required
              minLength={6}
              className="w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-signal focus:ring-1 focus:ring-signal"
              placeholder="••••••••"
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
            {enCours ? "Vérification…" : "Réinitialiser le mot de passe"}
          </button>
        </form>

        <p className="mt-6 text-xs text-slate">
          <Link href="/login/mot-de-passe-oublie" className="underline hover:text-ink">
            ← Renvoyer un code
          </Link>
        </p>
      </div>
    </main>
  );
}
