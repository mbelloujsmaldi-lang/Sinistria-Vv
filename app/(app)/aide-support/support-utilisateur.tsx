"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { envoyerMessage } from "./support-actions";

export type MessageUtilisateur = {
  id: string;
  sujet: string;
  message: string;
  statut: string;
  reponse: string | null;
  repondu_le: string | null;
  created_at: string;
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

export default function SupportUtilisateur({
  messagesInitiaux,
}: {
  messagesInitiaux: MessageUtilisateur[];
}) {
  const router = useRouter();
  const [sujet, setSujet] = useState("");
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    const { erreur: erreurAction } = await envoyerMessage(sujet, message);
    setEnvoi(false);
    if (erreurAction) {
      setErreur(erreurAction);
      return;
    }
    setSujet("");
    setMessage("");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded border border-line bg-white p-5"
      >
        <div>
          <label className="mb-1 block text-sm text-ink">Sujet</label>
          <input
            value={sujet}
            onChange={(e) => setSujet(e.target.value)}
            maxLength={200}
            required
            className={CHAMP}
            placeholder="Ex. Problème d'affichage sur la fiche PDF"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={5000}
            required
            rows={4}
            className={CHAMP}
            placeholder="Décrivez votre problème ou votre question"
          />
        </div>
        {erreur && (
          <p role="alert" className="text-sm text-red-700">
            {erreur}
          </p>
        )}
        <button
          type="submit"
          disabled={envoi}
          className="rounded bg-signal px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-signal-light disabled:opacity-60"
        >
          {envoi ? "Envoi en cours…" : "Envoyer"}
        </button>
      </form>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-ink">Mes messages</h3>
        {messagesInitiaux.length === 0 ? (
          <p className="rounded border border-line bg-white p-4 text-sm text-slate">
            Aucun message envoyé pour le moment.
          </p>
        ) : (
          messagesInitiaux.map((m) => (
            <div key={m.id} className="space-y-2 rounded border border-line bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-ink">{m.sujet}</span>
                <BadgeStatut statut={m.statut} />
              </div>
              <p className="text-xs text-slate">
                {new Date(m.created_at).toLocaleString("fr-MA")}
              </p>
              <p className="whitespace-pre-wrap text-sm text-ink">{m.message}</p>
              {m.reponse && (
                <div className="mt-2 rounded border border-signal bg-signal-bg p-3">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-signal">
                    Réponse{m.repondu_le ? ` · ${new Date(m.repondu_le).toLocaleString("fr-MA")}` : ""}
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-ink">{m.reponse}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
