// Génération CSV partagée (Sprint 15, extraite au Sprint 25 pour être
// réutilisée par l'export du Registre sans dupliquer l'échappement).

export function echapperCsv(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

// BOM UTF-8 en tête : Excel (destinataire habituel de ces exports) n'ouvre
// correctement les caractères accentués qu'avec ce marqueur.
export function construireCsv(colonnes: readonly string[], lignes: string[][]): string {
  const corps = lignes.map((ligne) => ligne.map((v) => echapperCsv(v)).join(","));
  return "﻿" + [colonnes.join(","), ...corps].join("\r\n");
}
