/**
 * Sinistria-VV — moteur de calcul de la valeur vénale (VVADE)
 *
 * Source : documents officiels FMSAR "La valeur vénale à dire d'expert"
 * (Mai 2019 et Juin 2023 — PDF intégraux relus page par page, pas des
 * extraits). Formule VALIDÉE chiffre par chiffre : les 4 matrices de taux
 * dégressifs, les coefficients β, les référentiels λ ET les 4 exemples
 * illustratifs du document 2023 correspondent exactement au code
 * (voir test-calcul-vv.ts, 16/16 tests passent).
 *
 * FORMULE :
 *   1) VVADE sans correctif = dégressif sur solde restant, taux par
 *      catégorie x année, prorata mensuel exact pour l'année en cours.
 *      Exception : 1ère année -> abattement minimum de 5% même si le
 *      prorata calculé donnerait moins (règle explicite du document).
 *      Au-delà de la 5e année, le taux reste celui de la 5e année jusqu'à
 *      la 10e ; à partir de la 11e année, le taux devient 5%.
 *   2) Correctif β (entretien) : pourcentage selon l'historique d'entretien
 *      et l'ancienneté, appliqué sur la base "VVADE sans correctif".
 *   3) Correctif λ (kilométrage) : pourcentage selon l'écart au
 *      kilométrage moyen annuel de référence, appliqué sur la même base.
 *      IMPORTANT : le référentiel 2023 est UNIQUE par carburant, quelle
 *      que soit la puissance fiscale (simplification explicite du document
 *      2023) ; le référentiel 2019 varie lui par palier de puissance
 *      fiscale (Petite/Moyenne/Grande cylindrée). Les deux sont distincts
 *      et corrects chacun pour sa version — ne pas les uniformiser.
 *   4) Correctif commercial (optionnel, véhicules utilitaires/commerciaux
 *      uniquement) : ±25% maximum, À LA DISCRÉTION DE L'EXPERT — saisie
 *      manuelle, jamais calculée automatiquement.
 *   5) VVADE finale = VVADE sans correctif x (1 + β% + λ% + commercial%),
 *      plafonnée à VN (la VV ne dépasse jamais la valeur à neuf).
 *
 * POINT RESTANT OUVERT (le seul, après relecture intégrale des 2 documents) :
 *  - Le plafond de ±15% sur λ est EXPLICITE dans le document 2023. Le
 *    document 2019 (5 pages, lues intégralement) ne mentionne aucun
 *    plafond pour λ. On applique ±15% aux deux versions par prudence
 *    métier — à confirmer si un dossier 2019 doit un jour dépasser ce
 *    seuil.
 */

// Taux de TVA normal marocain en vigueur (CGI 2026). La valeur à neuf et la
// VVADE restent toujours TTC ; ce taux ne sert qu'à afficher l'équivalent
// HT en complément (obligatoire pour une personne physique en activité
// professionnelle, utile dans les autres cas — document FMSAR 2023).
// Stocké par calcul (vv_calculations.taux_tva_applique) plutôt que
// recalculé à la volée : si ce taux change un jour (loi de finances), les
// calculs déjà faits doivent garder le taux qui a servi à l'époque.
export const TAUX_TVA_STANDARD = 0.20;

export const BAREME_VERSIONS = ["2019", "2023"] as const;
export type BaremeVersion = (typeof BAREME_VERSIONS)[number];

export const CARBURANTS = ["diesel", "essence"] as const;
export type Carburant = (typeof CARBURANTS)[number];

export const CATEGORIES_VEHICULE = [
  "leger_pu7_particulier",
  "leger_pu7_location",
  "leger_pu8_12_particulier",
  "leger_pu8_12_location",
  "leger_pu12_particulier",
  "leger_pu12_location",
  "bus_camion_tracteur",
  "camion_porteur_chantier",
  "semi_remorque",
  "motocycle",
  "bus_camion",
] as const;
export type CategorieVehicule = (typeof CATEGORIES_VEHICULE)[number];

export const TYPES_KILOMETRAGE = [
  "standard",
  "autocars",
  "bus_urbains_tourisme",
  "camions_porteurs_chantier",
  "camions_tracteurs",
  "vehicules_location_utilitaires",
] as const;
export type TypeKilometrage = (typeof TYPES_KILOMETRAGE)[number];

