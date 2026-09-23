"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { modifierNom, changerMotDePasse } from "./profil-actions";

const CHAMP =
  "w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-signal focus:ring-1 focus:ring-signal";

export default function ProfilClient({
  nom: nomInitial,
  email,
  roleLabel,
  bureau,
}: {
  nom: string;
  email: string;
  roleLabel: string;
  bureau: string;
}) {
  const router = useRouter();
  const [nom, setNom] = useState(nomInitial);
  const [enCoursNom, setEnCoursNom] = useState(false);
  const [erreurNom, setErreurNom] = useState<string | null>(null);
  const [confirmationNom, setConfirmationNom] = useState<string | null>(null);

  const [ancienMdp, setAncienMdp] = useState("");
  const [nouveauMdp, setNouveauMdp] = useState("");
  const [confirmationMdp, setConfirmationMdp] = useState("");
  const [enCoursMdp, setEnCoursMdp] = useState(false);
  const [erreurMdp, setErreurMdp] = useState<string | null>(null);
  const [succesMdp, setSuccesMdp] = useState<string | null>(null);

  async function enregistrerNom() {
    setErreurNom(null);
    setConfirmationNom(null);
    setEnCoursNom(true);
    const { erreur } = await modifierNom(nom);
    setEnCoursNom(false);
    if (erreur) {
      setErreurNom(erreur);
      return;
    }
    setConfirmationNom("Nom mis à jour.");
    router.refresh();
  }

  async function enregistrerMdp() {
    setErreurMdp(null);
    setSuccesMdp(null);
    setEnCoursMdp(true);
    const { erreur } = await changerMotDePasse(ancienMdp, nouveauMdp, confirmationMdp);
    setEnCoursMdp(false);
    if (erreur) {
      setErreurMdp(erreur);
      return;
    }
    setAncienMdp("");
    setNouveauMdp("");
    setConfirmationMdp("");
    setSuccesMdp("Mot de passe modifié.");
  }

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-line bg-white p-5">
        <h2 className="mb-3 text-sm font-medium text-ink">Informations</h2>
        <dl className="mb-4 grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-slate">Email</dt>
          <dd className="text-ink">{email}</dd>
          <dt className="text-slate">Rôle</dt>
          <dd className="text-ink">{roleLabel}</dd>
          <dt className="text-slate">Bureau</dt>
          <dd className="text-ink">{bureau}</dd>
        </dl>
        <p className="mb-3 text-xs text-slate">
          Le rôle et le bureau sont gérés par un administrateur technique.
        </p>

        <label className="mb-1 block text-sm text-ink">Nom</label>
        <div className="flex gap-2">
          <input value={nom} onChange={(e) => setNom(e.target.value)} className={CHAMP} />
          <button
            onClick={enregistrerNom}
            disabled={enCoursNom || !nom.trim() || nom === nomInitial}
            className="whitespace-nowrap rounded bg-signal px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-signal-light disabled:opacity-60"
          >
            {enCoursNom ? "…" : "Enregistrer"}
          </button>
        </div>
        {erreurNom && <p className="mt-2 text-sm text-error">{erreurNom}</p>}
        {confirmationNom && <p className="mt-2 text-sm text-signal">{confirmationNom}</p>}
      </div>

      <div className="rounded-md border border-line bg-white p-5">
        <h2 className="mb-3 text-sm font-medium text-ink">Changer le mot de passe</h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-ink">Mot de passe actuel</label>
            <input
              type="password"
              value={ancienMdp}
              onChange={(e) => setAncienMdp(e.target.value)}
              className={CHAMP}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-ink">Nouveau mot de passe</label>
            <input
              type="password"
              value={nouveauMdp}
              onChange={(e) => setNouveauMdp(e.target.value)}
              minLength={6}
              className={CHAMP}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-ink">Confirmer le nouveau mot de passe</label>
            <input
              type="password"
              value={confirmationMdp}
              onChange={(e) => setConfirmationMdp(e.target.value)}
              minLength={6}
              className={CHAMP}
            />
          </div>
          {erreurMdp && <p className="text-sm text-error">{erreurMdp}</p>}
          {succesMdp && <p className="text-sm text-signal">{succesMdp}</p>}
          <button
            onClick={enregistrerMdp}
            disabled={enCoursMdp || !ancienMdp || !nouveauMdp || !confirmationMdp}
            className="rounded bg-signal px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-signal-light disabled:opacity-60"
          >
            {enCoursMdp ? "Enregistrement…" : "Changer le mot de passe"}
          </button>
        </div>
      </div>
    </div>
  );
}
