"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  BaremeVersion,
  Carburant,
  CategorieVehicule,
  Entretien,
  TypeKilometrage,
} from "@/lib/calcul-vv";

// Server Actions du formulaire VV (Sprint 22) — remplacent les appels au
// client navigateur (RLS impose déjà les mêmes règles : créateur/statut
// pour la modification, rang pour la révision — inchangé, seul l'endroit
// qui exécute la requête change). Les champs calculés (valeur_calculee,
// correctifs...) restent calculés côté client par calculerValeurVenale()
// (lib/calcul-vv.ts, pure) et transmis tels quels, comme aujourd'hui.

export interface ChampsCalculPayload {
  reference_dossier_externe: string | null;
  marque: string | null;
  modele: string | null;
  valeur_neuve: number;
  date_mise_circulation: string;
  date_sinistre: string;
  categorie: CategorieVehicule;
  bareme_version: BaremeVersion;
  valeur_calculee: number;
  carburant: Carburant;
  puissance_fiscale: number;
  kilometrage_total: number | null;
  type_kilometrage: TypeKilometrage | null;
  entretien: Entretien;
  correctif_commercial_pct: number;
  correctif_beta_pct: number;
  correctif_beta_montant: number;
  correctif_lambda_pct: number;
  correctif_lambda_montant: number;
  vvade_sans_correctif: number;
  taux_tva_applique: number;
  vvade_finale_ht: number;
}

type Retour = { erreur: string | null; id?: string };

async function utilisateurCourant() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profil } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return { supabase, userId: user.id, role: profil?.role ?? null };
}

export async function creerCalcul(champs: ChampsCalculPayload): Promise<Retour> {
  const ctx = await utilisateurCourant();
  if (!ctx) return { erreur: "Session expirée." };

  const { data, error } = await ctx.supabase
    .from("vv_calculations")
    .insert({ ...champs, created_by: ctx.userId })
    .select("id")
    .single();
  if (error || !data) return { erreur: `Calcul effectué mais non enregistré : ${error?.message ?? "erreur inconnue"}` };
  return { erreur: null, id: data.id };
}

export async function modifierCalcul(
  calculId: string,
  champs: ChampsCalculPayload,
  ancienneValeur: number
): Promise<Retour> {
  const ctx = await utilisateurCourant();
  if (!ctx) return { erreur: "Session expirée." };

  const { error } = await ctx.supabase.from("vv_calculations").update(champs).eq("id", calculId);
  if (error) return { erreur: `Calcul effectué mais non enregistré : ${error.message}` };

  await ctx.supabase.from("vv_calculations_historique").insert({
    vv_calculation_id: calculId,
    utilisateur_id: ctx.userId,
    role_utilisateur: ctx.role,
    action: "Modification",
    ancienne_valeur: ancienneValeur,
    nouvelle_valeur: champs.valeur_calculee,
  });

  return { erreur: null, id: calculId };
}

export async function reviserCalcul(
  calculExistantId: string,
  reference: string,
  immatriculation: string | null,
  champs: ChampsCalculPayload,
  ancienneValeur: number
): Promise<Retour> {
  const ctx = await utilisateurCourant();
  if (!ctx) return { erreur: "Session expirée." };

  const { data, error } = await ctx.supabase
    .from("vv_calculations")
    .insert({
      ...champs,
      // L'immatriculation n'est pas modifiable ici mais doit suivre la
      // révision (sinon la nouvelle ligne la perdrait).
      immatriculation,
      created_by: ctx.userId,
      revision_de: calculExistantId,
    })
    .select("id")
    .single();
  if (error || !data) return { erreur: `Calcul effectué mais non enregistré : ${error?.message ?? "erreur inconnue"}` };

  await ctx.supabase.from("vv_calculations_historique").insert({
    vv_calculation_id: data.id,
    utilisateur_id: ctx.userId,
    role_utilisateur: ctx.role,
    action: "Révision",
    ancienne_valeur: ancienneValeur,
    nouvelle_valeur: champs.valeur_calculee,
    observation: `Révision de ${reference}`,
  });

  return { erreur: null, id: data.id };
}
