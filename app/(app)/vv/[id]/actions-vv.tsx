"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { soumettre as soumettreAction, valider as validerAction, rejeter as rejeterAction } from "./server-actions";
import { peutValider, type UserRole } from "@/lib/roles";
import { IconEnvoyer, IconValider, IconRejeter } from "../../nav-icons";

const CHAMP =
  "w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-signal focus:ring-1 focus:ring-signal disabled:bg-canvas disabled:text-slate";

interface Props {
  calculId: string;
  statut: string;
  valeurCalculee: number;
  creePar: string | null;
  userId: string;
  role: UserRole | null;
}

// Onglet "Validation" (Sprint 27 ; Sprint 31 point 2) — le bouton de
// l'étape EN COURS reste visible pour tout participant, même quand son
// rôle ne permet pas de l'actionner : désactivé + info-bulle expliquant
// pourquoi, plutôt que masqué (ancien comportement — une case vide ne dit
// pas si l'étape existe et à qui elle revient).
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

  if (statut === "calcule") {
    const desactive = !estCreateur || chargement;
    return (
      <div>
        {erreur && <p className="mb-2 text-sm text-red-700">{erreur}</p>}
        <button
          onClick={soumettre}
          disabled={desactive}
          title={!estCreateur ? "Seul le créateur du dossier peut le soumettre à validation." : undefined}
          className="inline-flex items-center gap-2 rounded bg-signal px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-signal-light disabled:cursor-not-allowed disabled:bg-line disabled:text-slate disabled:hover:bg-line"
        >
          <IconEnvoyer className="h-4 w-4 shrink-0" />
          {chargement ? "Envoi en cours…" : "Soumettre à validation"}
        </button>
        {!estCreateur && (
          <p className="mt-2 text-xs text-slate">
            En attente de soumission par le créateur du dossier.
          </p>
        )}
      </div>
    );
  }

  if (statut === "soumis") {
    const desactive = !peutValiderCeCalcul || chargement;
    const titreDesactive = !peutValiderCeCalcul
      ? "Rôle insuffisant pour valider (Responsable et au-dessus requis)."
      : undefined;

    return (
      <div className="space-y-4">
        {erreur && <p className="text-sm text-red-700">{erreur}</p>}
        {!peutValiderCeCalcul && (
          <p className="text-xs text-slate">
            En attente de décision par un validateur (Responsable et au-dessus).
          </p>
        )}

        {!afficherRejet ? (
          <>
            <div>
              <label className="mb-1 block text-sm text-ink">Valeur définitive (DH)</label>
              <input
                type="number"
                step="0.01"
                value={valeurDefinitive}
                onChange={(e) => setValeurDefinitive(e.target.value)}
                disabled={desactive}
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
                disabled={desactive}
                className={CHAMP}
                placeholder="Ex. Ajustage prix marché"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={valider}
                disabled={desactive}
                title={titreDesactive}
                className="inline-flex items-center gap-2 rounded bg-signal px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-signal-light disabled:cursor-not-allowed disabled:bg-line disabled:text-slate disabled:hover:bg-line"
              >
                <IconValider className="h-4 w-4 shrink-0" />
                {chargement ? "Validation en cours…" : "Valider"}
              </button>
              <button
                onClick={() => setAfficherRejet(true)}
                disabled={!peutValiderCeCalcul}
                title={titreDesactive}
                className="inline-flex items-center gap-2 rounded border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate disabled:hover:bg-transparent"
              >
                <IconRejeter className="h-4 w-4 shrink-0" />
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
                disabled={desactive}
                title={titreDesactive}
                className="inline-flex items-center gap-2 rounded bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-line disabled:text-slate disabled:hover:bg-line"
              >
                <IconRejeter className="h-4 w-4 shrink-0" />
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

  return (
    <p className="text-sm text-slate">
      Aucune action de validation en attente à ce stade (statut « {statut} »).
    </p>
  );
}
