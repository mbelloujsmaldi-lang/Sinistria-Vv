"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { soumettre as soumettreAction, valider as validerAction, rejeter as rejeterAction } from "./server-actions";
import { peutValider, type UserRole } from "@/lib/roles";

const CHAMP =
  "w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-signal focus:ring-1 focus:ring-signal";

interface Props {
  calculId: string;
  statut: string;
  valeurCalculee: number;
  creePar: string | null;
  userId: string;
  role: UserRole | null;
}

export default function ActionsVV({
  calculId,
  statut,
  valeurCalculee,
  creePar,
  userId,
  role,
}: Props) {
  const router = useRouter();

  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [valeurDefinitive, setValeurDefinitive] = useState(String(valeurCalculee));
  const [justification, setJustification] = useState("");
  const [motifRejet, setMotifRejet] = useState("");
  const [afficherRejet, setAfficherRejet] = useState(false);

  async function soumettre() {
    setErreur(null);
    setChargement(true);
    const { erreur: erreurAction } = await soumettreAction(calculId);

    if (erreurAction) {
      setErreur(erreurAction);
      setChargement(false);
      return;
    }

    setChargement(false);
    router.refresh();
  }

  async function valider() {
    setErreur(null);
    setChargement(true);

    const vd = Number(valeurDefinitive);
    const { erreur: erreurAction } = await validerAction(calculId, valeurCalculee, vd, justification);

    if (erreurAction) {
      setErreur(erreurAction);
      setChargement(false);
      return;
    }

    setChargement(false);
    router.refresh();
  }

  async function rejeter() {
    if (!motifRejet.trim()) {
      setErreur("Le motif de rejet est requis.");
      return;
    }
    setErreur(null);
    setChargement(true);

    const { erreur: erreurAction } = await rejeterAction(calculId, motifRejet);

    if (erreurAction) {
      setErreur(erreurAction);
      setChargement(false);
      return;
    }

    setChargement(false);
    router.refresh();
  }

  const estCreateur = userId === creePar;
  const peutValiderCeCalcul = peutValider(role);

  if (statut === "calcule" && estCreateur) {
    return (
      <div className="mt-6 border-t border-line pt-4">
        {erreur && <p className="mb-2 text-sm text-red-700">{erreur}</p>}
        <button
          onClick={soumettre}
          disabled={chargement}
          className="rounded bg-signal px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-signal-light disabled:opacity-60"
        >
          {chargement ? "Envoi en cours…" : "Soumettre à validation"}
        </button>
      </div>
    );
  }

  if (statut === "soumis" && peutValiderCeCalcul) {
    return (
      <div className="mt-6 space-y-4 border-t border-line pt-4">
        {erreur && <p className="text-sm text-red-700">{erreur}</p>}

        {!afficherRejet ? (
          <>
            <div>
              <label className="mb-1 block text-sm text-ink">Valeur définitive (DH)</label>
              <input
                type="number"
                step="0.01"
                value={valeurDefinitive}
                onChange={(e) => setValeurDefinitive(e.target.value)}
                className={CHAMP}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-ink">
                Justification de l&apos;écart (optionnel)
              </label>
              <input
                type="text"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                className={CHAMP}
                placeholder="Ex. Ajustage prix marché"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={valider}
                disabled={chargement}
                className="rounded bg-signal px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-signal-light disabled:opacity-60"
              >
                {chargement ? "Validation en cours…" : "Valider"}
              </button>
              <button
                onClick={() => setAfficherRejet(true)}
                className="rounded border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-slate-50"
              >
                Retourner pour correction
              </button>
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="mb-1 block text-sm text-ink">Motif du rejet</label>
              <input
                type="text"
                value={motifRejet}
                onChange={(e) => setMotifRejet(e.target.value)}
                className={CHAMP}
                placeholder="Ex. Manque carte grise définitive"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={rejeter}
                disabled={chargement}
                className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {chargement ? "Envoi en cours…" : "Confirmer le rejet"}
              </button>
              <button
                onClick={() => setAfficherRejet(false)}
                className="rounded border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-slate-50"
              >
                Annuler
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return null;
}