export const ENTRETIENS = [
  "aucun",
  "concessionnaire_continu",
  "concessionnaire_puis_reseau_agree",
  "reseau_externe_principal",
] as const;
export type Entretien = (typeof ENTRETIENS)[number];

interface TauxCategorie {
  diesel: number[];
  essence: number[];
}

const BAREME: Record<BaremeVersion, Partial<Record<CategorieVehicule, TauxCategorie>>> = {
  "2023": {
    leger_pu7_particulier: { diesel: [0.20, 0.15, 0.10, 0.10, 0.10], essence: [0.20, 0.15, 0.10, 0.10, 0.10] },
    leger_pu7_location: { diesel: [0.25, 0.20, 0.15, 0.10, 0.10], essence: [0.25, 0.20, 0.15, 0.10, 0.10] },
    leger_pu8_12_particulier: { diesel: [0.25, 0.20, 0.15, 0.10, 0.10], essence: [0.25, 0.20, 0.15, 0.10, 0.10] },
    leger_pu8_12_location: { diesel: [0.30, 0.25, 0.20, 0.15, 0.10], essence: [0.30, 0.25, 0.20, 0.15, 0.10] },
    leger_pu12_particulier: { diesel: [0.27, 0.20, 0.15, 0.10, 0.10], essence: [0.30, 0.25, 0.20, 0.10, 0.10] },
    leger_pu12_location: { diesel: [0.32, 0.25, 0.20, 0.15, 0.10], essence: [0.32, 0.25, 0.20, 0.15, 0.10] },
    bus_camion_tracteur: { diesel: [0.30, 0.25, 0.20, 0.15, 0.10], essence: [0.30, 0.25, 0.20, 0.15, 0.10] },
    camion_porteur_chantier: { diesel: [0.28, 0.25, 0.20, 0.15, 0.10], essence: [0.28, 0.25, 0.20, 0.15, 0.10] },
    semi_remorque: { diesel: [0.25, 0.20, 0.15, 0.10, 0.10], essence: [0.25, 0.20, 0.15, 0.10, 0.10] },
    motocycle: { diesel: [0.20, 0.15, 0.10, 0.10, 0.10], essence: [0.20, 0.15, 0.10, 0.10, 0.10] },
  },
  "2019": {
    leger_pu7_particulier: { diesel: [0.20, 0.15, 0.10, 0.10, 0.10], essence: [0.20, 0.15, 0.10, 0.10, 0.10] },
    leger_pu7_location: { diesel: [0.25, 0.20, 0.15, 0.10, 0.10], essence: [0.25, 0.20, 0.15, 0.10, 0.10] },
    leger_pu8_12_particulier: { diesel: [0.25, 0.20, 0.15, 0.10, 0.10], essence: [0.25, 0.20, 0.15, 0.10, 0.10] },
    leger_pu8_12_location: { diesel: [0.30, 0.25, 0.20, 0.15, 0.10], essence: [0.30, 0.25, 0.20, 0.15, 0.10] },
    leger_pu12_particulier: { diesel: [0.27, 0.20, 0.15, 0.10, 0.10], essence: [0.30, 0.25, 0.20, 0.10, 0.10] },
    leger_pu12_location: { diesel: [0.32, 0.25, 0.20, 0.15, 0.10], essence: [0.32, 0.25, 0.20, 0.15, 0.10] },
    bus_camion: { diesel: [0.35, 0.30, 0.25, 0.20, 0.15], essence: [0.40, 0.35, 0.30, 0.25, 0.20] },
  },
};

export function categoriesDisponibles(version: BaremeVersion): CategorieVehicule[] {
  return Object.keys(BAREME[version]) as CategorieVehicule[];
}

// Accès en lecture aux taux des 5 premières années (catégorie + carburant,
// selon le barème) — SEULE source de vérité pour ces chiffres, déjà
// validée par test-calcul-vv.ts contre les 4 exemples officiels FMSAR.
// N'expose pas BAREME lui-même (forme interne, potentiellement partielle) :
// export minimal pour que la page /analyse/coefficients (Sprint 19)
// réutilise exactement ces taux, sans jamais les redupliquer.
export function tauxCinqAns(
  version: BaremeVersion,
  categorie: CategorieVehicule,
  carburant: Carburant
): number[] | null {
  const tauxCategorie = BAREME[version]?.[categorie];
  return tauxCategorie ? tauxCategorie[carburant] : null;
}

