"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { connecter, type EtatConnexion } from "./actions";
import Logo from "../_components/logo";

const ETAT_INITIAL: EtatConnexion = { erreur: null };

export default function LoginPage() {
  const [etat, action, enCours] = useActionState(connecter, ETAT_INITIAL);
  const [motifErreur, setMotifErreur] = useState<string | null>(null);
  const [suivante, setSuivante] = useState("");
  const [motDePasseVisible, setMotDePasseVisible] = useState(false);

  // Motif de redirection posé par proxy.ts (compte désactivé / sans profil)
  // et destination d'origine ("next", Sprint 33 — lien "Accéder au
  // dossier" depuis /verifier, ou toute page protégée visitée sans
  // session) : transmise via un champ caché, pas relue depuis l'URL côté
  // Server Action (qui ne voit que le FormData soumis).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const motif = params.get("motif");
    if (motif === "desactive") {
      setMotifErreur("Ce compte est désactivé. Contactez un administrateur.");
    } else if (motif === "sans_profil") {
      setMotifErreur("Ce compte n'est pas autorisé à accéder à l'application.");
    }
    const next = params.get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) setSuivante(next);
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
          <input type="hidden" name="next" value={suivante} />
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
            <div className="relative">
              <input
                id="password"
                name="password"
                type={motDePasseVisible ? "text" : "password"}
                required
                className="w-full rounded border border-line bg-white px-3 py-2 pr-10 text-sm text-ink outline-none focus:border-signal focus:ring-1 focus:ring-signal"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setMotDePasseVisible((v) => !v)}
                aria-label={motDePasseVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-slate hover:text-ink"
              >
                {motDePasseVisible ? <IconOeilBarre /> : <IconOeil />}
              </button>
            </div>
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

        <p className="mt-4 text-center text-xs text-slate">
          <Link href="/login/mot-de-passe-oublie" className="underline hover:text-ink">
            Mot de passe oublié ?
          </Link>
        </p>
      </div>
    </main>
  );
}

function IconOeil() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4 shrink-0">
      <path d="M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6Z" strokeLinejoin="round" />
      <circle cx="10" cy="10" r="2.3" />
    </svg>
  );
}

function IconOeilBarre() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4 shrink-0">
      <path
        d="M2.5 2.5l15 15M8.3 5.1C8.85 4.9 9.42 4.8 10 4.8c5.5 0 8.5 5.2 8.5 5.2a15 15 0 0 1-3.1 3.7M5.9 6.1A14.9 14.9 0 0 0 1.5 10s3 5.2 8.5 5.2c1.1 0 2.1-.2 3-.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8.1 8.2A2.3 2.3 0 0 0 10 12.3c.5 0 .95-.15 1.35-.4" strokeLinecap="round" />
    </svg>
  );
}
