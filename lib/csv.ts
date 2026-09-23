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

// Analyse symétrique à echapperCsv/construireCsv (Sprint 27, import en
// masse) — gère les champs entre guillemets contenant virgules/retours à
// la ligne/guillemets doublés, sans dépendance externe. Retourne une ligne
// par ligne logique (pas par saut de ligne brut, à cause des champs
// multi-lignes entre guillemets), première ligne = en-têtes.
export function analyserCsv(texte: string): string[][] {
  const t = texte.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  const lignes: string[][] = [];
  let champ = "";
  let ligne: string[] = [];
  let dansGuillemets = false;

  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (dansGuillemets) {
      if (c === '"' && t[i + 1] === '"') {
        champ += '"';
        i++;
      } else if (c === '"') {
        dansGuillemets = false;
      } else {
        champ += c;
      }
    } else if (c === '"') {
      dansGuillemets = true;
    } else if (c === ",") {
      ligne.push(champ);
      champ = "";
    } else if (c === "\n") {
      ligne.push(champ);
      champ = "";
      lignes.push(ligne);
      ligne = [];
    } else {
      champ += c;
    }
  }
  if (champ !== "" || ligne.length) {
    ligne.push(champ);
    lignes.push(ligne);
  }
  return lignes.filter((l) => l.some((v) => v.trim() !== ""));
}
