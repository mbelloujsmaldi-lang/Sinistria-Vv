import { timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  calculerValeurVenale,
  categoriesDisponibles,
  categorieEstCommerciale,
  BAREME_VERSIONS,
  CARBURANTS,
  TYPES_KILOMETRAGE,
  ENTRETIENS,
  type BaremeVersion,
  type Carburant,
  type CategorieVehicule,
  type Entretien,
  type TypeKilometrage,
} from "@/lib/calcul-vv";

function cleAutorisee(request: NextRequest): boolean {
  const attendue = process.env.VV_API_KEY;
  if (!attendue) return false;

  const entete = request.headers.get("authorization") ?? "";
  const fourni = entete.startsWith("Bearer ") ? entete.slice(7) : "";

  const a = Buffer.from(fourni);
  const b = Buffer.from(attendue);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function erreur(message: string, statut = 400) {
  return NextResponse.json({ erreur: message }, { status: statut });
}

function estNombreFini(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

const LIMITE_APPELS_PAR_MINUTE = 30;

// Protection contre un bug ou une boucle côté appelant (pas une vraie
// charge — le volume réel reste faible). Enregistré avant toute
// validation du payload : une boucle causée par un payload invalide doit
// être bloquée elle aussi, pas seulement les appels valides.
async function limiteDeDebitDepassee(
  admin: ReturnType<typeof createAdminClient>
): Promise<boolean> {
  await admin
    .from("vv_api_calls")
    .delete()
    .lt("called_at", new Date(Date.now() - 2 * 60 * 1000).toISOString());

  await admin.from("vv_api_calls").insert({});

  const { count } = await admin
    .from("vv_api_calls")
    .select("*", { count: "exact", head: true })
    .gt("called_at", new Date(Date.now() - 60 * 1000).toISOString());

  return (count ?? 0) > LIMITE_APPELS_PAR_MINUTE;
}

export async function POST(request: NextRequest) {
  if (!cleAutorisee(request)) {
    return erreur("Non autorisé.", 401);
  }

  const admin = createAdminClient();

  if (await limiteDeDebitDepassee(admin)) {
    return erreur("Trop de requêtes. Réessayez dans une minute.", 429);
  }

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur("Corps JSON invalide.");
  }

  if (typeof corps !== "object" || corps === null) {
    return erreur("Corps JSON invalide.");
  }
  const b = corps as Record<string, unknown>;

  // référence dossier externe — obligatoire pour un appel API (traçabilité)
  if (typeof b.referenceDossierExterne !== "string" || b.referenceDossierExterne.trim() === "") {
    return erreur("referenceDossierExterne est requis et doit être une chaîne non vide.");
  }
  const referenceDossierExterne = b.referenceDossierExterne.trim();

  // baremeVersion
  if (typeof b.baremeVersion !== "string" || !BAREME_VERSIONS.includes(b.baremeVersion as BaremeVersion)) {
    return erreur(`baremeVersion invalide. Valeurs acceptées : ${BAREME_VERSIONS.join(", ")}.`);
  }
  const baremeVersion = b.baremeVersion as BaremeVersion;

  // categorie (dépend du barème)
  const categoriesValides = categoriesDisponibles(baremeVersion);
  if (typeof b.categorie !== "string" || !categoriesValides.includes(b.categorie as CategorieVehicule)) {
    return erreur(
      `categorie invalide pour le barème ${baremeVersion}. Valeurs acceptées : ${categoriesValides.join(", ")}.`
    );
  }
  const categorie = b.categorie as CategorieVehicule;

  // carburant
  if (typeof b.carburant !== "string" || !CARBURANTS.includes(b.carburant as Carburant)) {
    return erreur(`carburant invalide. Valeurs acceptées : ${CARBURANTS.join(", ")}.`);
  }
  const carburant = b.carburant as Carburant;

  // valeurNeuve
  if (!estNombreFini(b.valeurNeuve) || b.valeurNeuve <= 0) {
    return erreur("valeurNeuve est requis et doit être un nombre strictement positif.");
  }
  const valeurNeuve = b.valeurNeuve;

  // puissanceFiscale
  if (!estNombreFini(b.puissanceFiscale) || b.puissanceFiscale <= 0) {
    return erreur("puissanceFiscale est requis et doit être un nombre strictement positif.");
  }
  const puissanceFiscale = b.puissanceFiscale;

  // dateMiseCirculation / dateSinistre
  if (typeof b.dateMiseCirculation !== "string") {
    return erreur("dateMiseCirculation est requis (chaîne ISO, ex. 2023-09-15).");
  }
  const dateMiseCirculation = new Date(b.dateMiseCirculation);
  if (Number.isNaN(dateMiseCirculation.getTime())) {
    return erreur("dateMiseCirculation n'est pas une date valide.");
  }

  if (typeof b.dateSinistre !== "string") {
    return erreur("dateSinistre est requis (chaîne ISO, ex. 2026-09-17).");
  }
  const dateSinistre = new Date(b.dateSinistre);
  if (Number.isNaN(dateSinistre.getTime())) {
    return erreur("dateSinistre n'est pas une date valide.");
  }

  if (dateSinistre < dateMiseCirculation) {
    return erreur("dateSinistre ne peut pas être antérieure à dateMiseCirculation.");
  }

  // kilometrageTotal (optionnel)
  let kilometrageTotal: number | undefined;
  if (b.kilometrageTotal !== undefined && b.kilometrageTotal !== null) {
    if (!estNombreFini(b.kilometrageTotal) || b.kilometrageTotal < 0) {
      return erreur("kilometrageTotal doit être un nombre positif ou nul.");
    }
    kilometrageTotal = b.kilometrageTotal;
  }

  // typeKilometrage (optionnel)
  let typeKilometrage: TypeKilometrage | undefined;
  if (b.typeKilometrage !== undefined && b.typeKilometrage !== null) {
    if (typeof b.typeKilometrage !== "string" || !TYPES_KILOMETRAGE.includes(b.typeKilometrage as TypeKilometrage)) {
      return erreur(`typeKilometrage invalide. Valeurs acceptées : ${TYPES_KILOMETRAGE.join(", ")}.`);
    }
    typeKilometrage = b.typeKilometrage as TypeKilometrage;
  }

  // entretien (optionnel)
  let entretien: Entretien | undefined;
  if (b.entretien !== undefined && b.entretien !== null) {
    if (typeof b.entretien !== "string" || !ENTRETIENS.includes(b.entretien as Entretien)) {
      return erreur(`entretien invalide. Valeurs acceptées : ${ENTRETIENS.join(", ")}.`);
    }
    entretien = b.entretien as Entretien;
  }

  // correctifCommercialPct (optionnel) — réservé aux catégories commerciales,
  // plafonné à ±25% comme dans le document FMSAR.
  let correctifCommercialPct: number | undefined;
  if (b.correctifCommercialPct !== undefined && b.correctifCommercialPct !== null) {
    if (!estNombreFini(b.correctifCommercialPct)) {
      return erreur("correctifCommercialPct doit être un nombre.");
    }
    if (b.correctifCommercialPct < -25 || b.correctifCommercialPct > 25) {
      return erreur("correctifCommercialPct doit être compris entre -25 et 25.");
    }
    if (b.correctifCommercialPct !== 0 && !categorieEstCommerciale(categorie)) {
      return erreur(
        `correctifCommercialPct n'est applicable qu'aux catégories utilitaires/commerciales, pas à "${categorie}".`
      );
    }
    correctifCommercialPct = b.correctifCommercialPct;
  }

  const resultat = calculerValeurVenale({
    valeurNeuve,
    dateMiseCirculation,
    dateSinistre,
    categorie,
    carburant,
    baremeVersion,
    puissanceFiscale,
    kilometrageTotal,
    typeKilometrage,
    entretien,
    correctifCommercialPct,
  });

  const { data, error } = await admin
    .from("vv_calculations")
    .insert({
      created_by: null,
      reference_dossier_externe: referenceDossierExterne,
      valeur_neuve: valeurNeuve,
      date_mise_circulation: b.dateMiseCirculation,
      date_sinistre: b.dateSinistre,
      categorie,
      bareme_version: baremeVersion,
      carburant,
      puissance_fiscale: puissanceFiscale,
      kilometrage_total: kilometrageTotal ?? null,
      type_kilometrage: kilometrageTotal !== undefined ? (typeKilometrage ?? "standard") : null,
      entretien: entretien ?? "aucun",
      correctif_commercial_pct: correctifCommercialPct ?? 0,
      correctif_beta_pct: resultat.correctifBetaPct,
      correctif_beta_montant: resultat.correctifBetaMontant,
      correctif_lambda_pct: resultat.correctifLambdaPct,
      correctif_lambda_montant: resultat.correctifLambdaMontant,
      vvade_sans_correctif: resultat.vvadeSansCorrectif,
      valeur_calculee: resultat.vvadeFinale,
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { erreur: `Calcul effectué mais non enregistré : ${error?.message ?? "erreur inconnue"}` },
      { status: 500 }
    );
  }

  // Le corps de la réponse EST ResultatCalcul (mise à plat), conformément
  // au contrat Sprint 4 — `id` est ajouté en plus, pas en remplacement.
  return NextResponse.json({ ...resultat, id: data.id }, { status: 200 });
}
