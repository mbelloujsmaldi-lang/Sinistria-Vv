"use server";

import { createClient } from "@/lib/supabase/server";
import { SELECT_REFERENTIEL } from "@/lib/referentiel-vehicules";

// Server Actions du sélecteur marque/modèle (Sprint 22) — lecture et ajout
// à la volée. RLS reste la garde réelle (vehicule_marques_insert /
// vehicule_modeles_insert, migration 0013 : tout profil actif) : seul
// l'endroit qui exécute la requête change.
type ErreurRequete = { code?: string; message: string } | null;

export async function chargerReferentiel() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicule_marques")
    .select(SELECT_REFERENTIEL)
    .order("nom");
  const erreur: ErreurRequete = error ? { code: error.code, message: error.message } : null;
  return { data, erreur };
}

export async function ajouterMarque(nom: string): Promise<{ erreur: ErreurRequete }> {
  const supabase = await createClient();
  const { error } = await supabase.from("vehicule_marques").insert({ nom });
  return { erreur: error ? { code: error.code, message: error.message } : null };
}

export async function ajouterModele(marqueId: string, nom: string): Promise<{ erreur: ErreurRequete }> {
  const supabase = await createClient();
  const { error } = await supabase.from("vehicule_modeles").insert({ marque_id: marqueId, nom });
  return { erreur: error ? { code: error.code, message: error.message } : null };
}
