"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { publierAnnonce } from "./annonces-actions";

// Composition d'annonce (Sprint 27) — admin_technique uniquement (garde
// serveur : la page ne rend ce composant que pour ce rôle, et la RLS
// bureau_annonces_insert refait le contrôle indépendamment).
export default function AnnonceForm({ bureaux }: { bureaux: string[] }) {
  const router = useRouter();
  const [bureau, setBureau] = useState("");
  const [titre, setTitre] = useState("");
  const [corps, setCorps] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  async function publier() {
    setErreur(null);
    setEnvoi(true);
    const { erreur: erreurAction } = await publierAnnonce(bureau, titre, corps);
    setEnvoi(false);
    if (erreurAction) {
      setErreur(erreurAction);
      return;
    }
    setTitre("");
    setCorps("");
    setConfirmation(`Annonce publiée pour le bureau « ${bureau} ».`);
    setTimeout(() => setConfirmation(null), 3000);
    router.refresh();
  }

  const champ =
    "w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-signal focus:ring-1 focus:ring-signal";

  return (
    <div className="mb-6 rounded-md border border-line bg-white p-5">
      <h2 className="mb-3 text-sm font-medium text-ink">Publier une annonce</h2>
      {erreur && <p className="mb-2 text-sm text-error">{erreur}</p>}
      {confirmation && <p className="mb-2 text-sm text-signal">{confirmation}</p>}
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm text-ink">Bureau destinataire</label>
          <input
            list="bureaux-existants"
            value={bureau}
            onChange={(e) => setBureau(e.target.value)}
            className={champ}
            placeholder="Ex. Casablanca"
          />
          <datalist id="bureaux-existants">
            {bureaux.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
          <p className="mt-1 text-xs text-slate">
            Doit correspondre exactement au bureau tel qu&apos;enregistré sur les comptes (texte libre —
            préférez la liste suggérée pour éviter un écart de saisie).
          </p>
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink">Titre</label>
          <input value={titre} onChange={(e) => setTitre(e.target.value)} className={champ} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink">Message</label>
          <textarea value={corps} onChange={(e) => setCorps(e.target.value)} rows={3} className={champ} />
        </div>
        <button
          onClick={publier}
          disabled={envoi || !bureau.trim() || !titre.trim() || !corps.trim()}
          className="rounded bg-signal px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-signal-light disabled:opacity-60"
        >
          {envoi ? "Publication…" : "Publier"}
        </button>
      </div>
    </div>
  );
}
