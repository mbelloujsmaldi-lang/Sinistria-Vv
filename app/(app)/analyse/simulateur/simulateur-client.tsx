"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  calculerValeurVenale,
  categoriesDisponibles,
  type BaremeVersion,
  type Carburant,
  type CategorieVehicule,
  type Entretien,
} from "@/lib/calcul-vv";
import { LABELS_CATEGORIE } from "@/lib/analyse";

// Simulateur "Et si ?" (Sprint 18) — recalcul entièrement côté client,
// calculerValeurVenale() est un module pur (aucun import serveur, vérifié
// avant ce sprint) : aucune requête réseau à chaque mouvement de curseur.
//
// Les dates envoyées au moteur sont synthétiques (aucun sinistre réel) :
// dateSinistre = aujourd'hui, figée une fois au montage ; dateMiseCirculation
// = dateSinistre moins l'âge choisi (en mois arrondis). Seul l'écart entre
// les deux compte pour le moteur (moisEntre), l'ancrage réel est sans
// incidence sur le résultat.

const LABELS_ENTRETIEN: Record<Entretien, string> = {
  aucun: "Aucun historique / non renseigné",
  concessionnaire_continu: "Entretien continu chez le concessionnaire",
  concessionnaire_puis_reseau_agree: "Concessionnaire puis réseau agréé",
  reseau_externe_principal: "Réseau externe (hors concessionnaire)",
};

const CHAMP =
  "w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-signal focus:ring-1 focus:ring-signal";

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dateMiseCirculationPour(dateSinistre: Date, ageAns: number): Date {
  const d = new Date(dateSinistre);
  d.setMonth(d.getMonth() - Math.round(ageAns * 12));
  return d;
}

const NB_POINTS_COURBE = 301; // 0 à 25 ans, un point par mois

