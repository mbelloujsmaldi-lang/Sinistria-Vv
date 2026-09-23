"use client";

import { useState } from "react";
import { LABELS_ROLE, ROLES, type UserRole } from "@/lib/roles";
import { VILLES_MAROC } from "@/lib/villes-maroc";
import { IconPlus, IconRafraichir, IconModifier } from "../nav-icons";

export type Compte = {
  id: string;
  nom: string;
  email: string;
  role: UserRole;
  bureau: string;
  chefId: string | null;
  actif: boolean;
  derniereConnexion: string;
  supprimable: boolean;
};

export type Bureau = {
  id: string;
  nom: string;
  ville: string | null;
  adresse: string | null;
  email_officiel: string | null;
};

type MotDePasseAffiche = { titre: string; email: string; motDePasse: string };

const CHAMP =
  "w-full rounded border border-line bg-white px-2 py-1.5 text-sm text-ink outline-none focus:border-signal focus:ring-1 focus:ring-signal disabled:bg-canvas disabled:text-slate";

async function appel(url: string, methode: string, corps?: unknown) {
  const res = await fetch(url, {
    method: methode,
    headers: corps ? { "content-type": "application/json" } : undefined,
    body: corps ? JSON.stringify(corps) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, json };
}

export default function ComptesClient({
  comptesInitiaux,
  bureauxInitiaux,
  moi,
}: {
  comptesInitiaux: Compte[];
  bureauxInitiaux: Bureau[];
  moi: string;
}) {
  const [comptes, setComptes] = useState(comptesInitiaux);
  const [bureaux, setBureaux] = useState(bureauxInitiaux);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [affiche, setAffiche] = useState<MotDePasseAffiche | null>(null);
  const [copie, setCopie] = useState(false);
  const [occupe, setOccupe] = useState<string | null>(null);
  const [nouveau, setNouveau] = useState({
    nom: "",
    email: "",
    bureau: "",
    role: "technicien" as UserRole,
  });

  const [nouveauBureau, setNouveauBureau] = useState({ nom: "", ville: "", adresse: "", email_officiel: "" });
  const [bureauSelectionne, setBureauSelectionne] = useState("");
  const [editionBureau, setEditionBureau] = useState({ id: "", nom: "", ville: "", adresse: "", email_officiel: "" });
  const [erreurBureau, setErreurBureau] = useState<string | null>(null);
  const [occupeBureau, setOccupeBureau] = useState<string | null>(null);

  const [edition, setEdition] = useState<Compte | null>(null);
  const [editionForm, setEditionForm] = useState({ nom: "", email: "", bureau: "" });
  const [erreurEdition, setErreurEdition] = useState<string | null>(null);
  const [occupeEdition, setOccupeEdition] = useState(false);

  function notifier(texte: string) {
    setConfirmation(texte);
    setTimeout(() => setConfirmation(null), 3000);
  }

  function maj(id: string, champs: Partial<Compte>) {
    setComptes((cs) => cs.map((c) => (c.id === id ? { ...c, ...champs } : c)));
  }

  async function modifier(c: Compte, corps: Record<string, unknown>, local: Partial<Compte>) {
    setErreur(null);
    setOccupe(c.id);
    const { ok, json } = await appel(`/api/comptes/${c.id}`, "PATCH", corps);
    setOccupe(null);
    if (!ok) {
      setErreur(json.erreur ?? "Modification impossible.");
      return false;
    }
    maj(c.id, local);
    return true;
  }

  async function basculerActif(c: Compte) {
    if (c.actif && !window.confirm(`Désactiver le compte de ${c.nom} ? Il ne pourra plus se connecter.`)) return;
    await modifier(c, { actif: !c.actif }, { actif: !c.actif });
  }

  async function reinitialiser(c: Compte) {
    if (!window.confirm(`Réinitialiser le mot de passe de ${c.nom} ? L'ancien ne fonctionnera plus.`)) return;
    setErreur(null);
    setOccupe(c.id);
    const { ok, json } = await appel(`/api/comptes/${c.id}/reset`, "POST");
    setOccupe(null);
    if (!ok) return setErreur(json.erreur ?? "Réinitialisation impossible.");
    setCopie(false);
    setAffiche({ titre: "Mot de passe réinitialisé", email: c.email, motDePasse: json.motDePasseTemporaire });
  }

  async function supprimer(c: Compte) {
    if (!window.confirm(`Supprimer définitivement le compte de ${c.nom} (jamais utilisé) ?`)) return;
    setErreur(null);
    setOccupe(c.id);
    const { ok, json } = await appel(`/api/comptes/${c.id}`, "DELETE");
    setOccupe(null);
    if (!ok) return setErreur(json.erreur ?? "Suppression impossible.");
    setComptes((cs) => cs.filter((x) => x.id !== c.id));
  }

  async function creer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setOccupe("nouveau");
    const { ok, json } = await appel("/api/comptes", "POST", nouveau);
    setOccupe(null);
    if (!ok) return setErreur(json.erreur ?? "Création impossible.");
    setComptes((cs) =>
      [
        ...cs,
        {
          id: json.id,
          nom: json.nom,
          email: json.email,
          role: json.role,
          bureau: json.bureau,
          chefId: null,
          actif: true,
          derniereConnexion: "Jamais",
          supprimable: true,
        },
      ].sort((a, b) => a.nom.localeCompare(b.nom))
    );
    setCopie(false);
    setAffiche({ titre: "Compte créé", email: json.email, motDePasse: json.motDePasseTemporaire });
    setNouveau({ nom: "", email: "", bureau: "", role: "technicien" });
  }

  async function creerBureau(e: React.FormEvent) {
    e.preventDefault();
    setErreurBureau(null);
    setOccupeBureau("creation");
    const { ok, json } = await appel("/api/comptes/bureaux", "POST", nouveauBureau);
    setOccupeBureau(null);
    if (!ok) return setErreurBureau(json.erreur ?? "Création impossible.");
    setBureaux((bs) => [...bs, json].sort((a, b) => a.nom.localeCompare(b.nom, "fr")));
    setNouveauBureau({ nom: "", ville: "", adresse: "", email_officiel: "" });
    notifier(`Bureau « ${json.nom} » créé.`);
  }

  function choisirBureauAModifier(id: string) {
    setBureauSelectionne(id);
    const b = bureaux.find((x) => x.id === id);
    setEditionBureau(
      b
        ? { id: b.id, nom: b.nom, ville: b.ville ?? "", adresse: b.adresse ?? "", email_officiel: b.email_officiel ?? "" }
        : { id: "", nom: "", ville: "", adresse: "", email_officiel: "" }
    );
    setErreurBureau(null);
  }

  async function enregistrerBureau(e: React.FormEvent) {
    e.preventDefault();
    setErreurBureau(null);
    setOccupeBureau("edition");
    const ancienNom = bureaux.find((b) => b.id === editionBureau.id)?.nom;
    const { ok, json } = await appel("/api/comptes/bureaux", "PATCH", editionBureau);
    setOccupeBureau(null);
    if (!ok) return setErreurBureau(json.erreur ?? "Modification impossible.");
    setBureaux((bs) => bs.map((b) => (b.id === json.id ? json : b)).sort((a, b) => a.nom.localeCompare(b.nom, "fr")));
    if (ancienNom && ancienNom !== json.nom) {
      setComptes((cs) => cs.map((c) => (c.bureau === ancienNom ? { ...c, bureau: json.nom } : c)));
    }
    notifier(
      json.comptesModifies
        ? `Bureau mis à jour (${json.comptesModifies} compte${json.comptesModifies > 1 ? "s" : ""} concerné${json.comptesModifies > 1 ? "s" : ""}).`
        : "Bureau mis à jour."
    );
  }

  function ouvrirEdition(c: Compte) {
    setEdition(c);
    setEditionForm({ nom: c.nom, email: c.email, bureau: c.bureau });
    setErreurEdition(null);
  }

  async function enregistrerEdition(e: React.FormEvent) {
    e.preventDefault();
    if (!edition) return;
    setErreurEdition(null);
    setOccupeEdition(true);
    const corps: Record<string, unknown> = {};
    if (editionForm.nom.trim() !== edition.nom) corps.nom = editionForm.nom.trim();
    if (editionForm.bureau !== edition.bureau) corps.bureau = editionForm.bureau;
    if (editionForm.email.trim().toLowerCase() !== edition.email.toLowerCase()) corps.email = editionForm.email.trim();

    if (Object.keys(corps).length === 0) {
      setOccupeEdition(false);
      setEdition(null);
      return;
    }

    const { ok, json } = await appel(`/api/comptes/${edition.id}`, "PATCH", corps);
    setOccupeEdition(false);
    if (!ok) return setErreurEdition(json.erreur ?? "Modification impossible.");
    maj(edition.id, {
      nom: corps.nom !== undefined ? (corps.nom as string) : edition.nom,
      bureau: corps.bureau !== undefined ? (corps.bureau as string) : edition.bureau,
      email: json.email ?? edition.email,
    });
    setEdition(null);
    notifier(`Compte de ${editionForm.nom.trim() || edition.nom} mis à jour.`);
  }

  async function copier(texte: string) {
    try {
      await navigator.clipboard.writeText(texte);
      setCopie(true);
    } catch {
      setCopie(false);
    }
  }

  return (
    <div className="space-y-6">
      {erreur && (
        <p role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {erreur}
        </p>
      )}

      {confirmation && (
        <p role="status" className="rounded border border-signal bg-signal-bg px-3 py-2 text-sm text-signal">
          {confirmation}
        </p>
      )}

      {affiche && (
        <div role="status" className="rounded border border-signal bg-signal-bg p-4">
          <p className="text-sm font-medium text-signal">{affiche.titre}</p>
          <p className="mt-1 text-sm text-ink">
            Mot de passe temporaire de <span className="font-medium">{affiche.email}</span> — affiché une
            seule fois, à transmettre en main propre. Il ne sera plus consultable.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <code data-testid="mot-de-passe-temporaire" className="rounded bg-white px-3 py-1.5 font-mono text-base text-ink">
              {affiche.motDePasse}
            </code>
            <button
              type="button"
              onClick={() => copier(affiche.motDePasse)}
              className="rounded border border-line bg-white px-3 py-1.5 text-sm text-ink hover:bg-canvas"
            >
              {copie ? "Copié" : "Copier"}
            </button>
            <button
              type="button"
              onClick={() => setAffiche(null)}
              className="rounded bg-signal px-3 py-1.5 text-sm font-medium text-white hover:bg-signal-light"
            >
              J&apos;ai noté le mot de passe
            </button>
          </div>
        </div>
      )}

      <section className="rounded-md border border-line bg-white p-5">
        <h2 className="mb-3 text-sm font-medium text-ink">Créer un compte</h2>
        <form onSubmit={creer} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input
            aria-label="Nom"
            placeholder="Nom complet"
            required
            maxLength={120}
            value={nouveau.nom}
            onChange={(e) => setNouveau({ ...nouveau, nom: e.target.value })}
            className={CHAMP}
          />
          <input
            aria-label="Email"
            type="email"
            placeholder="email@bureau.ma"
            required
            value={nouveau.email}
            onChange={(e) => setNouveau({ ...nouveau, email: e.target.value })}
            className={CHAMP}
          />
          <select
            aria-label="Bureau"
            required
            value={nouveau.bureau}
            onChange={(e) => setNouveau({ ...nouveau, bureau: e.target.value })}
            className={CHAMP}
          >
            <option value="">— Choisir un bureau —</option>
            {bureaux.map((b) => (
              <option key={b.id} value={b.nom}>
                {b.nom}
              </option>
            ))}
          </select>
          <select
            aria-label="Rôle"
            value={nouveau.role}
            onChange={(e) => setNouveau({ ...nouveau, role: e.target.value as UserRole })}
            className={CHAMP}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {LABELS_ROLE[r]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={occupe === "nouveau" || bureaux.length === 0}
            title={bureaux.length === 0 ? "Créez d'abord un bureau ci-dessous." : undefined}
            className="inline-flex items-center justify-center gap-2 rounded bg-signal px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-signal-light disabled:opacity-60"
          >
            <IconPlus className="h-4 w-4 shrink-0" />
            {occupe === "nouveau" ? "Création…" : "Créer le compte"}
          </button>
        </form>
      </section>

      <section className="rounded-md border border-line bg-white p-5">
        <h2 className="mb-1 text-sm font-medium text-ink">Bureaux</h2>
        <p className="mb-3 text-xs text-slate">
          Fiche par bureau (ville, adresse, email officiel) — alimente le menu déroulant de « Créer
          un compte » ci-dessus. Renommer un bureau met à jour tous les comptes qui le portent.
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          {bureaux.map((b) => {
            const n = comptes.filter((c) => c.bureau === b.nom).length;
            return (
              <span
                key={b.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas px-3 py-1 text-xs text-ink"
              >
                {b.nom}
                {b.ville && <span className="text-slate">· {b.ville}</span>}
                <span className="text-slate">· {n}</span>
              </span>
            );
          })}
          {bureaux.length === 0 && <p className="text-xs text-slate">Aucun bureau enregistré pour le moment.</p>}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <form onSubmit={creerBureau} className="space-y-2 rounded border border-line p-3">
            <p className="text-xs font-medium uppercase tracking-widest text-slate">Créer un bureau</p>
            <input
              aria-label="Nom du nouveau bureau"
              placeholder="Nom du bureau"
              required
              maxLength={120}
              value={nouveauBureau.nom}
              onChange={(e) => setNouveauBureau({ ...nouveauBureau, nom: e.target.value })}
              className={CHAMP}
            />
            <select
              aria-label="Ville du nouveau bureau"
              required
              value={nouveauBureau.ville}
              onChange={(e) => setNouveauBureau({ ...nouveauBureau, ville: e.target.value })}
              className={CHAMP}
            >
              <option value="">— Ville —</option>
              {VILLES_MAROC.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <input
              aria-label="Adresse du nouveau bureau"
              placeholder="Adresse (optionnel)"
              maxLength={250}
              value={nouveauBureau.adresse}
              onChange={(e) => setNouveauBureau({ ...nouveauBureau, adresse: e.target.value })}
              className={CHAMP}
            />
            <input
              aria-label="Email officiel du nouveau bureau"
              type="email"
              placeholder="Email officiel (optionnel)"
              value={nouveauBureau.email_officiel}
              onChange={(e) => setNouveauBureau({ ...nouveauBureau, email_officiel: e.target.value })}
              className={CHAMP}
            />
            <button
              type="submit"
              disabled={occupeBureau === "creation"}
              className="inline-flex items-center justify-center gap-2 rounded bg-signal px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-signal-light disabled:opacity-60"
            >
              <IconPlus className="h-4 w-4 shrink-0" />
              {occupeBureau === "creation" ? "Création…" : "Créer le bureau"}
            </button>
          </form>

          <form onSubmit={enregistrerBureau} className="space-y-2 rounded border border-line p-3">
            <p className="text-xs font-medium uppercase tracking-widest text-slate">Modifier un bureau</p>
            <select
              aria-label="Bureau à modifier"
              value={bureauSelectionne}
              onChange={(e) => choisirBureauAModifier(e.target.value)}
              className={CHAMP}
            >
              <option value="">— Choisir un bureau —</option>
              {bureaux.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nom}
                </option>
              ))}
            </select>
            <input
              aria-label="Nouveau nom du bureau"
              placeholder="Nom du bureau"
              maxLength={120}
              disabled={!editionBureau.id}
              value={editionBureau.nom}
              onChange={(e) => setEditionBureau({ ...editionBureau, nom: e.target.value })}
              className={CHAMP}
            />
            <select
              aria-label="Ville du bureau"
              disabled={!editionBureau.id}
              value={editionBureau.ville}
              onChange={(e) => setEditionBureau({ ...editionBureau, ville: e.target.value })}
              className={CHAMP}
            >
              <option value="">— Ville —</option>
              {VILLES_MAROC.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <input
              aria-label="Adresse du bureau"
              placeholder="Adresse (optionnel)"
              maxLength={250}
              disabled={!editionBureau.id}
              value={editionBureau.adresse}
              onChange={(e) => setEditionBureau({ ...editionBureau, adresse: e.target.value })}
              className={CHAMP}
            />
            <input
              aria-label="Email officiel du bureau"
              type="email"
              placeholder="Email officiel (optionnel)"
              disabled={!editionBureau.id}
              value={editionBureau.email_officiel}
              onChange={(e) => setEditionBureau({ ...editionBureau, email_officiel: e.target.value })}
              className={CHAMP}
            />
            <button
              type="submit"
              disabled={!editionBureau.id || occupeBureau === "edition"}
              className="inline-flex items-center justify-center gap-2 rounded border border-line px-3 py-1.5 text-sm text-ink hover:bg-canvas disabled:opacity-60"
            >
              <IconModifier className="h-4 w-4 shrink-0" />
              {occupeBureau === "edition" ? "Enregistrement…" : "Enregistrer"}
            </button>
          </form>
        </div>
        {erreurBureau && <p className="mt-2 text-sm text-error">{erreurBureau}</p>}
      </section>

      <div className="overflow-x-auto rounded-md border border-line bg-white">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-slate">
            <tr>
              <th className="px-3 py-2 font-medium">Nom</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Rôle</th>
              <th className="px-3 py-2 font-medium">Bureau</th>
              <th className="px-3 py-2 font-medium">Responsable</th>
              <th className="px-3 py-2 font-medium">Actif</th>
              <th className="px-3 py-2 font-medium">Dernière connexion</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {comptes.map((c) => {
              const soi = c.id === moi;
              return (
                <tr key={c.id} data-compte={c.email} className={`border-b border-line last:border-0 ${c.actif ? "" : "bg-canvas text-slate"}`}>
                  <td className="px-3 py-2 font-medium text-ink">
                    <div className="flex items-center gap-2">
                      {c.nom}
                      {soi && <span className="rounded bg-signal-bg px-1.5 py-0.5 text-xs text-signal">vous</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2">{c.email}</td>
                  <td className="px-3 py-2">
                    <select
                      aria-label={`Rôle de ${c.nom}`}
                      value={c.role}
                      disabled={soi || occupe === c.id}
                      title={soi ? "Vous ne pouvez pas modifier votre propre rôle." : undefined}
                      onChange={(e) => modifier(c, { role: e.target.value }, { role: e.target.value as UserRole })}
                      className={CHAMP}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {LABELS_ROLE[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-ink">{c.bureau}</td>
                  <td className="px-3 py-2">
                    <select
                      aria-label={`Responsable de ${c.nom}`}
                      value={c.chefId ?? ""}
                      disabled={occupe === c.id}
                      onChange={(e) => {
                        const v = e.target.value || null;
                        modifier(c, { chef_hierarchique_id: v }, { chefId: v });
                      }}
                      className={CHAMP}
                    >
                      <option value="">— Aucun —</option>
                      {comptes
                        .filter((x) => x.id !== c.id)
                        .map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.nom}
                          </option>
                        ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={c.actif}
                      aria-label={`Actif : ${c.nom}`}
                      disabled={soi || occupe === c.id}
                      title={soi ? "Vous ne pouvez pas vous désactiver." : undefined}
                      onClick={() => basculerActif(c)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${c.actif ? "bg-signal" : "bg-line"}`}
                    >
                      <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${c.actif ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                  </td>
                  <td className="px-3 py-2 text-slate">{c.derniereConnexion}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={occupe === c.id}
                        onClick={() => ouvrirEdition(c)}
                        className="inline-flex items-center gap-1 text-sm text-signal underline hover:text-signal-light disabled:opacity-50"
                      >
                        <IconModifier className="h-3.5 w-3.5 shrink-0" />
                        Modifier
                      </button>
                      <button
                        type="button"
                        disabled={occupe === c.id}
                        onClick={() => reinitialiser(c)}
                        className="inline-flex items-center gap-1 text-sm text-signal underline hover:text-signal-light disabled:opacity-50"
                      >
                        <IconRafraichir className="h-3.5 w-3.5 shrink-0" />
                        Réinitialiser le mot de passe
                      </button>
                      {c.supprimable && (
                        <button
                          type="button"
                          disabled={occupe === c.id}
                          onClick={() => supprimer(c)}
                          className="inline-flex items-center gap-1 text-sm text-red-700 underline hover:text-red-900 disabled:opacity-50"
                        >
                          Supprimer (jamais utilisé)
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {edition && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 p-4"
          onClick={() => setEdition(null)}
        >
          <div
            className="w-full max-w-md rounded-md border border-line bg-white p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-3 text-sm font-medium text-ink">Modifier le compte de {edition.nom}</h2>
            <form onSubmit={enregistrerEdition} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-slate">Nom</label>
                <input
                  required
                  maxLength={120}
                  value={editionForm.nom}
                  onChange={(e) => setEditionForm({ ...editionForm, nom: e.target.value })}
                  className={CHAMP}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate">Email</label>
                <input
                  type="email"
                  required
                  value={editionForm.email}
                  onChange={(e) => setEditionForm({ ...editionForm, email: e.target.value })}
                  className={CHAMP}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate">Bureau</label>
                <select
                  required
                  value={editionForm.bureau}
                  onChange={(e) => setEditionForm({ ...editionForm, bureau: e.target.value })}
                  className={CHAMP}
                >
                  {!bureaux.some((b) => b.nom === editionForm.bureau) && (
                    <option value={editionForm.bureau}>{editionForm.bureau}</option>
                  )}
                  {bureaux.map((b) => (
                    <option key={b.id} value={b.nom}>
                      {b.nom}
                    </option>
                  ))}
                </select>
              </div>
              {erreurEdition && <p className="text-sm text-error">{erreurEdition}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEdition(null)}
                  className="rounded border border-line px-3 py-1.5 text-sm text-ink hover:bg-canvas"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={occupeEdition}
                  className="rounded bg-signal px-3 py-1.5 text-sm font-medium text-white hover:bg-signal-light disabled:opacity-60"
                >
                  {occupeEdition ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
