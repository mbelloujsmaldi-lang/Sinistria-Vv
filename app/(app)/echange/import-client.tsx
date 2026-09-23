"use client";

import { useState } from "react";
import Link from "next/link";
import { analyserCsv, construireCsv } from "@/lib/csv";
import { importerDossiers, type LigneImport, type ResultatLigne } from "./import-actions";
import { IconTelecharger, IconPlus } from "../nav-icons";

// Import en masse (Sprint 27) — CSV uniquement (pas de JSON : un seul
// format à documenter/tester, cohérent avec l'export du Registre déjà en
// CSV). Colonnes = entrées brutes du moteur de calcul (lib/calcul-vv.ts),
// pas le format d'export (qui contient des valeurs déjà calculées).
const COLONNES = [
  "Immatriculation",
  "Marque",
  "Modele",
  "Categorie",
  "BaremeVersion",
  "Carburant",
  "PuissanceFiscale",
  "DateMiseCirculation",
  "DateSinistre",
  "ValeurNeuve",
  "KilometrageTotal",
  "TypeKilometrage",
  "Entretien",
  "CorrectifCommercialPct",
  "ReferenceDossierExterne",
] as const;

const LIGNE_EXEMPLE = [
  "12345-A-6",
  "Dacia",
  "Logan",
  "leger_pu7_particulier",
  "2023",
  "diesel",
  "6",
  "2021-03-15",
  "2026-01-10",
  "120000",
  "45000",
  "",
  "aucun",
  "",
  "",
];

function telechargerModele() {
  const csv = construireCsv(COLONNES, [LIGNE_EXEMPLE]);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "modele_import_vv.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function ImportClient() {
  const [nomFichier, setNomFichier] = useState<string | null>(null);
  const [lignes, setLignes] = useState<LigneImport[]>([]);
  const [erreurLecture, setErreurLecture] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [resultats, setResultats] = useState<ResultatLigne[] | null>(null);

  function surFichier(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    setResultats(null);
    setErreurLecture(null);
    setLignes([]);
    if (!fichier) return;
    setNomFichier(fichier.name);

    const lecteur = new FileReader();
    lecteur.onload = () => {
      try {
        const texte = String(lecteur.result ?? "");
        const brut = analyserCsv(texte);
        if (brut.length < 2) throw new Error("Fichier vide ou sans lignes de données.");
        const entetes = brut[0].map((h) => h.trim().toLowerCase());
        const idx = (nom: string) => entetes.indexOf(nom.toLowerCase());

        const parsees: LigneImport[] = brut.slice(1).map((cols, i) => ({
          numeroLigne: i + 2,
          immatriculation: cols[idx("Immatriculation")] ?? "",
          marque: cols[idx("Marque")] ?? "",
          modele: cols[idx("Modele")] ?? "",
          categorie: cols[idx("Categorie")] ?? "",
          baremeVersion: cols[idx("BaremeVersion")] ?? "",
          carburant: cols[idx("Carburant")] ?? "",
          puissanceFiscale: cols[idx("PuissanceFiscale")] ?? "",
          dateMiseCirculation: cols[idx("DateMiseCirculation")] ?? "",
          dateSinistre: cols[idx("DateSinistre")] ?? "",
          valeurNeuve: cols[idx("ValeurNeuve")] ?? "",
          kilometrageTotal: cols[idx("KilometrageTotal")] ?? "",
          typeKilometrage: cols[idx("TypeKilometrage")] ?? "",
          entretien: cols[idx("Entretien")] ?? "",
          correctifCommercialPct: cols[idx("CorrectifCommercialPct")] ?? "",
          referenceDossierExterne: cols[idx("ReferenceDossierExterne")] ?? "",
        }));
        setLignes(parsees);
      } catch (err) {
        setErreurLecture(err instanceof Error ? err.message : "Fichier illisible.");
      }
    };
    lecteur.readAsText(fichier, "utf-8");
  }

  async function lancerImport() {
    setEnCours(true);
    setResultats(null);
    const { erreur, resultats: r } = await importerDossiers(lignes);
    setEnCours(false);
    if (erreur) {
      setErreurLecture(erreur);
      return;
    }
    setResultats(r);
  }

  const succes = resultats?.filter((r) => r.ok).length ?? 0;
  const echecs = resultats?.filter((r) => !r.ok) ?? [];

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-line bg-white p-5">
        <p className="mb-3 text-sm text-ink">
          Fichier CSV avec les colonnes suivantes (première ligne = en-têtes exacts) :
        </p>
        <p className="mb-3 font-mono text-xs text-slate">{COLONNES.join(", ")}</p>
        <button
          onClick={telechargerModele}
          className="inline-flex items-center gap-2 rounded border border-line px-3 py-1.5 text-sm text-ink hover:bg-canvas"
        >
          <IconTelecharger className="h-4 w-4 shrink-0" />
          Télécharger le modèle CSV
        </button>
      </div>

      <div className="rounded-md border border-line bg-white p-5">
        <label className="mb-1 block text-sm text-ink">Fichier CSV à importer</label>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={surFichier}
          className="block w-full text-sm text-ink file:mr-3 file:rounded file:border file:border-line file:bg-white file:px-3 file:py-1.5 file:text-sm file:text-ink"
        />
        {erreurLecture && <p className="mt-2 text-sm text-error">{erreurLecture}</p>}
        {nomFichier && lignes.length > 0 && !erreurLecture && (
          <p className="mt-2 text-sm text-slate">
            {nomFichier} — {lignes.length} ligne{lignes.length > 1 ? "s" : ""} détectée
            {lignes.length > 1 ? "s" : ""}.
          </p>
        )}
        {lignes.length > 0 && (
          <button
            onClick={lancerImport}
            disabled={enCours}
            className="mt-3 inline-flex items-center gap-2 rounded bg-signal px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-signal-light disabled:opacity-60"
          >
            <IconPlus className="h-4 w-4 shrink-0" />
            {enCours ? "Import en cours…" : `Importer ${lignes.length} dossier${lignes.length > 1 ? "s" : ""}`}
          </button>
        )}
      </div>

      {resultats && (
        <div className="rounded-md border border-line bg-white p-5">
          <p className="mb-3 text-sm font-medium text-ink">
            {succes} dossier{succes > 1 ? "s" : ""} importé{succes > 1 ? "s" : ""} sur {resultats.length}.
          </p>
          {echecs.length > 0 && (
            <ul className="space-y-1 text-sm text-error">
              {echecs.map((r) => (
                <li key={r.numeroLigne}>
                  Ligne {r.numeroLigne} : {r.erreur}
                </li>
              ))}
            </ul>
          )}
          {succes > 0 && (
            <p className="mt-3 text-sm">
              <Link href="/vv" className="text-signal underline hover:text-signal-light">
                Voir le Registre →
              </Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
