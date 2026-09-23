"use client";

import { useActionState } from "react";
import { definirNouveauMotDePasse, type EtatNouveauMdp } from "../reset-actions";

const ETAT_INITIAL: EtatNouveauMdp = { erreur: null };

export default function NouveauMotDePasseForm() {
  const [etat, action, enCours] = useActionState(definirNouveauMotDePasse, ETAT_INITIAL);

  return (
    <form action={action} className="space-y-4">
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
        {enCours ? "Enregistrement…" : "Définir le mot de passe"}
      </button>
    </form>
  );
}
