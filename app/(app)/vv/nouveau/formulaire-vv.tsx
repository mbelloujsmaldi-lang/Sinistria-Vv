"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { creerCalcul, modifierCalcul, reviserCalcul } from "./formulaire-vv-actions";
import { nettoyer } from "@/lib/referentiel-vehicules";
import VehiculePicker from "./vehicule-picker";
import type { UserRole } from "@/lib/roles";
import {
  calculerValeurVenale,
  categoriesDisponibles,
  categorieEstCommerciale as estCommerciale,
  type BaremeVersion,
  type Carburant,
  type CategorieVehicule,
  type Entretien,
  type ResultatCalcul,
  type TypeKilometrage,
} from "@/lib/calcul-vv";

const LABELS_CATEGORIE: Record<CategorieVehicule, string> = {
  leger_pu7_particulier: "Léger ≤7 CV — particulier",
  leger_pu7_location: "Léger ≤7 CV — location/utilitaire",
  leger_pu8_12_particulier: "Léger 8-12 CV — particulier",
  leger_pu8_12_location: "Léger 8-12 CV — location/utilitaire",
  leger_pu12_particulier: "Léger >12 CV — particulier",
  leger_pu12_location: "Léger >12 CV — location/utilitaire",
  bus_camion_tracteur: "Bus / camion tracteur",
  camion_porteur_chantier: "Camion porteur de chantier",
  semi_remorque: "Semi-remorque",
  motocycle: "Motocycle",
  bus_camion: "Bus / camion",
};

const LABELS_ENTRETIEN: Record<Entretien, string> = {
  aucun: "Aucun historique / non renseigné",
  concessionnaire_continu: "Entretien continu chez le concessionnaire",
  concessionnaire_puis_reseau_agree: "Concessionnaire puis réseau agréé",
  reseau_externe_principal: "Réseau externe (hors concessionnaire)",
};

const LABELS_TYPE_KM: Record<TypeKilometrage, string> = {
  standard: "Standard (selon puissance fiscale)",
  autocars: "Autocars",
  bus_urbains_tourisme: "Bus urbains / tourisme",
  camions_porteurs_chantier: "Camions porteurs de chantier",
  camions_tracteurs: "Camions tracteurs",
  vehicules_location_utilitaires: "Véhicules de location / utilitaires",
};

const CHAMP =
  "w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-signal focus:ring-1 focus:ring-signal";

export interface CalculExistant {
  id: string;
  reference: string;
  valeurCalculee: number;
  valeurNeuve: number;
  dateMiseCirculation: string;
  dateSinistre: string;
  categorie: CategorieVehicule;
  baremeVersion: BaremeVersion;
  carburant: Carburant;
  puissanceFiscale: number;
  kilometrageTotal: number | null;
  typeKilometrage: TypeKilometrage | null;
  entretien: Entretien;
  correctifCommercialPct: number;
  referenceDossierExterne: string | null;
  marque: string | null;
  modele: string | null;
  immatriculation: string | null;
}

// Sprint 18 : pré-remplissage initial depuis le simulateur "Et si ?"
// (mode reste "creer" — un point de départ, pas un calcul existant à
// modifier/réviser). Sous-ensemble de CalculExistant : pas d'id, de
// référence ni de valeurCalculee, puisque rien n'a encore été calculé
// ni enregistré.
export type ValeursInitiales = Partial<
  Pick<
    CalculExistant,
    | "baremeVersion"
    | "categorie"
    | "carburant"
    | "puissanceFiscale"
    | "valeurNeuve"
    | "dateMiseCirculation"
    | "dateSinistre"
    | "kilometrageTotal"
    | "typeKilometrage"
    | "entretien"
  >
>;

interface Props {
  userId: string;
  // Rôle au moment de l'action, figé dans vv_calculations_historique
  // (Sprint 15). Nullable : un profil peut ne pas encore avoir de rôle
  // résolu (ne devrait pas arriver en pratique, RLS l'exige déjà ailleurs).
  role?: UserRole | null;
  mode?: "creer" | "modifier" | "reviser";
  calculExistant?: CalculExistant;
  valeursInitiales?: ValeursInitiales;
}

