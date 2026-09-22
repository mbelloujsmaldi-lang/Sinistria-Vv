import type { SupabaseClient } from "@supabase/supabase-js";

// Comparaison face au marché (Sprint 17) — n'expose jamais les lignes
// individuelles des dossiers comparés (ni référence, ni immatriculation,
// ni bureau, ni créateur/validateur) : la fonction serveur
// comparaison_marche (migration 0016) ne renvoie QUE des agrégats,
// jamais interrogée pour autre chose ici.

export type ComparaisonMarche =
  | { cas: "aucune" }
  | { cas: "insuffisant" } // marque ou modèle non renseignés sur le dossier consulté
  | { cas: "une"; valeur: number }
  | {
      cas: "plusieurs";
      n: number;
      moyenne: number;
      min: number;
      max: number;
      dateMin: string;
      dateMax: string;
      position: "dans_la_fourchette" | "au_dessus_du_max" | "en_dessous_du_min";
    };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function chargerComparaisonMarche(
  supabase: SupabaseClient,
  params: {
    marque: string | null;
    modele: string | null;
    dateMiseCirculation: string | null;
    exclureId: string;
    valeurDossier: number;
  }
): Promise<ComparaisonMarche> {
  const marque = params.marque?.trim();
  const modele = params.modele?.trim();
  if (!marque || !modele || !params.dateMiseCirculation) {
    return { cas: "insuffisant" };
  }
  const annee = new Date(params.dateMiseCirculation).getFullYear();
  if (!Number.isFinite(annee)) return { cas: "insuffisant" };

  const { data, error } = await supabase
    .rpc("comparaison_marche", {
      p_marque: marque,
      p_modele: modele,
      p_annee: annee,
      p_exclure_id: params.exclureId,
    })
    .single();

  if (error || !data) return { cas: "aucune" };

  const ligne = data as {
    n: number;
    moyenne: number | null;
    min_valeur: number | null;
    max_valeur: number | null;
    date_min: string | null;
    date_max: string | null;
  };

  const n = Number(ligne.n ?? 0);
  if (n === 0) return { cas: "aucune" };
  if (n === 1) return { cas: "une", valeur: Number(ligne.min_valeur) };

  const min = Number(ligne.min_valeur);
  const max = Number(ligne.max_valeur);
  const v = params.valeurDossier;
  const position = v > max ? "au_dessus_du_max" : v < min ? "en_dessous_du_min" : "dans_la_fourchette";

  return {
    cas: "plusieurs",
    n,
    moyenne: Number(ligne.moyenne),
    min,
    max,
    dateMin: ligne.date_min as string,
    dateMax: ligne.date_max as string,
    position,
  };
}