// Le correctif commercial (document FMSAR, "Véhicules utilitaires et
// commerciales") est réservé aux catégories "location"/utilitaires et aux
// véhicules lourds — jamais aux particuliers ni aux motocycles.
export function categorieEstCommerciale(categorie: CategorieVehicule): boolean {
  return categorie !== "motocycle" && !categorie.endsWith("_particulier");
}

// Règle de plateau (document FMSAR) : taux nominal les années 1 à 5, taux
// de l'année 5 reconduit jusqu'à l'année 10, puis 5%/an au-delà de la 10e.
// Exportée telle quelle pour /analyse/coefficients (Sprint 19) — c'est le
// taux NOMINAL de l'année, pas le prorata mensuel ni le plancher de 5%
// appliqué en 1ère année par calculerValeurVenale() pour un sinistre réel
// (règle propre au calcul réel, étrangère à cette table illustrative).
export function tauxPourAnnee(taux5ans: number[], annee: number): number {
  if (annee <= 5) return taux5ans[annee - 1];
  if (annee <= 10) return taux5ans[4];
  return 0.05;
}

export function moisEntre(debut: Date, fin: Date): number {
  const anneeDiff = fin.getFullYear() - debut.getFullYear();
  const moisDiff = fin.getMonth() - debut.getMonth();
  const jourAjust = fin.getDate() < debut.getDate() ? -1 : 0;
  return anneeDiff * 12 + moisDiff + jourAjust;
}

function coefficientEntretien(
  version: BaremeVersion,
  entretien: Entretien,
  anneeEnCours: number
): number {
  if (entretien === "aucun") return 0;

  if (version === "2023") {
    if (entretien === "concessionnaire_continu") {
      if (anneeEnCours <= 1) return 0.05;
      if (anneeEnCours === 2) return 0.10;
      return 0.15;
    }
    if (entretien === "concessionnaire_puis_reseau_agree") {
      if (anneeEnCours <= 1) return 0.025;
      if (anneeEnCours === 2) return 0.05;
      return 0.075;
    }
    return 0;
  }

  if (entretien === "concessionnaire_continu") return 0.15;
  if (entretien === "concessionnaire_puis_reseau_agree") return 0.10;
  if (entretien === "reseau_externe_principal") return 0.05;
  return 0;
}

function referenceKmAnnuel(
  version: BaremeVersion,
  type: TypeKilometrage,
  carburant: Carburant,
  puissanceFiscale: number
): number {
  if (version === "2023") {
    switch (type) {
      case "autocars":
        return 140000;
      case "bus_urbains_tourisme":
        return 60000;
      case "camions_porteurs_chantier":
        return 30000;
      case "camions_tracteurs":
        return 100000;
      case "vehicules_location_utilitaires":
        return carburant === "diesel" ? 45000 : 30000;
      case "standard":
      default:
        return carburant === "diesel" ? 35000 : 20000;
    }
  }

  switch (type) {
    case "autocars":
      return 140000;
    case "bus_urbains_tourisme":
      return 60000;
    case "camions_tracteurs":
    case "camions_porteurs_chantier":
      return carburant === "diesel" ? 70000 : 60000;
    case "vehicules_location_utilitaires":
    case "standard":
    default:
      if (puissanceFiscale <= 8) return carburant === "diesel" ? 30000 : 20000;
      if (puissanceFiscale <= 12) return carburant === "diesel" ? 40000 : 30000;
      return carburant === "diesel" ? 60000 : 50000;
  }
}

const PLAFOND_LAMBDA = 0.15;
// 0,5% par tranche de 1000 km => 0,005 / 1000 = 0,000005 par km
const TAUX_PAR_KM = 0.000005;

function coefficientKilometrage(
  version: BaremeVersion,
  type: TypeKilometrage,
  carburant: Carburant,
  puissanceFiscale: number,
  kilometrageTotal: number,
  ageEnMois: number
): number {
  if (ageEnMois <= 0) return 0;
  const moyenneAnnuelle = kilometrageTotal / (ageEnMois / 12);
  const reference = referenceKmAnnuel(version, type, carburant, puissanceFiscale);
  const ecart = reference - moyenneAnnuelle;
  const taux = ecart * TAUX_PAR_KM;
  return Math.max(-PLAFOND_LAMBDA, Math.min(PLAFOND_LAMBDA, taux));
}

