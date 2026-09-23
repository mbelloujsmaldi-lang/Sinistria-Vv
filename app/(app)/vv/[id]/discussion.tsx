"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { envoyerMessageDossier, marquerDiscussionLue } from "./discussion-actions";
import type { MessageDossier } from "@/lib/messagerie";
import { IconEnvoyer } from "../../nav-icons";

// Discussion par dossier (Sprint 27 ; accusés de lecture Sprint 31) —
// remplace le système "proposition d'e-mail" de l'ancien Google Apps
// Script. Messages système (posés par soumettre/valider/rejeter/réviser)
// rendus en italique neutre, messages libres en bulle. N'est rendu QUE
// pour les participants (créateur + validateurs) — un non-participant ne
// verrait de toute façon rien via la RLS (0019), mieux vaut ne pas
// afficher une section vide trompeuse. Le marquage "lu" lui-même se fait
// côté serveur (page.tsx, à l'ouverture de l'onglet) — ce composant
// n'affiche que le résultat déjà en base, façon accusé de lecture WhatsApp
// (visible seulement sur SES PROPRES messages : qui les a lus, et quand).
export default function Discussion({
  calculId,
  messages,
  userId,
}: {
  calculId: string;
  messages: MessageDossier[];
  userId: string;
}) {
  const router = useRouter();
  const [corps, setCorps] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  // Consulter cet onglet = lire la discussion (sémantique WhatsApp) : un
  // seul appel au montage, pas à chaque re-render (router.refresh() après
  // l'envoi d'un message remonte le composant parent, pas celui-ci).
  useEffect(() => {
    marquerDiscussionLue(calculId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculId]);

  async function envoyer() {
    if (!corps.trim()) return;
    setErreur(null);
    setEnvoi(true);
    const { erreur: erreurAction } = await envoyerMessageDossier(calculId, corps);
    setEnvoi(false);
    if (erreurAction) {
      setErreur(erreurAction);
      return;
    }
    setCorps("");
    setConfirmation("Message envoyé.");
    setTimeout(() => setConfirmation(null), 2500);
    router.refresh();
  }

  return (
    <div>
      {messages.length === 0 ? (
        <p className="text-sm text-slate">Aucun message pour l&apos;instant.</p>
      ) : (
        <ul className="mb-4 max-h-96 space-y-2 overflow-y-auto">
          {messages.map((m) =>
            m.type === "systeme" ? (
              <li key={m.id} className="text-xs italic text-slate">
                {m.corps}
                <span className="ml-2 text-[10px] not-italic text-line">
                  {new Date(m.created_at).toLocaleString("fr-MA")}
                </span>
              </li>
            ) : (
              <li key={m.id} className="rounded-md bg-canvas px-3 py-2 text-sm">
                <p className="mb-0.5 flex items-baseline gap-2">
                  <span className="font-medium text-ink">{m.profiles?.nom ?? "—"}</span>
                  <span className="text-[10px] text-slate">
                    {new Date(m.created_at).toLocaleString("fr-MA")}
                  </span>
                </p>
                <p className="text-ink">{m.corps}</p>
                {m.auteur_id === userId && (
                  <p className="mt-1 text-[10px] text-slate">
                    {m.lecteurs.length === 0
                      ? "Non lu"
                      : `Lu par ${m.lecteurs
                          .map((l) => `${l.nom} (${new Date(l.lu_le).toLocaleDateString("fr-MA")})`)
                          .join(", ")}`}
                  </p>
                )}
              </li>
            )
          )}
        </ul>
      )}

      {erreur && <p className="mb-2 text-sm text-error">{erreur}</p>}
      {confirmation && <p className="mb-2 text-sm text-signal">{confirmation}</p>}

      <div className="flex gap-2">
        <textarea
          value={corps}
          onChange={(e) => setCorps(e.target.value)}
          rows={2}
          placeholder="Écrire un message…"
          className="w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-signal focus:ring-1 focus:ring-signal"
        />
        <button
          onClick={envoyer}
          disabled={envoi || !corps.trim()}
          className="inline-flex shrink-0 items-center gap-2 self-end rounded bg-signal px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-signal-light disabled:opacity-60"
        >
          <IconEnvoyer className="h-4 w-4 shrink-0" />
          {envoi ? "Envoi…" : "Envoyer"}
        </button>
      </div>
    </div>
  );
}
