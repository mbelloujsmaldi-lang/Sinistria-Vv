import type { SupabaseClient } from "@supabase/supabase-js";
import { LABELS_CATEGORIE } from "@/lib/analyse";
import { LABELS_STATUT } from "@/app/(app)/vv/statut-badge";
import { construireCsv } from "@/lib/csv";
import type { CategorieVehicule } from "@/lib/calcul-vv";

// Recherche et filtres du Registre (Sprint 25) — filtrage SERVEUR (searchParams
// -> requête Supabase filtrée), pas un filtrage JS sur un jeu de données
// chargé en mémoire (contrairement à l'ancien système). Une vue filtrée
// devient donc partageable par lien.

export type FiltresRegistre = {
  q?: string;
  carburant?: string;
  bareme?: string;
  categorie?: string;
  marque?: string;
  modele?: string;
  statut?: string;
  depuisMec?: string; // date_mise_circulation, ISO YYYY-MM-DD, inclus
  jusquMec?: string;
  tri?: string;
  ordre?: "asc" | "desc";
};

export type LigneRegistre = {
  id: string;
  numero: number;
  reference: string;
  immatriculation: string | null;
  marque: string | null;
  modele: string | null;
  categorie: string;
  carburant: string | null;
  bareme_version: string;
  date_mise_circulation: string;
  date_sinistre: string;
  valeur_neuve: number;
  valeur_calculee: number;
  valeur_definitive: number | null;
  statut: string;
  reference_dossier_externe: string | null;
};

export type OptionsFiltres = {
  carburants: string[];
  baremes: string[];
  categories: { cle: string; libelle: string }[];
  marques: string[];
  modeles: string[];
};

const SELECT_REGISTRE =
  "id, numero, reference, immatriculation, marque, modele, categorie, carburant, bareme_version, date_mise_circulation, date_sinistre, valeur_neuve, valeur_calculee, valeur_definitive, statut, reference_dossier_externe";

// Colonnes triables (Sprint 25) — miroir des en-têtes de colonne du tableau.
const COLONNES_TRI: Record<string, string> = {
  numero: "numero",
  immatriculation: "immatriculation",
  marque: "marque",
  modele: "modele",
  carburant: "carburant",
  date_mise_circulation: "date_mise_circulation",
  date_sinistre: "date_sinistre",
  valeur_neuve: "valeur_neuve",
  valeur_calculee: "valeur_calculee",
  valeur_definitive: "valeur_definitive",
  statut: "statut",
};

export const TAILLE_PAGE = 20;

// Caractères structurants pour PostgREST .or() — retirés du terme de
// recherche avant construction du filtre : un utilisateur ne doit pas
// pouvoir élargir la clause au-delà d'une recherche texte (même si, ici,
// la RLS de vv_calculations autorise déjà tout profil actif à lire toutes
// les lignes — aucune élévation de privilège possible, mais la requête
// doit rester celle voulue, pas une autre).
function nettoyerPourOr(terme: string): string {
  return terme.replace(/[,()]/g, " ").trim();
}

function appliquerFiltres<T>(query: T, filtres: FiltresRegistre): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = query as any;

  const terme = filtres.q ? nettoyerPourOr(filtres.q) : "";
  if (terme) {
    const motifs = [
      `immatriculation.ilike.%${terme}%`,
      `marque.ilike.%${terme}%`,
      `modele.ilike.%${terme}%`,
    ];
    // Catégorie : correspondance partielle sur le LIBELLÉ français affiché
    // à l'utilisateur (categorie est une clé d'énumération interne, ex.
    // "leger_pu7_particulier" — rechercher dessus directement n'aurait
    // aucun sens pour qui tape "léger" ou "camion").
    const termeMin = terme.toLowerCase();
    for (const [cle, libelle] of Object.entries(LABELS_CATEGORIE)) {
      if (libelle.toLowerCase().includes(termeMin)) motifs.push(`categorie.eq.${cle}`);
    }
    // Numéro : correspondance EXACTE, sur le numéro brut ou la référence
    // formatée complète (ex. "42" ou "VV-000042" ou "VV-000042-V1").
    const termeUpper = terme.toUpperCase();
    if (/^VV-\d{6}(-V\d+)?$/.test(termeUpper)) {
      motifs.push(`reference.eq.${termeUpper}`);
    } else if (/^\d+$/.test(terme)) {
      motifs.push(`numero.eq.${terme}`);
    }
    q = q.or(motifs.join(","));
  }

  if (filtres.carburant) q = q.eq("carburant", filtres.carburant);
  if (filtres.bareme) q = q.eq("bareme_version", filtres.bareme);
  if (filtres.categorie) q = q.eq("categorie", filtres.categorie);
  if (filtres.marque) q = q.eq("marque", filtres.marque);
  if (filtres.modele) q = q.eq("modele", filtres.modele);
  if (filtres.statut) q = q.eq("statut", filtres.statut);
  if (filtres.depuisMec) q = q.gte("date_mise_circulation", filtres.depuisMec);
  if (filtres.jusquMec) q = q.lte("date_mise_circulation", filtres.jusquMec);

  return q as T;
}

