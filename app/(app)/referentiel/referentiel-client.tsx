"use client";

import { useCallback, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  cle,
  depuisLignes,
  nettoyer,
  SELECT_REFERENTIEL,
  type MarqueRef,
} from "@/lib/referentiel-vehicules";

const CHAMP =
  "w-full rounded border border-line bg-white px-2 py-1.5 text-sm text-ink outline-none focus:border-signal focus:ring-1 focus:ring-signal";
const BTN =
  "rounded bg-signal px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-signal-light disabled:opacity-60";
const LIEN = "text-sm underline disabled:opacity-50";

type Retour = { error: { code?: string; message: string } | null; data: unknown[] | null };

export default function ReferentielClient({ marquesInitiales }: { marquesInitiales: MarqueRef[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [marques, setMarques] = useState(marquesInitiales);
  const [selectionId, setSelectionId] = useState<string | null>(marquesInitiales[0]?.id ?? null);
  const [recherche, setRecherche] = useState("");
  const [nouvelleMarque, setNouvelleMarque] = useState("");
  const [nouveauModele, setNouveauModele] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "erreur"; texte: string } | null>(null);
  const [occupe, setOccupe] = useState(false);

  const nbModeles = marques.reduce((n, m) => n + m.modeles.length, 0);
  const selection = marques.find((m) => m.id === selectionId) ?? null;

  const filtrees = useMemo(() => {
    const q = cle(recherche);
    if (!q) return marques;
    return marques.filter(
      (m) => cle(m.nom).includes(q) || m.modeles.some((x) => cle(x.nom).includes(q))
    );
  }, [marques, recherche]);

  const recharger = useCallback(async () => {
    const { data, error } = await supabase
      .from("vehicule_marques")
      .select(SELECT_REFERENTIEL)
      .order("nom");
    if (error) {
      setMessage({ type: "erreur", texte: "Rechargement impossible : " + error.message });
      return;
    }
    setMarques(depuisLignes(data as Parameters<typeof depuisLignes>[0]));
  }, [supabase]);

  // Une écriture refusée par la RLS ne renvoie pas d'erreur mais 0 ligne :
  // on le détecte pour ne jamais afficher un succès qui n'a pas eu lieu.
  async function executer(action: () => PromiseLike<Retour>, succes: string) {
    setOccupe(true);
    setMessage(null);
    const { error, data } = await action();
    setOccupe(false);
    if (error) {
      setMessage({
        type: "erreur",
        texte: error.code === "23505" ? "Ce nom existe déjà." : `Opération refusée : ${error.message}`,
      });
      return false;
    }
    if (data && data.length === 0) {
      setMessage({ type: "erreur", texte: "Opération refusée : droits insuffisants ou élément introuvable." });
      return false;
    }
    setMessage({ type: "ok", texte: succes });
    await recharger();
    return true;
  }

  async function ajouterMarque(e: React.FormEvent) {
    e.preventDefault();
    const nom = nettoyer(nouvelleMarque);
    if (!nom) return;
    const ok = await executer(
      () => supabase.from("vehicule_marques").insert({ nom }).select("id"),
      `Marque ajoutée : ${nom}`
    );
    if (ok) setNouvelleMarque("");
  }

  async function renommerMarque(m: MarqueRef) {
    const nom = nettoyer(window.prompt("Renommer la marque :", m.nom));
    if (!nom || nom === m.nom) return;
    await executer(
      () => supabase.from("vehicule_marques").update({ nom }).eq("id", m.id).select("id"),
      "Marque renommée."
    );
  }

  async function supprimerMarque(m: MarqueRef) {
    if (!window.confirm(`Supprimer la marque ${m.nom} et ses ${m.modeles.length} modèle(s) ?`)) return;
    const ok = await executer(
      () => supabase.from("vehicule_marques").delete().eq("id", m.id).select("id"),
      `Marque supprimée : ${m.nom}`
    );
    if (ok && selectionId === m.id) setSelectionId(null);
  }

  async function ajouterModele(e: React.FormEvent) {
    e.preventDefault();
    const nom = nettoyer(nouveauModele);
    if (!nom || !selection) return;
    const ok = await executer(
      () => supabase.from("vehicule_modeles").insert({ marque_id: selection.id, nom }).select("id"),
      `Modèle ajouté : ${nom}`
    );
    if (ok) setNouveauModele("");
  }

  async function renommerModele(id: string, ancien: string) {
    const nom = nettoyer(window.prompt("Renommer le modèle :", ancien));
    if (!nom || nom === ancien) return;
    await executer(
      () => supabase.from("vehicule_modeles").update({ nom }).eq("id", id).select("id"),
      "Modèle renommé."
    );
  }

  async function supprimerModele(id: string, nom: string) {
    if (!window.confirm(`Supprimer le modèle ${nom} ?`)) return;
    await executer(
      () => supabase.from("vehicule_modeles").delete().eq("id", id).select("id"),
      `Modèle supprimé : ${nom}`
    );
  }

  async function enregistrerVN(id: string, ancien: number | null, saisie: string, champ: HTMLInputElement) {
    const texte = saisie.trim();
    const valeur = texte === "" ? null : Number(texte);
    if (valeur !== null && (!Number.isFinite(valeur) || valeur <= 0)) {
      setMessage({ type: "erreur", texte: "La valeur à neuf de référence doit être un nombre positif." });
      champ.value = ancien === null ? "" : String(ancien);
      return;
    }
    if (valeur === ancien) return;
    const ok = await executer(
      () => supabase.from("vehicule_modeles").update({ vn_reference: valeur }).eq("id", id).select("id"),
      valeur === null ? "Valeur à neuf de référence retirée." : "Valeur à neuf de référence enregistrée."
    );
    if (!ok) champ.value = ancien === null ? "" : String(ancien);
  }

  return (
    <div className="space-y-4">
      {message && (
        <p
          role={message.type === "erreur" ? "alert" : "status"}
          className={`rounded border px-3 py-2 text-sm ${
            message.type === "erreur"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-signal bg-signal-bg text-signal"
          }`}
        >
          {message.texte}
        </p>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3 rounded border border-line bg-white p-4">
        <div className="min-w-[220px] flex-1">
          <input
            aria-label="Rechercher une marque ou un modèle"
            placeholder="Rechercher une marque ou un modèle…"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className={CHAMP}
          />
        </div>
        <p data-testid="compteurs" className="text-sm text-slate">
          {marques.length} marques / {nbModeles} modèles
        </p>
        <form onSubmit={ajouterMarque} className="flex gap-2">
          <input
            aria-label="Nouvelle marque"
            placeholder="Nouvelle marque"
            value={nouvelleMarque}
            maxLength={80}
            onChange={(e) => setNouvelleMarque(e.target.value)}
            className={CHAMP + " w-44"}
          />
          <button type="submit" disabled={occupe || !nettoyer(nouvelleMarque)} className={BTN}>
            Ajouter
          </button>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,320px)_1fr]">
        <div className="max-h-[65vh] overflow-auto rounded border border-line bg-white">
          {filtrees.length === 0 && (
            <p className="p-4 text-center text-sm text-slate">Aucune marque pour cette recherche.</p>
          )}
          {filtrees.map((m) => (
            <div
              key={m.id}
              data-marque={m.nom}
              className={`flex items-center gap-2 border-b border-line px-3 py-2 last:border-0 ${
                m.id === selectionId ? "bg-signal-bg" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectionId(m.id)}
                className="flex-1 text-left text-sm font-medium text-ink"
              >
                {m.nom}
              </button>
              <span className="rounded-full bg-canvas px-2 py-0.5 text-xs text-slate">{m.modeles.length}</span>
            </div>
          ))}
        </div>

        <div className="rounded border border-line bg-white p-4">
          {!selection ? (
            <p className="py-10 text-center text-sm text-slate">
              Sélectionnez une marque pour gérer ses modèles.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
                <h2 className="text-base font-medium text-ink">{selection.nom}</h2>
                <div className="flex gap-4">
                  <button type="button" disabled={occupe} onClick={() => renommerMarque(selection)} className={LIEN + " text-signal"}>
                    Renommer la marque
                  </button>
                  <button type="button" disabled={occupe} onClick={() => supprimerMarque(selection)} className={LIEN + " text-red-700"}>
                    Supprimer la marque
                  </button>
                </div>
              </div>

              <form onSubmit={ajouterModele} className="flex gap-2">
                <input
                  aria-label={`Nouveau modèle de ${selection.nom}`}
                  placeholder={`Nouveau modèle de ${selection.nom}`}
                  value={nouveauModele}
                  maxLength={80}
                  onChange={(e) => setNouveauModele(e.target.value)}
                  className={CHAMP}
                />
                <button type="submit" disabled={occupe || !nettoyer(nouveauModele)} className={BTN}>
                  Ajouter
                </button>
              </form>

              {selection.modeles.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate">Aucun modèle pour cette marque.</p>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {selection.modeles.map((mod) => (
                    <li
                      key={mod.id}
                      data-modele={mod.nom}
                      className="flex items-center gap-2 rounded border border-line px-3 py-2"
                    >
                      <span className="flex-1 text-sm text-ink">{mod.nom}</span>
                      <input
                        key={`${mod.id}-${mod.vn_reference ?? ""}`}
                        type="number"
                        min={0}
                        step="0.01"
                        aria-label={`VN de référence — ${mod.nom}`}
                        placeholder="VN réf. (DH)"
                        defaultValue={mod.vn_reference ?? ""}
                        disabled={occupe}
                        onBlur={(e) => enregistrerVN(mod.id, mod.vn_reference, e.target.value, e.target)}
                        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                        className="w-32 rounded border border-line bg-white px-2 py-1 text-xs text-ink outline-none focus:border-signal focus:ring-1 focus:ring-signal"
                      />
                      <button
                        type="button"
                        title="Renommer"
                        aria-label={`Renommer ${mod.nom}`}
                        disabled={occupe}
                        onClick={() => renommerModele(mod.id, mod.nom)}
                        className="text-slate hover:text-ink disabled:opacity-50"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        title="Supprimer"
                        aria-label={`Supprimer ${mod.nom}`}
                        disabled={occupe}
                        onClick={() => supprimerModele(mod.id, mod.nom)}
                        className="text-slate hover:text-red-700 disabled:opacity-50"
                      >
                        🗑
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
