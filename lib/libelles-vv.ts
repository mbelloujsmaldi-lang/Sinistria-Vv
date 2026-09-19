// Libellés lisibles des clés techniques du moteur (lib/calcul-vv.ts).
// Les clés techniques ne changent jamais ; seuls ces libellés sont
// affichés sur la fiche PDF. Repris de l'ancien mapping (Code.gs
// CATEGORIES_2019 / CATEGORIES_2023) ; ASCII pour les symboles de
// comparaison, car les polices PDF standard (WinAnsi) n'ont pas ≤ / ≥.

const PP = "VH Personne Physique / Société Non Utilitaire";
const LOC = "VH Location / Utilitaire Société";

const CATEGORIES_2023: Record<string, string> = {
  leger_pu7_particulier: `${PP} (Pu <= 7CV)`,
  leger_pu7_location: `${LOC} (Pu <= 7CV)`,
  leger_pu8_12_particulier: `${PP} (8CV <= Pu < 12CV)`,
  leger_pu8_12_location: `${LOC} (8CV <= Pu < 12CV)`,
  leger_pu12_particulier: `${PP} (Pu >= 12CV)`,
  leger_pu12_location: `${LOC} (Pu >= 12CV)`,
  bus_camion_tracteur: "Bus / camion tracteur routier",
  camion_porteur_chantier: "Camion porteur de chantier",
  semi_remorque: "Semi-remorque / Véhicule tracté",
  motocycle: "Motocycle",
};

const CATEGORIES_2019: Record<string, string> = {
  leger_pu7_particulier: `${PP} (PF <= 8CV)`,
  leger_pu7_location: `${LOC} (PF <= 8CV)`,
  leger_pu8_12_particulier: `${PP} (8CV < PF <= 12CV)`,
  leger_pu8_12_location: `${LOC} (8CV < PF <= 12CV)`,
  leger_pu12_particulier: `${PP} (PF > 12CV)`,
  leger_pu12_location: `${LOC} (PF > 12CV)`,
  bus_camion: "Bus et Camions",
};

export function libelleCategorie(categorie: string, baremeVersion: string): string {
  const table = baremeVersion === "2019" ? CATEGORIES_2019 : CATEGORIES_2023;
  return table[categorie] ?? categorie;
}

export const LABELS_ENTRETIEN_FICHE: Record<string, string> = {
  aucun: "Aucun historique / non renseigné",
  concessionnaire_continu: "Concessionnaire depuis la MEC",
  concessionnaire_puis_reseau_agree: "Concessionnaire puis réseau agréé",
  reseau_externe_principal: "Principalement réseau externe",
};

export function libelleBareme(baremeVersion: string): string {
  return baremeVersion === "2019" ? "FMSAR 2019" : "FMSAR 2023";
}
