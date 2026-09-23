"use client";

import { useActionState, useEffect, useState } from "react";
import { connecter, type EtatConnexion } from "./actions";
import Logo from "../_components/logo";

const ETAT_INITIAL: EtatConnexion = { erreur: null };

export default function LoginPage() {
  const [etat, action, enCours] = useActionState(connecter, ETAT_INITIAL);
  const [motifErreur, setMotifErreur] = useState<string | null>(null);

  // Motif de redirection posé par proxy.ts (compte désactivé / sans profil).
  useEffect(() => {
    const motif = new URLSearchParams(window.location.search).get("motif");
    if (motif === "desactive") {
      setMotifErreur("Ce compte est désactivé. Contactez un administrateur.");
    } else if (motif === "sans_profil") {
      setMotifErreur("Ce compte n'est pas autorisé à accéder à l'application.");
    }
  }, []);

  const erreur = etat.erreur ?? motifErreur;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <Logo />
        </div>

        <h1 className="mb-1 text-lg font-bold text-ink">Connexion</h1>
        <p className="mb-6 text-sm text-slate">
          Accédez au module de calcul de la valeur vénale.
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
            <label htmlFor="password" className="mb-1 block text-sm text-ink">
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-signal focus:ring-1 focus:ring-signal"
              placeholder="••••••••"
            />
          </div>

          {erreur && (
            <p role="alert" className="text-sm text-red-700">
              {erreur}
            </p>
          )}

          <button
            type="submit"
            disabled={enCours}
            className="w-full rounded bg-signal py-2 text-sm font-medium text-white transition-colors hover:bg-signal-light disabled:opacity-60"
          >
            {enCours ? "Connexion en cours…" : "Se connecter"}
          </button>
        </form>
      </div>
    </main>
  );
}
