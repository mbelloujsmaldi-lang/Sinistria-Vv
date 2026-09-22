// Référentiel Marques & Modèles (Sprint 14) — types et normalisation partagés.

export interface ModeleRef {
  id: string;
  nom: string;
  vn_reference: number | null;
}

export interface MarqueRef {
  id: string;
  nom: string;
  modeles: ModeleRef[];
}

// Nettoyage d'un nom saisi : espaces de bord retirés, espaces multiples
// réduits. Même logique que vclean() de l'ancien système.
export function nettoyer(s: string | null | undefined): string {
  return String(s ?? "").trim().replace(/\s+/g, " ");
}

// Clé de comparaison insensible à la casse et aux espaces — équivalent
// côté application de l'index unique lower(btrim(nom)) de la migration 0013.
export function cle(s: string | null | undefined): string {
  return nettoyer(s).toLowerCase();
}

export function trouverMarque(marques: MarqueRef[], nom: string): MarqueRef | undefined {
  const k = cle(nom);
  return k ? marques.find((m) => cle(m.nom) === k) : undefined;
}

export function trouverModele(marque: MarqueRef | undefined, nom: string): ModeleRef | undefined {
  const k = cle(nom);
  return marque && k ? marque.modeles.find((m) => cle(m.nom) === k) : undefined;
}

// Lecture du référentiel complet (44 marques / ~320 modèles au départ) en
// une seule requête, triée pour l'affichage.
export const SELECT_REFERENTIEL = "id, nom, vehicule_modeles(id, nom, vn_reference)";

export function depuisLignes(
  lignes:
    | {
        id: string;
        nom: string;
        vehicule_modeles: { id: string; nom: string; vn_reference: number | string | null }[];
      }[]
    | null
): MarqueRef[] {
  return (lignes ?? [])
    .map((m) => ({
      id: m.id,
      nom: m.nom,
      modeles: (m.vehicule_modeles ?? [])
        .map((x) => ({
          id: x.id,
          nom: x.nom,
          vn_reference: x.vn_reference === null ? null : Number(x.vn_reference),
        }))
        .sort((a, b) => a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" })),
    }))
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" }));
}
