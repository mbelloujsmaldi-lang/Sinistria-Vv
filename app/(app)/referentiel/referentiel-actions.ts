"use server";

import { createClient } from "@/lib/supabase/server";
import { SELECT_REFERENTIEL } from "@/lib/referentiel-vehicules";

// Server Actions de la console Marques & Modèles (Sprint 22). RLS reste la
// garde réelle (migration 0013 : responsable et au-dessus pour
// renommer/supprimer/prix VN) — une écriture refusée renvoie 0 ligne, pas
// une erreur ; ReferentielClient.executer() le détecte déjà (clés error/
// data volontairement identiques à ce qu'il attendait du client navigateur,
// pour ne rien changer à cette logique).
type ErreurRequete = { code?: string; message: string } | null;
type Retour = { error: ErreurRequete; data: { id: string }[] | null };

function versErreur(error: { code?: string; message: string } | null): ErreurRequete {
  return error ? { code: error.code, message: error.message } : null;
}

export async function chargerReferentiel() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicule_marques")
    .select(SELECT_REFERENTIEL)
    .order("nom");
  return { data, error: versErreur(error) };
}

export async function ajouterMarque(nom: string): Promise<Retour> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("vehicule_marques").insert({ nom }).select("id");
  return { data, error: versErreur(error) };
}

export async function renommerMarque(id: string, nom: string): Promise<Retour> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicule_marques")
    .update({ nom })
    .eq("id", id)
    .select("id");
  return { data, error: versErreur(error) };
}

export async function supprimerMarque(id: string): Promise<Retour> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("vehicule_marques").delete().eq("id", id).select("id");
  return { data, error: versErreur(error) };
}

export async function ajouterModele(marqueId: string, nom: string): Promise<Retour> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicule_modeles")
    .insert({ marque_id: marqueId, nom })
    .select("id");
  return { data, error: versErreur(error) };
}

export async function renommerModele(id: string, nom: string): Promise<Retour> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicule_modeles")
    .update({ nom })
    .eq("id", id)
    .select("id");
  return { data, error: versErreur(error) };
}

export async function supprimerModele(id: string): Promise<Retour> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("vehicule_modeles").delete().eq("id", id).select("id");
  return { data, error: versErreur(error) };
}

export async function enregistrerVN(id: string, valeur: number | null): Promise<Retour> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicule_modeles")
    .update({ vn_reference: valeur })
    .eq("id", id)
    .select("id");
  return { data, error: versErreur(error) };
}
