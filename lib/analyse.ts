import type { SupabaseClient } from "@supabase/supabase-js";
import { moisEntre, type CategorieVehicule } from "@/lib/calcul-vv";

// Tableau de bord Analyse (Sprint 16) — calculé à la lecture, aucune
// table dédiée. Règle unificatrice validée avant codage : un même
// dossier peut avoir plusieurs lignes en base (lignée de révision,
// Sprint 8) ; TOUTE agrégation ici ne retient que la ligne la plus
// récente de chaque lignée (numero, revision_index max) — sinon un
// dossier révisé compterait deux fois et une valeur périmée fausserait
// les totaux. Appliqué uniformément, KPI de valeur ou non.

export const LABELS_CATEGORIE: Record<CategorieVehicule, string> = {
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

type LigneBrute = {
  id: string;
  numero: number;
  revision_index: number;
  reference: string | null;
  statut: string;
  categorie: string;
  carburant: string | null;
  date_mise_circulation: string;
  date_sinistre: string;
  valeur_calculee: number;
  valeur_definitive: number | null;
  immatriculation: string | null;
  marque: string | null;
  modele: string | null;
};

export interface PointFrise {
  numero: number;
  reference: string | null;
  dateSinistre: string;
  valeur: number;
  statut: string;
  immatriculation: string | null;
  label: string;
}

export interface TableauDeBord {
  nbDossiers: number;
  nbValides: number;
  nbRejetes: number;
  nbTraites: number; // valide + rejete (dénominateur du taux de rejet)
  vvCumulee: number;
  vvMoyenne: number;
  ageMoyenAns: number | null;
  tauxRejetPct: number;
  repartitionCategorie: { cle: string; libelle: string; nb: number }[];
  carburant: { diesel: number; essence: number; autre: number; total: number };
  repartitionStatut: { statut: string; nb: number }[];
  histogramme: { libelle: string; nb: number }[];
  frise: PointFrise[];
}

const BINS_HISTOGRAMME: { libelle: string; min: number; max: number }[] = [
  { libelle: "< 50 k", min: 0, max: 50_000 },
  { libelle: "50 – 100 k", min: 50_000, max: 100_000 },
  { libelle: "100 – 200 k", min: 100_000, max: 200_000 },
  { libelle: "200 – 400 k", min: 200_000, max: 400_000 },
  { libelle: "> 400 k", min: 400_000, max: Infinity },
];

const ORDRE_STATUT = ["calcule", "soumis", "valide", "rejete"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function chargerTableauDeBord(supabase: SupabaseClient): Promise<TableauDeBord> {
  const { data } = await supabase
    .from("vv_calculations")
    .select(
      "id, numero, revision_index, reference, statut, categorie, carburant, date_mise_circulation, date_sinistre, valeur_calculee, valeur_definitive, immatriculation, marque, modele"
    )
    .order("numero", { ascending: true })
    .order("revision_index", { ascending: true })
    .limit(5000);

  const lignes = (data ?? []) as LigneBrute[];

  // Une ligne par lignée : la plus récente (revision_index max) l'emporte
  // — le tri ci-dessus (revision_index croissant) garantit qu'écraser
  // dans une Map garde la dernière rencontrée.
  const parLignee = new Map<number, LigneBrute>();
  for (const l of lignes) parLignee.set(l.numero, l);
  const tips = [...parLignee.values()];

  const valides = tips.filter((t) => t.statut === "valide");
  const rejetes = tips.filter((t) => t.statut === "rejete");
  const nbTraites = valides.length + rejetes.length;

  const vvCumulee = valides.reduce((s, t) => s + Number(t.valeur_definitive ?? 0), 0);
  const vvMoyenne = valides.length ? vvCumulee / valides.length : 0;

  const ages = valides
    .map((t) => moisEntre(new Date(t.date_mise_circulation), new Date(t.date_sinistre)) / 12)
    .filter((a) => Number.isFinite(a));
  const ageMoyenAns = ages.length ? ages.reduce((s, a) => s + a, 0) / ages.length : null;

  const tauxRejetPct = nbTraites ? (rejetes.length / nbTraites) * 100 : 0;

  const parCat = new Map<string, number>();
  for (const t of tips) parCat.set(t.categorie, (parCat.get(t.categorie) ?? 0) + 1);
  const repartitionCategorie = [...parCat.entries()]
    .map(([cle, nb]) => ({ cle, libelle: LABELS_CATEGORIE[cle as CategorieVehicule] ?? cle, nb }))
    .sort((a, b) => b.nb - a.nb);

  let diesel = 0,
    essence = 0,
    autre = 0;
  for (const t of tips) {
    if (t.carburant === "diesel") diesel++;
    else if (t.carburant === "essence") essence++;
    else autre++; // exhaustif : tout dossier compte quelque part, jamais silencieusement ignoré
  }
  const carburant = { diesel, essence, autre, total: tips.length };

  const parStatut = new Map<string, number>();
  for (const t of tips) parStatut.set(t.statut, (parStatut.get(t.statut) ?? 0) + 1);
  const repartitionStatut = ORDRE_STATUT.map((statut) => ({ statut, nb: parStatut.get(statut) ?? 0 }));

  const histogramme = BINS_HISTOGRAMME.map((b) => ({
    libelle: b.libelle,
    nb: valides.filter((t) => {
      const v = Number(t.valeur_definitive ?? 0);
      return v >= b.min && v < b.max;
    }).length,
  }));

  const frise: PointFrise[] = tips
    .filter((t) => !Number.isNaN(new Date(t.date_sinistre).getTime()))
    .map((t) => ({
      numero: t.numero,
      reference: t.reference,
      dateSinistre: t.date_sinistre,
      valeur: t.statut === "valide" ? Number(t.valeur_definitive ?? t.valeur_calculee) : Number(t.valeur_calculee),
      statut: t.statut,
      immatriculation: t.immatriculation,
      label: t.immatriculation || [t.marque, t.modele].filter(Boolean).join(" ") || `N° ${t.numero}`,
    }))
    .sort((a, b) => (a.dateSinistre < b.dateSinistre ? -1 : a.dateSinistre > b.dateSinistre ? 1 : 0));

  return {
    nbDossiers: tips.length,
    nbValides: valides.length,
    nbRejetes: rejetes.length,
    nbTraites,
    vvCumulee,
    vvMoyenne,
    ageMoyenAns,
    tauxRejetPct,
    repartitionCategorie,
    carburant,
    repartitionStatut,
    histogramme,
    frise,
  };
}
