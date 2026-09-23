"use server";

import { createClient } from "@/lib/supabase/server";
import {
  calculerValeurVenale,
  categorieEstCommerciale,
  CATEGORIES_VEHICULE,
  CARBURANTS,
  BAREME_VERSIONS,
  ENTRETIENS,
  TYPES_KILOMETRAGE,
  type CategorieVehicule,
  type Carburant,
  type BaremeVersion,
  type Entretien,
  type TypeKilometrage,
} from "@/lib/calcul-vv";

// Import en masse CSV (Sprint 27) — réutilise calculerValeurVenale()
// (lib/calcul-vv.ts, pure), EXACTEMENT le même moteur que "Nouveau
// calcul" (formulaire-vv.tsx) : aucune logique de calcul dupliquée ici.
// Chaque ligne est traitée indépendamment ; une ligne invalide n'annule
// pas les autres (comportement identique à l'ancien Google Apps Script,
// importerDossiers()).

export interface LigneImport {
  numeroLigne: number;
  immatriculation: string;
  marque: string;
  modele: string;
  categorie: string;
  baremeVersion: string;
  carburant: string;
  puissanceFiscale: string;
  dateMiseCirculation: string;
  dateSinistre: string;
  valeurNeuve: string;
  kilometrageTotal: string;
  typeKilometrage: string;
  entretien: string;
  correctifCommercialPct: string;
  referenceDossierExterne: string;
}

export type ResultatLigne = { numeroLigne: number; ok: boolean; erreur?: string };

function estCategorie(v: string): v is CategorieVehicule {
  return (CATEGORIES_VEHICULE as readonly string[]).includes(v);
}
function estCarburant(v: string): v is Carburant {
  return (CARBURANTS as readonly string[]).includes(v);
}
function estBareme(v: string): v is BaremeVersion {
  return (BAREME_VERSIONS as readonly string[]).includes(v);
}
function estEntretien(v: string): v is Entretien {
  return (ENTRETIENS as readonly string[]).includes(v);
}
function estTypeKm(v: string): v is TypeKilometrage {
  return (TYPES_KILOMETRAGE as readonly string[]).includes(v);
}

async function utilisateurCourant() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { supabase, userId: user.id };
}

