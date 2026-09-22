"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { repondreMessage } from "./support-actions";

export type MessageAdmin = {
  id: string;
  sujet: string;
  message: string;
  statut: string;
  reponse: string | null;
  repondu_le: string | null;
  created_at: string;
  auteur_id: string;
  repondu_par: string | null;
  auteurNom: string;
  renduParNom: string | null;
};

const CHAMP =
  "w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-signal focus:ring-1 focus:ring-signal";

const LABELS_STATUT: Record<string, string> = {
  nouveau: "Nouveau",
  en_cours: "En cours",
  resolu: "Résolu",
};

const STYLES_STATUT: Record<string, string> = {
  nouveau: "border-amber-300 bg-amber-50 text-amber-700",
  en_cours: "border-signal bg-signal-bg text-signal",
  resolu: "border-line bg-canvas text-slate",
};

function BadgeStatut({ statut }: { statut: string }) {
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${STYLES_STATUT[statut] ?? STYLES_STATUT.nouveau}`}
    >
      {LABELS_STATUT[statut] ?? statut}
    </span>
  );
}

function LigneMessage({ m }: { m: MessageAdmin }) {
  const router = useRouter();
  const [reponse, setReponse] = useState(m.reponse ?? "");
  const [statut, setStatut] = useState(m.statut);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function enregistrer() {
    setErreur(null);
    setEnvoi(true);
    const { erreur: erreurAction } = await repondreMessage(
      m.id,
      reponse,
      statut as "nouveau" | "en_cours" | "resolu"
    );
    setEnvoi(false);
    if (erreurAction) {
      setErreur(erreurAction);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded border border-line bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-sm font-medium text-ink">{m.sujet}</span>
          <span className="ml-2 text-xs text-slate">— {m.auteurNom}</span>
        </div>
        <BadgeStatut statut={m.statut} />
      </div>
      <p className="text-xs text-slate">{new Date(m.created_at).toLocaleString("fr-MA")}</p>
      <p className="whitespace-pre-wrap text-sm text-ink">{m.message}</p>

      {m.reponse && (
        <p className="text-xs text-slate">
          Répondu par {m.renduParNom ?? "—"}
          {m.repondu_le ? ` · ${new Date(m.repondu_le).toLocaleString("fr-MA")}` : ""}
        </p>
      )}

      <div className="grid gap-3 border-t border-line pt-3 sm:grid-cols-[1fr_auto]">
        <div>
          <label className="mb-1 block text-sm text-ink">Réponse</label>
          <textarea
            value={reponse}
            onChange={(e) => setReponse(e.target.value)}
            maxLength={5000}
            rows={3}
            className={CHAMP}
            placeholder="Laisser vide pour ne changer que le statut"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink">Statut</label>
          <select
            value={statut}
            onChange={(e) => setStatut(e.target.value)}
            className={CHAMP}
          >
            <option value="nouveau">Nouveau</option>
            <option value="en_cours">En cours</option>
            <option value="resolu">Résolu</option>
          </select>
        </div>
      </div>

      {erreur && (
        <p role="alert" className="text-sm text-red-700">
          {erreur}
        </p>
      )}

      <button
        onClick={enregistrer}
        disabled={envoi}
        className="rounded bg-signal px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-signal-light disabled:opacity-60"
      >
        {envoi ? "Enregistrement…" : "Enregistrer"}
      </button>
    </div>
  );
}

export default function SupportAdmin({ messagesInitiaux }: { messagesInitiaux: MessageAdmin[] }) {
  const [filtre, setFiltre] = useState<"tous" | "nouveau" | "en_cours" | "resolu">("tous");

  const filtres = useMemo(
    () =>
      filtre === "tous"
        ? messagesInitiaux
        : messagesInitiaux.filter((m) => m.statut === filtre),
    [messagesInitiaux, filtre]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded border border-line bg-white p-4">
        <label className="text-sm text-ink">Filtrer par statut</label>
        <select
          value={filtre}
          onChange={(e) => setFiltre(e.target.value as typeof filtre)}
          className={CHAMP + " w-auto"}
        >
          <option value="tous">Tous</option>
          <option value="nouveau">Nouveau</option>
          <option value="en_cours">En cours</option>
          <option value="resolu">Résolu</option>
        </select>
        <span className="text-sm text-slate">
          {filtres.length} message{filtres.length > 1 ? "s" : ""}
        </span>
      </div>

      {filtres.length === 0 ? (
        <p className="rounded border border-line bg-white p-4 text-sm text-slate">
          Aucun message pour ce filtre.
        </p>
      ) : (
        filtres.map((m) => <LigneMessage key={m.id} m={m} />)
      )}
    </div>
  );
}