export default function FormulaireVV({
  userId,
  role = null,
  mode = "creer",
  calculExistant,
  valeursInitiales,
}: Props) {
  const router = useRouter();

  const [baremeVersion, setBaremeVersion] = useState<BaremeVersion>(
    calculExistant?.baremeVersion ?? valeursInitiales?.baremeVersion ?? "2023"
  );
  const [categorie, setCategorie] = useState<CategorieVehicule>(
    calculExistant?.categorie ?? valeursInitiales?.categorie ?? "leger_pu7_particulier"
  );
  const [carburant, setCarburant] = useState<Carburant>(
    calculExistant?.carburant ?? valeursInitiales?.carburant ?? "diesel"
  );
  const [puissanceFiscale, setPuissanceFiscale] = useState(
    String(calculExistant?.puissanceFiscale ?? valeursInitiales?.puissanceFiscale ?? 6)
  );
  const [valeurNeuve, setValeurNeuve] = useState(
    calculExistant
      ? String(calculExistant.valeurNeuve)
      : valeursInitiales?.valeurNeuve !== undefined
        ? String(valeursInitiales.valeurNeuve)
        : ""
  );
  const [marque, setMarque] = useState(calculExistant?.marque ?? "");
  const [modele, setModele] = useState(calculExistant?.modele ?? "");
  // Suggestion de VN issue du référentiel (Sprint 14) : jamais appliquée sur
  // une valeur déjà saisie par l'utilisateur.
  const [vnSuggere, setVnSuggere] = useState<number | null>(null);
  const [libelleSuggestion, setLibelleSuggestion] = useState("");
  const [dateMiseCirculation, setDateMiseCirculation] = useState(
    calculExistant?.dateMiseCirculation ?? valeursInitiales?.dateMiseCirculation ?? ""
  );
  const [dateSinistre, setDateSinistre] = useState(
    () =>
      calculExistant?.dateSinistre ??
      valeursInitiales?.dateSinistre ??
      new Date().toISOString().slice(0, 10)
  );
  const [referenceDossierExterne, setReferenceDossierExterne] = useState(
    calculExistant?.referenceDossierExterne ?? ""
  );

  const [kilometrageTotal, setKilometrageTotal] = useState(
    calculExistant?.kilometrageTotal != null
      ? String(calculExistant.kilometrageTotal)
      : valeursInitiales?.kilometrageTotal != null
        ? String(valeursInitiales.kilometrageTotal)
        : ""
  );
  const [typeKilometrage, setTypeKilometrage] = useState<TypeKilometrage>(
    calculExistant?.typeKilometrage ?? valeursInitiales?.typeKilometrage ?? "standard"
  );
  const [entretien, setEntretien] = useState<Entretien>(
    calculExistant?.entretien ?? valeursInitiales?.entretien ?? "aucun"
  );
  const [correctifCommercialPct, setCorrectifCommercialPct] = useState(
    String(calculExistant?.correctifCommercialPct ?? 0)
  );

  const [resultat, setResultat] = useState<ResultatCalcul | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enregistre, setEnregistre] = useState(false);
  const [chargement, setChargement] = useState(false);
  const resultatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (resultat) {
      resultatRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [resultat]);

  const categoriesPossibles = useMemo(
    () => categoriesDisponibles(baremeVersion),
    [baremeVersion]
  );

  const categorieEstCommerciale = useMemo(() => estCommerciale(categorie), [categorie]);

  useEffect(() => {
    if (!categorieEstCommerciale) {
      setCorrectifCommercialPct("0");
    }
  }, [categorieEstCommerciale]);

  // Le sélecteur signale un couple marque/modèle reconnu et son prix VN de
  // référence. On ne pré-remplit que si le champ est vide, ou s'il contient
  // encore notre propre suggestion précédente — jamais une valeur saisie.
  const suggererVN = useCallback(
    (vn: number | null, libelle: string) => {
      if (vn === null) return;
      const vide = valeurNeuve.trim() === "";
      const suggestionIntacte = vnSuggere !== null && valeurNeuve === String(vnSuggere);
      if (vide || suggestionIntacte) {
        setValeurNeuve(String(vn));
        setVnSuggere(vn);
        setLibelleSuggestion(libelle);
      }
    },
    [valeurNeuve, vnSuggere]
  );
  const suggestionAffichee = vnSuggere !== null && valeurNeuve === String(vnSuggere);

  function handleBaremeChange(version: BaremeVersion) {
    setBaremeVersion(version);
    const options = categoriesDisponibles(version);
    if (!options.includes(categorie)) {
      setCategorie(options[0]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnregistre(false);
    setResultat(null);
    setChargement(true);

    try {
      const params = {
        valeurNeuve: Number(valeurNeuve),
        dateMiseCirculation: new Date(dateMiseCirculation),
        dateSinistre: new Date(dateSinistre),
        categorie,
        carburant,
        baremeVersion,
        puissanceFiscale: Number(puissanceFiscale),
        kilometrageTotal: kilometrageTotal ? Number(kilometrageTotal) : undefined,
        typeKilometrage,
        entretien,
        correctifCommercialPct: correctifCommercialPct ? Number(correctifCommercialPct) : 0,
      };

      const r = calculerValeurVenale(params);
      setResultat(r);

      const champsCalcul = {
        reference_dossier_externe: referenceDossierExterne || null,
        marque: nettoyer(marque) || null,
        modele: nettoyer(modele) || null,
        valeur_neuve: params.valeurNeuve,
        date_mise_circulation: dateMiseCirculation,
        date_sinistre: dateSinistre,
        categorie,
        bareme_version: baremeVersion,
        valeur_calculee: r.vvadeFinale,
        carburant,
        puissance_fiscale: params.puissanceFiscale,
        kilometrage_total: params.kilometrageTotal ?? null,
        type_kilometrage: params.kilometrageTotal !== undefined ? typeKilometrage : null,
        entretien,
        correctif_commercial_pct: categorieEstCommerciale ? params.correctifCommercialPct : 0,
        correctif_beta_pct: r.correctifBetaPct,
        correctif_beta_montant: r.correctifBetaMontant,
        correctif_lambda_pct: r.correctifLambdaPct,
        correctif_lambda_montant: r.correctifLambdaMontant,
        vvade_sans_correctif: r.vvadeSansCorrectif,
        taux_tva_applique: r.tauxTvaApplique,
        vvade_finale_ht: r.vvadeFinaleHT,
      };

      if (mode === "modifier" && calculExistant) {
        const { erreur: erreurAction } = await modifierCalcul(
          calculExistant.id,
          champsCalcul,
          calculExistant.valeurCalculee
        );

        if (erreurAction) {
          setErreur(erreurAction);
          return;
        }

        router.push(`/vv/${calculExistant.id}`);
        router.refresh();
        return;
      }

      if (mode === "reviser" && calculExistant) {
        const { erreur: erreurAction, id } = await reviserCalcul(
          calculExistant.id,
          calculExistant.reference,
          calculExistant.immatriculation,
          champsCalcul,
          calculExistant.valeurCalculee
        );

        if (erreurAction || !id) {
          setErreur(erreurAction ?? "Erreur inconnue.");
          return;
        }

        router.push(`/vv/${id}`);
        router.refresh();
        return;
      }

      const { erreur: erreurAction } = await creerCalcul(champsCalcul);

      if (erreurAction) {
        setErreur(erreurAction);
      } else {
        setEnregistre(true);
      }
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur inconnue lors du calcul.");
      setResultat(null);
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4 rounded border border-line bg-white p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm text-ink">Barème</label>
            <select
              value={baremeVersion}
              onChange={(e) => handleBaremeChange(e.target.value as BaremeVersion)}
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
            <label className="mb-1 block text-sm text-ink">Puissance fiscale (CV)</label>
            <input
              type="number"
              required
              min={1}
              value={puissanceFiscale}
              onChange={(e) => setPuissanceFiscale(e.target.value)}
              className={CHAMP}
            />
          </div>

          <VehiculePicker
            marque={marque}
            modele={modele}
            onMarque={setMarque}
            onModele={setModele}
            onModeleReconnu={suggererVN}
          />

          <div>
            <label htmlFor="vv-valeur-neuf" className="mb-1 block text-sm text-ink">
              Valeur à neuf (DH)
            </label>
            <input
              id="vv-valeur-neuf"
              type="number"
              required
              min={0}
              step="0.01"
              value={valeurNeuve}
              onChange={(e) => setValeurNeuve(e.target.value)}
              className={CHAMP}
            />
            {suggestionAffichee && (
              <p data-testid="suggestion-vn" className="mt-1 text-xs text-slate">
                Suggestion du référentiel ({libelleSuggestion}) — modifiable.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm text-ink">Date de mise en circulation</label>
            <input
              type="date"
              required
              value={dateMiseCirculation}
              onChange={(e) => setDateMiseCirculation(e.target.value)}
              className={CHAMP}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-ink">Date du sinistre</label>
            <input
              type="date"
              required
              value={dateSinistre}
              onChange={(e) => setDateSinistre(e.target.value)}
              className={CHAMP}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-ink">
              Référence dossier externe (optionnel)
            </label>
            <input
              type="text"
              value={referenceDossierExterne}
              onChange={(e) => setReferenceDossierExterne(e.target.value)}
              className={CHAMP}
              placeholder="Ex. référence du dossier Sinistria-Site"
            />
          </div>
        </div>

        <details className="rounded border border-line p-3">
          <summary className="cursor-pointer text-sm font-medium text-ink">
            Correctifs optionnels (entretien, kilométrage, commercial)
          </summary>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-ink">Kilométrage total</label>
              <input
                type="number"
                min={0}
                value={kilometrageTotal}
                onChange={(e) => setKilometrageTotal(e.target.value)}
                className={CHAMP}
                placeholder="Laisser vide si inconnu"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-ink">Référentiel kilométrique</label>
              <select
                value={typeKilometrage}
                onChange={(e) => setTypeKilometrage(e.target.value as TypeKilometrage)}
                className={CHAMP}
              >
                {Object.entries(LABELS_TYPE_KM).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-ink">Historique d&apos;entretien</label>
              <select
                value={entretien}
                onChange={(e) => setEntretien(e.target.value as Entretien)}
                className={CHAMP}
              >
                {Object.entries(LABELS_ENTRETIEN).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {categorieEstCommerciale && (
              <div>
                <label className="mb-1 block text-sm text-ink">
                  Correctif commercial (%, -25 à 25) — à la discrétion de l&apos;expert
                </label>
                <input
                  type="number"
                  min={-25}
                  max={25}
                  value={correctifCommercialPct}
                  onChange={(e) => setCorrectifCommercialPct(e.target.value)}
                  className={CHAMP}
                />
              </div>
            )}
          </div>
        </details>

        {erreur && (
          <p role="alert" className="text-sm text-red-700">
            {erreur}
          </p>
        )}

        <button
          type="submit"
          disabled={chargement}
          className="w-full rounded bg-signal py-2 text-sm font-medium text-white transition-colors hover:bg-signal-light disabled:opacity-60"
        >
          {chargement
            ? mode === "modifier"
              ? "Enregistrement…"
              : mode === "reviser"
                ? "Création de la révision…"
                : "Calcul en cours…"
            : mode === "modifier"
              ? "Enregistrer les modifications"
              : mode === "reviser"
                ? "Créer la révision"
                : "Calculer et enregistrer"}
        </button>
      </form>

      {resultat && (
        <div ref={resultatRef} className="rounded border border-line bg-white p-6">
          <p className="mb-3 text-sm text-slate">
            {enregistre
              ? "Résultat enregistré dans vv_calculations."
              : "Résultat calculé (non enregistré — voir message ci-dessus)."}
          </p>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 text-sm">
            <dt className="text-slate">VVADE sans correctif</dt>
            <dd className="text-ink">{resultat.vvadeSansCorrectif.toLocaleString("fr-MA")} DH</dd>

            <dt className="text-slate">Correctif entretien (β)</dt>
            <dd className="text-ink">
              {(resultat.correctifBetaPct * 100).toFixed(1)}% (
              {resultat.correctifBetaMontant.toLocaleString("fr-MA")} DH)
            </dd>

            <dt className="text-slate">Correctif kilométrage (λ)</dt>
            <dd className="text-ink">
              {(resultat.correctifLambdaPct * 100).toFixed(1)}% (
              {resultat.correctifLambdaMontant.toLocaleString("fr-MA")} DH)
            </dd>

            <dt className="text-slate">Correctif commercial</dt>
            <dd className="text-ink">
              {resultat.correctifCommercialMontant.toLocaleString("fr-MA")} DH
            </dd>

            <dt className="font-medium text-ink">Valeur définitive</dt>
            <dd className="font-medium text-signal">
              {resultat.vvadeFinale.toLocaleString("fr-MA")} DH TTC (
              {resultat.vvadeFinaleHT.toLocaleString("fr-MA")} DH HT)
              {resultat.plafonneAVN && " (plafonnée à VN)"}
            </dd>
          </dl>
        </div>
      )}
    </div>
  );
}