export default function SimulateurClient() {
  const dateSinistre = useState(() => new Date())[0];

  const [baremeVersion, setBaremeVersion] = useState<BaremeVersion>("2023");
  const [categorie, setCategorie] = useState<CategorieVehicule>("leger_pu7_particulier");
  const [carburant, setCarburant] = useState<Carburant>("diesel");
  const [entretien, setEntretien] = useState<Entretien>("aucun");
  const [puissanceFiscale, setPuissanceFiscale] = useState(6);
  const [valeurNeuve, setValeurNeuve] = useState(200000);
  const [kilometrageTotal, setKilometrageTotal] = useState(60000);
  const [age, setAge] = useState(3);

  const categoriesPossibles = useMemo(() => categoriesDisponibles(baremeVersion), [baremeVersion]);

  function changerBareme(version: BaremeVersion) {
    setBaremeVersion(version);
    const options = categoriesDisponibles(version);
    if (!options.includes(categorie)) setCategorie(options[0]);
  }

  const parametresBase = {
    valeurNeuve,
    categorie,
    carburant,
    baremeVersion,
    puissanceFiscale,
    kilometrageTotal,
    entretien,
  };

  // Courbe : ne dépend pas de l'âge choisi (elle couvre tous les âges),
  // recalculée seulement quand un autre paramètre change.
  const courbe = useMemo(() => {
    const points: { age: number; valeur: number }[] = [];
    for (let i = 0; i < NB_POINTS_COURBE; i++) {
      const ageI = (i / (NB_POINTS_COURBE - 1)) * 25;
      const r = calculerValeurVenale({
        ...parametresBase,
        dateMiseCirculation: dateMiseCirculationPour(dateSinistre, ageI),
        dateSinistre,
      });
      points.push({ age: ageI, valeur: r.vvadeFinale });
    }
    return points;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valeurNeuve, categorie, carburant, baremeVersion, puissanceFiscale, kilometrageTotal, entretien]);

  // Valeur ponctuelle : calculée séparément, à l'âge exact du curseur (pas
  // une lecture approchée sur la grille de la courbe).
  const resultatPoint = useMemo(
    () =>
      calculerValeurVenale({
        ...parametresBase,
        dateMiseCirculation: dateMiseCirculationPour(dateSinistre, age),
        dateSinistre,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [age, valeurNeuve, categorie, carburant, baremeVersion, puissanceFiscale, kilometrageTotal, entretien]
  );

  // Passerelle (Phase C) : mêmes noms de champs que FormulaireVV, valeurs
  // exactes du simulateur au moment du rendu (donc du clic). Aucune
  // écriture en base depuis ici — juste une URL vers le formulaire réel.
  const hrefEnregistrer = useMemo(() => {
    const p = new URLSearchParams({
      baremeVersion,
      categorie,
      carburant,
      entretien,
      puissanceFiscale: String(puissanceFiscale),
      valeurNeuve: String(valeurNeuve),
      kilometrageTotal: String(kilometrageTotal),
      dateMiseCirculation: formatDate(dateMiseCirculationPour(dateSinistre, age)),
      dateSinistre: formatDate(dateSinistre),
    });
    return `/vv/nouveau?${p.toString()}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baremeVersion, categorie, carburant, entretien, puissanceFiscale, valeurNeuve, kilometrageTotal, age]);

  // ---- tracé SVG ----
  const W = 640,
    H = 260,
    PL = 60,
    PR = 16,
    PT = 16,
    PB = 30;
  const maxY = Math.max(valeurNeuve, 1);
  const x = (a: number) => PL + (a / 25) * (W - PL - PR);
  const y = (v: number) => PT + (H - PT - PB) - (v / maxY) * (H - PT - PB);
  const chemin = courbe.map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.age).toFixed(1)} ${y(p.valeur).toFixed(1)}`).join(" ");
  const aire = `${chemin} L ${x(25).toFixed(1)} ${y(0).toFixed(1)} L ${x(0).toFixed(1)} ${y(0).toFixed(1)} Z`;

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <div className="space-y-4 rounded border border-line bg-white p-5">
        <Curseur
          label="Âge au sinistre"
          value={age}
          onChange={setAge}
          min={0}
          max={25}
          step={0.5}
          format={(v) => `${v.toFixed(1)} ans`}
        />
        <Curseur
          label="Valeur à neuf (VN)"
          value={valeurNeuve}
          onChange={setValeurNeuve}
          min={10000}
          max={2000000}
          step={5000}
          format={(v) => `${v.toLocaleString("fr-MA")} DH`}
        />
        <Curseur
          label="Kilométrage total"
          value={kilometrageTotal}
          onChange={setKilometrageTotal}
          min={0}
          max={1000000}
          step={5000}
          format={(v) => `${v.toLocaleString("fr-MA")} km`}
        />

        <div>
          <label className="mb-1 block text-sm text-ink">Puissance fiscale (CV)</label>
          <input
            type="number"
            min={1}
            value={puissanceFiscale}
            onChange={(e) => setPuissanceFiscale(Math.max(1, Number(e.target.value) || 1))}
            className={CHAMP}
          />
        </div>

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

        <div>
          <label className="mb-1 block text-sm text-ink">Entretien</label>
          <select
            value={entretien}
            onChange={(e) => setEntretien(e.target.value as Entretien)}
            className={CHAMP}
          >
            {Object.entries(LABELS_ENTRETIEN).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded border border-line bg-white p-5 text-center">
          <p className="text-xs uppercase tracking-widest text-slate">
            Valeur vénale à {age.toFixed(1)} an{age >= 2 ? "s" : ""}
          </p>
          <p className="mt-1 font-mono text-3xl font-bold text-signal">
            {resultatPoint.vvadeFinale.toLocaleString("fr-MA")} DH
          </p>
          <p className="mt-1 text-xs text-slate">
            {((resultatPoint.vvadeFinale / valeurNeuve) * 100).toFixed(1)}% de la valeur à neuf
            {resultatPoint.plafonneAVN && " — plafonnée à VN"} · β{" "}
            {Math.round(resultatPoint.correctifBetaPct * 100)}% · λ{" "}
            {(resultatPoint.correctifLambdaPct * 100).toFixed(1)}%
          </p>
        </div>

        <div className="rounded border border-line bg-white p-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-slate">
            Courbe de dépréciation · 0 → 25 ans
          </p>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Courbe de dépréciation">
            {[0, 0.25, 0.5, 0.75, 1].map((f) => (
              <g key={f}>
                <line
                  x1={PL}
                  x2={W - PR}
                  y1={y(maxY * f)}
                  y2={y(maxY * f)}
                  stroke="#D8D5CC"
                  strokeDasharray="2 4"
                />
                <text x={PL - 8} y={y(maxY * f) + 3} textAnchor="end" fontSize="9" fill="#3D5A73">
                  {Math.round((maxY * f) / 1000)}k
                </text>
              </g>
            ))}
            {[0, 5, 10, 15, 20, 25].map((t) => (
              <text key={t} x={x(t)} y={H - 8} textAnchor="middle" fontSize="9" fill="#3D5A73">
                {t}a
              </text>
            ))}
            <path d={aire} fill="#0F6E56" opacity="0.12" />
            <path d={chemin} fill="none" stroke="#0F6E56" strokeWidth="2.2" strokeLinejoin="round" />
            <line
              x1={x(age)}
              x2={x(age)}
              y1={PT}
              y2={H - PB}
              stroke="#B45309"
              strokeDasharray="3 3"
              opacity="0.7"
            />
            <circle cx={x(age)} cy={y(resultatPoint.vvadeFinale)} r="5" fill="#F6F5F1" stroke="#0F6E56" strokeWidth="2.5" />
          </svg>
        </div>

        <div className="rounded border border-line bg-white p-5">
          <p className="mb-2 text-sm text-ink">
            Ce simulateur n&apos;enregistre rien. Pour créer un vrai dossier avec ces valeurs :
          </p>
          <Link
            href={hrefEnregistrer}
            className="inline-block rounded bg-signal px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-signal-light"
          >
            Enregistrer comme calcul réel
          </Link>
        </div>
      </div>
    </div>
  );
}

function Curseur({
  label,
  value,
  onChange,
  min,
  max,
  step,
  format,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-sm text-ink">{label}</label>
        <span className="font-mono text-sm font-medium text-signal">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-signal"
      />
    </div>
  );
}
