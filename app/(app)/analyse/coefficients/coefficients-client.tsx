"use client";

import { useMemo, useState } from "react";
import {
  categoriesDisponibles,
  tauxCinqAns,
  tauxPourAnnee,
  type BaremeVersion,
  type Carburant,
  type CategorieVehicule,
} from "@/lib/calcul-vv";
import { LABELS_CATEGORIE } from "@/lib/analyse";

// Table des coefficients (Sprint 19) — table de référence pure, sans lien
// à un dossier réel : 25 lignes illustratives sur VN=200 000 DH fixe,
// SANS β ni λ. Réutilise tauxCinqAns()/tauxPourAnnee() de lib/calcul-vv.ts
// (seule source de vérité, déjà validée par test-calcul-vv.ts) — aucune
// table de taux dupliquée ici.

const CHAMP =
  "w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-signal focus:ring-1 focus:ring-signal";

const VN_ILLUSTRATIF = 200000;

export default function CoefficientsClient() {
  const [baremeVersion, setBaremeVersion] = useState<BaremeVersion>("2023");
  const [categorie, setCategorie] = useState<CategorieVehicule>("leger_pu7_particulier");
  const [carburant, setCarburant] = useState<Carburant>("diesel");

  const categoriesPossibles = useMemo(() => categoriesDisponibles(baremeVersion), [baremeVersion]);

  function changerBareme(version: BaremeVersion) {
    setBaremeVersion(version);
    const options = categoriesDisponibles(version);
    if (!options.includes(categorie)) setCategorie(options[0]);
  }

  const taux5ans = useMemo(
    () => tauxCinqAns(baremeVersion, categorie, carburant),
    [baremeVersion, categorie, carburant]
  );

  const lignes = useMemo(() => {
    if (!taux5ans) return [];
    const out: { annee: number; taux: number; facteurCumule: number; vvIllustrative: number }[] = [];
    let facteurCumule = 1;
    for (let annee = 1; annee <= 25; annee++) {
      const taux = tauxPourAnnee(taux5ans, annee);
      facteurCumule *= 1 - taux;
      out.push({
        annee,
        taux,
        facteurCumule,
        vvIllustrative: Math.round(VN_ILLUSTRATIF * facteurCumule),
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taux5ans]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded border border-line bg-white p-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm text-ink">Barème</label>
          <select
            value={baremeVersion}
            onChange={(e) => changerBareme(e.target.value as BaremeVersion)}
            className={CHAMP}
          >
            <option value="2023">FMSAR 2023</option>
            <option value="2019">FMSAR 2019</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink">Catégorie</label>
          <select
            value={categorie}
            onChange={(e) => setCategorie(e.target.value as CategorieVehicule)}
            className={CHAMP}
          >
            {categoriesPossibles.map((c) => (
              <option key={c} value={c}>
                {LABELS_CATEGORIE[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink">Carburant</label>
          <select
            value={carburant}
            onChange={(e) => setCarburant(e.target.value as Carburant)}
            className={CHAMP}
          >
            <option value="diesel">Diesel</option>
            <option value="essence">Essence</option>
          </select>
        </div>
      </div>

      <p className="text-xs text-slate">
        Exemple illustratif pour une valeur à neuf de {VN_ILLUSTRATIF.toLocaleString("fr-MA")} DH,
        sans correctif entretien (β) ni kilométrage (λ) — prolongement du barème : taux de l&apos;année
        5 reconduit jusqu&apos;à l&apos;année 10, puis 5&nbsp;% par an au-delà.
      </p>

      <div className="overflow-x-auto rounded border border-line bg-white">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-slate">
            <tr>
              <th className="px-3 py-2 font-medium">Année</th>
              <th className="px-3 py-2 text-right font-medium">Taux annuel</th>
              <th className="px-3 py-2 text-right font-medium">Facteur résiduel</th>
              <th className="px-3 py-2 text-right font-medium">V.V. illustrative (DH)</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => (
              <tr key={l.annee} className="border-b border-line last:border-0">
                <td className="px-3 py-2 font-mono font-medium text-ink">{l.annee}</td>
                <td className="px-3 py-2 text-right text-red-700">
                  -{(l.taux * 100).toFixed(0)}%
                </td>
                <td className="px-3 py-2 text-right font-mono text-signal">
                  {(l.facteurCumule * 100).toFixed(2)}%
                </td>
                <td className="px-3 py-2 text-right font-mono text-ink">
                  {l.vvIllustrative.toLocaleString("fr-MA")}
                </td>
              </tr>
            ))}
            {lignes.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate">
                  Combinaison indisponible pour ce barème.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