export async function importerDossiers(
  lignes: LigneImport[]
): Promise<{ erreur: string | null; resultats: ResultatLigne[] }> {
  const ctx = await utilisateurCourant();
  if (!ctx) return { erreur: "Session expirée.", resultats: [] };
  if (lignes.length > 500) {
    return { erreur: "Maximum 500 lignes par import.", resultats: [] };
  }

  const resultats: ResultatLigne[] = [];
  const aInserer: Record<string, unknown>[] = [];

  for (const l of lignes) {
    const categorie = l.categorie.trim();
    const baremeVersion = l.baremeVersion.trim() || "2023";
    const carburant = l.carburant.trim();
    const dateMec = l.dateMiseCirculation.trim();
    const dateSinistre = l.dateSinistre.trim();
    const valeurNeuve = Number(l.valeurNeuve);
    const puissanceFiscale = Number(l.puissanceFiscale);

    if (!estCategorie(categorie)) {
      resultats.push({ numeroLigne: l.numeroLigne, ok: false, erreur: `Catégorie inconnue : "${categorie}"` });
      continue;
    }
    if (!estBareme(baremeVersion)) {
      resultats.push({ numeroLigne: l.numeroLigne, ok: false, erreur: `Barème inconnu : "${baremeVersion}"` });
      continue;
    }
    if (!estCarburant(carburant)) {
      resultats.push({ numeroLigne: l.numeroLigne, ok: false, erreur: `Carburant inconnu : "${carburant}"` });
      continue;
    }
    if (!dateMec || Number.isNaN(new Date(dateMec).getTime())) {
      resultats.push({ numeroLigne: l.numeroLigne, ok: false, erreur: "Date de mise en circulation invalide." });
      continue;
    }
    if (!dateSinistre || Number.isNaN(new Date(dateSinistre).getTime())) {
      resultats.push({ numeroLigne: l.numeroLigne, ok: false, erreur: "Date de sinistre invalide." });
      continue;
    }
    if (!valeurNeuve || valeurNeuve <= 0) {
      resultats.push({ numeroLigne: l.numeroLigne, ok: false, erreur: "Valeur à neuf invalide." });
      continue;
    }
    if (!puissanceFiscale || puissanceFiscale <= 0) {
      resultats.push({ numeroLigne: l.numeroLigne, ok: false, erreur: "Puissance fiscale invalide." });
      continue;
    }

    const kilometrageTotal = l.kilometrageTotal.trim() ? Number(l.kilometrageTotal) : undefined;
    const typeKilometrage = estTypeKm(l.typeKilometrage.trim()) ? l.typeKilometrage.trim() : "standard";
    const entretien = estEntretien(l.entretien.trim()) ? l.entretien.trim() : "aucun";
    const correctifCommercialPct = l.correctifCommercialPct.trim() ? Number(l.correctifCommercialPct) : 0;

    try {
      const params = {
        valeurNeuve,
        dateMiseCirculation: new Date(dateMec),
        dateSinistre: new Date(dateSinistre),
        categorie,
        carburant,
        baremeVersion,
        puissanceFiscale,
        kilometrageTotal,
        typeKilometrage: typeKilometrage as TypeKilometrage,
        entretien: entretien as Entretien,
        correctifCommercialPct,
      };
      const r = calculerValeurVenale(params);

      aInserer.push({
        immatriculation: l.immatriculation.trim() || null,
        marque: l.marque.trim() || null,
        modele: l.modele.trim() || null,
        reference_dossier_externe: l.referenceDossierExterne.trim() || null,
        valeur_neuve: valeurNeuve,
        date_mise_circulation: dateMec,
        date_sinistre: dateSinistre,
        categorie,
        bareme_version: baremeVersion,
        valeur_calculee: r.vvadeFinale,
        carburant,
        puissance_fiscale: puissanceFiscale,
        kilometrage_total: kilometrageTotal ?? null,
        type_kilometrage: kilometrageTotal !== undefined ? typeKilometrage : null,
        entretien,
        correctif_commercial_pct: categorieEstCommerciale(categorie) ? correctifCommercialPct : 0,
        correctif_beta_pct: r.correctifBetaPct,
        correctif_beta_montant: r.correctifBetaMontant,
        correctif_lambda_pct: r.correctifLambdaPct,
        correctif_lambda_montant: r.correctifLambdaMontant,
        vvade_sans_correctif: r.vvadeSansCorrectif,
        taux_tva_applique: r.tauxTvaApplique,
        vvade_finale_ht: r.vvadeFinaleHT,
        created_by: ctx.userId,
        __numeroLigne: l.numeroLigne,
      });
    } catch (err) {
      resultats.push({
        numeroLigne: l.numeroLigne,
        ok: false,
        erreur: err instanceof Error ? err.message : "Erreur de calcul.",
      });
    }
  }

  // Insertion ligne par ligne (pas en lot unique) : une ligne rejetée par
  // la base (contrainte, RLS) ne doit pas faire échouer tout le fichier —
  // même principe que l'ancien Google Apps Script (importerDossiers()).
  for (const champs of aInserer) {
    const { __numeroLigne, ...donnees } = champs as { __numeroLigne: number } & Record<string, unknown>;
    const { error } = await ctx.supabase.from("vv_calculations").insert(donnees);
    resultats.push(
      error
        ? { numeroLigne: __numeroLigne, ok: false, erreur: error.message }
        : { numeroLigne: __numeroLigne, ok: true }
    );
  }

  resultats.sort((a, b) => a.numeroLigne - b.numeroLigne);
  return { erreur: null, resultats };
}