export async function chargerOptionsFiltres(supabase: SupabaseClient): Promise<OptionsFiltres> {
  const { data } = await supabase
    .from("vv_calculations")
    .select("carburant, bareme_version, categorie, marque, modele");

  const lignes = data ?? [];
  const distinct = (vals: (string | null)[]) =>
    Array.from(new Set(vals.filter((v): v is string => !!v))).sort((a, b) =>
      a.localeCompare(b, "fr")
    );

  const categoriesPresentes = distinct(lignes.map((l) => l.categorie));

  return {
    carburants: distinct(lignes.map((l) => l.carburant)),
    baremes: distinct(lignes.map((l) => l.bareme_version)).sort(), // ordre chronologique naturel (années)
    categories: categoriesPresentes.map((cle) => ({
      cle,
      libelle: LABELS_CATEGORIE[cle as CategorieVehicule] ?? cle,
    })),
    marques: distinct(lignes.map((l) => l.marque)),
    modeles: distinct(lignes.map((l) => l.modele)),
  };
}

// Requête filtrée + triée, commune à l'affichage paginé et à l'export CSV
// (Sprint 25 ; pagination Sprint 25-bis) — AVANT application de la plage
// de pagination, pour que les deux usages ne divergent jamais sur ce qui
// est un "résultat filtré".
function construireRequeteFiltreeTriee(supabase: SupabaseClient, filtres: FiltresRegistre) {
  const colonneTri = COLONNES_TRI[filtres.tri ?? ""] ?? "created_at";
  const ordreAsc = filtres.ordre === "asc";

  let requete = supabase.from("vv_calculations").select(SELECT_REGISTRE, { count: "exact" });
  requete = appliquerFiltres(requete, filtres);
  return requete.order(colonneTri, { ascending: ordreAsc, nullsFirst: !ordreAsc });
}

export async function chargerRegistre(
  supabase: SupabaseClient,
  filtres: FiltresRegistre,
  page: number
): Promise<{
  lignes: LigneRegistre[];
  correspondances: number;
  total: number;
  page: number;
  totalPages: number;
}> {
  const { count: total } = await supabase
    .from("vv_calculations")
    .select("*", { count: "exact", head: true });

  const pageValide = Number.isInteger(page) && page > 0 ? page : 1;
  const debut = (pageValide - 1) * TAILLE_PAGE;

  const requete = construireRequeteFiltreeTriee(supabase, filtres).range(
    debut,
    debut + TAILLE_PAGE - 1
  );
  const { data, count: correspondances } = await requete;

  const totalPages = Math.max(1, Math.ceil((correspondances ?? 0) / TAILLE_PAGE));

  return {
    lignes: (data as LigneRegistre[] | null) ?? [],
    correspondances: correspondances ?? 0,
    total: total ?? 0,
    page: pageValide,
    totalPages,
  };
}

// Export CSV (Sprint 25) — SÉPARÉ de la pagination d'affichage : renvoie
// l'intégralité du résultat filtré, jamais une seule page ni une limite
// arbitraire. Usage différent (analyse hors ligne), pas un miroir de l'écran.
export async function chargerRegistreComplet(
  supabase: SupabaseClient,
  filtres: FiltresRegistre
): Promise<LigneRegistre[]> {
  const { data } = await construireRequeteFiltreeTriee(supabase, filtres);
  return (data as LigneRegistre[] | null) ?? [];
}

export const COLONNES_CSV_REGISTRE = [
  "Référence",
  "Immatriculation",
  "Marque",
  "Modèle",
  "Catégorie",
  "Carburant",
  "Barème",
  "Date mise en circulation",
  "Date sinistre",
  "Valeur à neuf",
  "Valeur calculée",
  "Valeur définitive",
  "Statut",
  "Réf. dossier externe",
] as const;

export function registreVersCsv(lignes: LigneRegistre[]): string {
  const corps = lignes.map((l) => [
    l.reference,
    l.immatriculation ?? "",
    l.marque ?? "",
    l.modele ?? "",
    LABELS_CATEGORIE[l.categorie as CategorieVehicule] ?? l.categorie,
    l.carburant ?? "",
    l.bareme_version,
    l.date_mise_circulation,
    l.date_sinistre,
    String(l.valeur_neuve),
    String(l.valeur_calculee),
    l.valeur_definitive !== null ? String(l.valeur_definitive) : "",
    LABELS_STATUT[l.statut] ?? l.statut,
    l.reference_dossier_externe ?? "",
  ]);
  return construireCsv(COLONNES_CSV_REGISTRE, corps);
}