export interface ParametresCalcul {
  valeurNeuve: number;
  dateMiseCirculation: Date;
  dateSinistre: Date;
  categorie: CategorieVehicule;
  carburant: Carburant;
  baremeVersion: BaremeVersion;
  puissanceFiscale: number;

  kilometrageTotal?: number;
  typeKilometrage?: TypeKilometrage;
  entretien?: Entretien;
  correctifCommercialPct?: number;
}

export interface ResultatCalcul {
  ageEnMois: number;
  vvadeSansCorrectif: number;
  correctifBetaPct: number;
  correctifBetaMontant: number;
  correctifLambdaPct: number;
  correctifLambdaMontant: number;
  correctifCommercialMontant: number;
  vvadeFinale: number;
  plafonneAVN: boolean;
  tauxTvaApplique: number;
  vvadeFinaleHT: number;
}

export function calculerValeurVenale(params: ParametresCalcul): ResultatCalcul {
  const {
    valeurNeuve,
    dateMiseCirculation,
    dateSinistre,
    categorie,
    carburant,
    baremeVersion,
    puissanceFiscale,
    kilometrageTotal,
    typeKilometrage = "standard",
    entretien = "aucun",
    correctifCommercialPct = 0,
  } = params;

  const tauxCategorie = BAREME[baremeVersion]?.[categorie];
  if (!tauxCategorie) {
    throw new Error(
      `Categorie "${categorie}" non disponible pour le bareme ${baremeVersion}`
    );
  }
  const taux5ans = tauxCategorie[carburant];

  const ageEnMois = moisEntre(dateMiseCirculation, dateSinistre);
  const anneesCompletes = Math.floor(ageEnMois / 12);
  const moisRestants = ageEnMois % 12;

  let valeurRestante = valeurNeuve;

  for (let annee = 1; annee <= anneesCompletes; annee++) {
    valeurRestante *= 1 - tauxPourAnnee(taux5ans, annee);
  }

  if (moisRestants > 0) {
    const anneeEnCours = anneesCompletes + 1;
    let tauxAnneeEnCours = tauxPourAnnee(taux5ans, anneeEnCours) * (moisRestants / 12);

    if (anneesCompletes === 0) {
      tauxAnneeEnCours = Math.max(tauxAnneeEnCours, 0.05);
    }

    valeurRestante -= valeurRestante * tauxAnneeEnCours;
  }

  const vvadeSansCorrectif = Math.round(valeurRestante * 100) / 100;

  const anneeEnCoursPourBeta = Math.max(1, Math.ceil(ageEnMois / 12));
  const correctifBetaPct = coefficientEntretien(baremeVersion, entretien, anneeEnCoursPourBeta);
  const correctifBetaMontant = Math.round(vvadeSansCorrectif * correctifBetaPct * 100) / 100;

  let correctifLambdaPct = 0;
  let correctifLambdaMontant = 0;
  if (kilometrageTotal !== undefined) {
    correctifLambdaPct = coefficientKilometrage(
      baremeVersion,
      typeKilometrage,
      carburant,
      puissanceFiscale,
      kilometrageTotal,
      ageEnMois
    );
    correctifLambdaMontant = Math.round(vvadeSansCorrectif * correctifLambdaPct * 100) / 100;
  }

  const commercialPctClampe = Math.max(-25, Math.min(25, correctifCommercialPct)) / 100;
  const correctifCommercialMontant =
    Math.round(vvadeSansCorrectif * commercialPctClampe * 100) / 100;

  let vvadeFinale =
    vvadeSansCorrectif + correctifBetaMontant + correctifLambdaMontant + correctifCommercialMontant;

  const plafonneAVN = vvadeFinale > valeurNeuve;
  vvadeFinale = Math.min(vvadeFinale, valeurNeuve);
  vvadeFinale = Math.round(vvadeFinale * 100) / 100;

  const vvadeFinaleHT = Math.round((vvadeFinale / (1 + TAUX_TVA_STANDARD)) * 100) / 100;

  return {
    ageEnMois,
    vvadeSansCorrectif,
    correctifBetaPct,
    correctifBetaMontant,
    correctifLambdaPct,
    correctifLambdaMontant,
    correctifCommercialMontant,
    vvadeFinale,
    plafonneAVN,
    tauxTvaApplique: TAUX_TVA_STANDARD,
    vvadeFinaleHT,
  };
}
