"use client";

import { useMemo, useState } from "react";
import { LABELS_ROLE, ROLES, type UserRole } from "@/lib/roles";
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
  moi,
}: {
  comptesInitiaux: Compte[];
  moi: string;
}) {
  const [comptes, setComptes] = useState(comptesInitiaux);
  const [erreur, setErreur] = useState<string | null>(null);
  const [affiche, setAffiche] = useState<MotDePasseAffiche | null>(null);
  const [copie, setCopie] = useState(false);
  const [occupe, setOccupe] = useState<string | null>(null);
  const [nouveau, setNouveau] = useState({ nom: "", email: "", bureau: "", role: "technicien" as UserRole });
  const [renommage, setRenommage] = useState({ ancien: "", nouveau: "" });
  const [erreurBureau, setErreurBureau] = useState<string | null>(null);
  const [occupeBureau, setOccupeBureau] = useState(false);

  // Bureaux distincts (Sprint 29, point 7) — dérivés des comptes existants,
  // pas d'une table dédiée : "ajouter" un bureau se fait déjà en le tapant
  // dans le formulaire de création ci-dessus.
  const bureaux = useMemo(() => {
    const compte = new Map<string, number>();
    for (const c of comptes) compte.set(c.bureau, (compte.get(c.bureau) ?? 0) + 1);
    return Array.from(compte.entries())
      .map(([nom, n]) => ({ nom, n }))
      .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  }, [comptes]);

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

  async function renommerBureau(e: React.FormEvent) {
    e.preventDefault();
    setErreurBureau(null);
    setOccupeBureau(true);
    const { ok, json } = await appel("/api/comptes/bureaux", "PATCH", renommage);
    setOccupeBureau(false);
    if (!ok) return setErreurBureau(json.erreur ?? "Renommage impossible.");
    setComptes((cs) =>
      cs.map((c) => (c.bureau === renommage.ancien ? { ...c, bureau: renommage.nouveau } : c))
    );
    setRenommage({ ancien: "", nouveau: "" });
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
          <input
            aria-label="Bureau"
            placeholder="Bureau"
            required
            maxLength={120}
            value={nouveau.bureau}
            onChange={(e) => setNouveau({ ...nouveau, bureau: e.target.value })}
            className={CHAMP}
          />
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
            disabled={occupe === "nouveau"}
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
          Un bureau est un texte libre, attaché à chaque compte — pas de liste séparée à gérer.
          Pour en ajouter un, tapez-le dans le formulaire de création ci-dessus. Pour corriger ou
          harmoniser un nom existant, renommez-le ici : tous les comptes concernés sont mis à jour
          en une fois.
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          {bureaux.map((b) => (
            <span
              key={b.nom}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas px-3 py-1 text-xs text-ink"
            >
              {b.nom}
              <span className="text-slate">· {b.n}</span>
            </span>
          ))}
        </div>
        <form onSubmit={renommerBureau} className="grid gap-3 sm:grid-cols-3">
          <select
            aria-label="Bureau à renommer"
            required
            value={renommage.ancien}
            onChange={(e) => setRenommage({ ...renommage, ancien: e.target.value })}
            className={CHAMP}
          >
            <option value="">— Choisir un bureau —</option>
            {bureaux.map((b) => (
              <option key={b.nom} value={b.nom}>
                {b.nom} ({b.n})
              </option>
            ))}
          </select>
          <input
            aria-label="Nouveau nom du bureau"
            placeholder="Nouveau nom"
            required
            maxLength={120}
            value={renommage.nouveau}
            onChange={(e) => setRenommage({ ...renommage, nouveau: e.target.value })}
            className={CHAMP}
          />
          <button
            type="submit"
            disabled={occupeBureau}
            className="inline-flex items-center justify-center gap-2 rounded border border-line px-3 py-1.5 text-sm text-ink hover:bg-canvas disabled:opacity-60"
          >
            <IconModifier className="h-4 w-4 shrink-0" />
            {occupeBureau ? "Renommage…" : "Renommer"}
          </button>
        </form>
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
                      <input
                        aria-label={`Nom de ${c.nom}`}
                        defaultValue={c.nom}
                        maxLength={120}
                        disabled={occupe === c.id}
                        onBlur={async (e) => {
                          const v = e.target.value.trim();
                          if (!v || v === c.nom) {
                            e.target.value = c.nom;
                            return;
                          }
                          const ok = await modifier(c, { nom: v }, { nom: v });
                          if (!ok) e.target.value = c.nom;
                        }}
                        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                        className={`${CHAMP} min-w-[10rem] font-medium`}
                      />
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
                  <td className="px-3 py-2">
                    <input
                      aria-label={`Bureau de ${c.nom}`}
                      defaultValue={c.bureau}
                      maxLength={120}
                      disabled={occupe === c.id}
                      onBlur={async (e) => {
                        const v = e.target.value.trim();
                        if (v === c.bureau) return;
                        const ok = await modifier(c, { bureau: v }, { bureau: v });
                        if (!ok) e.target.value = c.bureau;
                      }}
                      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                      className={CHAMP}
                    />
                  </td>
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
    </div>
  );
}
